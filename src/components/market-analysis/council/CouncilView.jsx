'use client';

/**
 * Council view of Global Market Analysis (/market-analysis): the third view
 * beside The map and The chain, shown only to council members once their
 * membership is known. The map and the chain are unchanged.
 *
 *   KPI strip        fund value, gain on cost, benchmark, positions, next meeting
 *   Main column      this week's events matched to sector teams, fund against
 *                    benchmark, sleeve weights beside sector moves, council
 *                    research, agenda builder (managers), council versus
 *                    council, policy and exposure check (order by role)
 *   Side column      coverage and owners, debrief queue (only when the member
 *                    has saved items)
 *
 * Every council figure comes from src/lib/org-global-market-model.js over the
 * council's own records (or the labelled sample). Market figures are the
 * page's own delayed quotes. Writes: Add to Debrief (the member's own list)
 * and Send to meetings (the meetings agenda route, managers only); neither
 * runs while the sample shows.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Modal, Skeleton, SkeletonRegion } from '@/components/ds';
import { fmtMoney } from '@/lib/org-company-research-model';
import {
  AGENDA_KINDS,
  LINKS,
  NA,
  RANGES,
  agendaDraft,
  agendaKindLabel,
  appendAgenda,
  chartGeometry,
  councilTeams,
  fmtDate,
  fmtMeetingDay,
  fmtSignedPct,
  kpis,
  macroResearch,
  marketMoves,
  matchEvents,
  policyCheck,
  returnSeries,
  sleeveFunds,
  sleeveRows,
  standingRows,
  upcoming,
} from '@/lib/org-global-market-model';
import { useCouncilMarket, useSectorMoves } from './useCouncilMarket';
import './council-market.css';
import '@/styles/home-canvas.css';

const toneOf = (v) =>
  v == null || !Number.isFinite(Number(v)) ? 'na' : v > 0 ? 'up' : v < 0 ? 'down' : 'flat';

/* ── States ─────────────────────────────────────────────────────────────── */

function Loading({ label, rows = 3 }) {
  return (
    <SkeletonRegion label={label} className="gmc-skel">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={10} width={['70%', '92%', '54%'][i % 3]} />
      ))}
    </SkeletonRegion>
  );
}

function Empty({ children, href, action, onAction }) {
  return (
    <p className="gmc-state">
      <i className="bi bi-info-circle" aria-hidden="true" />
      <span>{children}</span>
      {href ? (
        <Link href={href} className="gmc-link">
          {action} <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      ) : null}
      {onAction ? (
        <button type="button" className="gmc-link" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </p>
  );
}

function Failed({ children, onRetry }) {
  return (
    <p className="gmc-state gmc-state--error" role="alert">
      <i className="bi bi-exclamation-circle" aria-hidden="true" />
      <span>{children}</span>
      <button type="button" className="gmc-link" onClick={onRetry}>
        Retry
      </button>
    </p>
  );
}

function Section({ id, title, aside, children, busy }) {
  return (
    <section className="gmc-sec" aria-labelledby={id} aria-busy={busy || undefined}>
      <header className="gmc-sec__head">
        <h2 id={id} className="gmc-sec__title">
          {title}
        </h2>
        {aside || null}
      </header>
      {children}
    </section>
  );
}

const Signed = ({ value, digits = 2 }) => (
  <span className={`gmc-num gmc-tone--${toneOf(value)}`}>{fmtSignedPct(value, digits)}</span>
);

/* ── Index strip ────────────────────────────────────────────────────────── */

function IndexStrip({ tickerData }) {
  const moves = marketMoves(tickerData);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="gmc-strip" aria-label="Market moves">
      {moves.length ? (
        <ul className="gmc-strip__list">
          {moves.map((m) => (
            <li key={m.name}>
              <span className="gmc-strip__name">{m.name}</span>
              <span className="gmc-num">{m.price}</span>
              <Signed value={m.change} />
            </li>
          ))}
        </ul>
      ) : (
        <span className="gmc-muted">
          {slow ? 'Quotes are not available right now.' : 'Loading delayed quotes'}
        </span>
      )}
      <span className="gmc-strip__note">Delayed quotes</span>
    </div>
  );
}

/* ── KPI strip ──────────────────────────────────────────────────────────── */

function Kpi({ icon, label, children, tone }) {
  return (
    <div className="gmc-kpi" role="listitem">
      <span className="gmc-kpi__icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <span className="gmc-kpi__text">
        <span className="gmc-kpi__label">{label}</span>
        <span className={`gmc-kpi__value gmc-num${tone ? ` gmc-tone--${tone}` : ''}`}>
          {children}
        </span>
      </span>
    </div>
  );
}

function KpiStrip({ fund, extras, now }) {
  let body;
  if (fund.status === 'loading' || extras.status === 'loading')
    body = <Loading label="Loading the council fund" rows={2} />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>Couldn&apos;t load the council fund.</Failed>;
  else {
    const next = extras.data?.meetings ? upcoming(extras.data.meetings, now).next : null;
    const k = kpis(fund.raw, next);
    if (k.empty)
      return (
        <div className="gmc-kpis">
          <Empty href={LINKS.tradingDesk} action="Open Trading Desk">
            The council book has no holdings yet.
          </Empty>
        </div>
      );
    body = (
      <div className="gmc-kpis__row" role="list">
        <Kpi icon="bi-stack" label="Fund value">
          {fmtMoney(k.value)}
        </Kpi>
        <Kpi icon="bi-graph-up-arrow" label="Gain on cost" tone={toneOf(k.gainPct)}>
          {fmtSignedPct(k.gainPct)}
        </Kpi>
        <Kpi icon="bi-bullseye" label={`Benchmark, ${k.benchLabel}`} tone={toneOf(k.benchPct)}>
          {fmtSignedPct(k.benchPct)}
        </Kpi>
        <Kpi icon="bi-layers" label="Positions">
          {k.positions}
          {k.unpriced ? <span className="gmc-kpi__sub"> ({k.unpriced} at cost)</span> : null}
        </Kpi>
        <Kpi icon="bi-calendar3" label="Next meeting">
          {extras.status === 'error' ? (
            NA
          ) : k.next ? (
            <Link href={LINKS.meeting(k.next.id)} className="gmc-kpi__link">
              {k.next.day}
            </Link>
          ) : (
            'None scheduled'
          )}
        </Kpi>
      </div>
    );
  }
  return (
    <div className="gmc-kpis" aria-busy={fund.status === 'loading' || undefined}>
      {body}
    </div>
  );
}

/* ── Events matched to sector teams ─────────────────────────────────────── */

function EventsCard({ rows, teams, events, canAgenda, drafted, onOpen, onAgenda, onChain }) {
  let body;
  if (events.status === 'loading') body = <Loading label="Loading this week's events" />;
  else if (events.status === 'error')
    body = <Failed onRetry={events.retry}>Couldn&apos;t load this week&apos;s events.</Failed>;
  else if (!teams.length)
    body = (
      <Empty href={LINKS.orgChart} action="Open org chart">
        No sector teams are set up, so there is nothing to match events to.
      </Empty>
    );
  else if (!rows.length)
    body = (
      <Empty onAction={onChain} action="Open the chain">
        No event this week names a sector your teams cover.
      </Empty>
    );
  else
    body = (
      <>
        <div className="gmc-table" role="table" aria-label="Events matched to sector teams">
          <div className="gmc-tr gmc-tr--head gmc-cols-events" role="row">
            <span role="columnheader">Event</span>
            <span role="columnheader">Topic</span>
            <span role="columnheader">Sector match</span>
            <span role="columnheader">Owners</span>
            <span role="columnheader">Action</span>
          </div>
          {rows.map((r) => {
            const queued = drafted.has(`ev-${r.id}`);
            return (
              <div key={r.id} className="gmc-tr gmc-cols-events" role="row">
                <span role="cell" className="gmc-cell--lead">
                  <span className="gmc-dot" aria-hidden="true" />
                  <button type="button" className="gmc-rowlink" onClick={() => onOpen(r)}>
                    {r.title}
                  </button>
                </span>
                <span role="cell">{r.topic}</span>
                <span role="cell">{r.teams.map((t) => t.name).join(', ')}</span>
                <span role="cell">
                  {r.teams
                    .flatMap((t) => t.owners)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(', ') || <span className="gmc-muted">No coverage</span>}
                </span>
                <span role="cell" className="gmc-actions">
                  {canAgenda ? (
                    <button
                      type="button"
                      className="gmc-link"
                      disabled={queued}
                      onClick={() => onAgenda(r)}
                    >
                      {queued ? 'On agenda draft' : 'Add to agenda'}
                    </button>
                  ) : null}
                  <button type="button" className="gmc-link" onClick={() => onChain(r)}>
                    Open chain
                  </button>
                </span>
              </div>
            );
          })}
        </div>
        <p className="gmc-foot">
          Matched by topic to the sector each team covers. This is a sector match, not an impact
          estimate.
        </p>
      </>
    );
  return (
    <Section id="gmc-events" title="This week's events matched to sector teams">
      {body}
    </Section>
  );
}

/* ── Fund against benchmark ─────────────────────────────────────────────── */

function useWidth(ref, fallback) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const next = Math.round(entries[0].contentRect.width);
      if (next > 0) setW(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function ReturnChart({ series, benchLabel }) {
  const ref = useRef(null);
  const width = useWidth(ref, 720);
  const grad = useId().replace(/:/g, '');
  const g = useMemo(() => chartGeometry(series, { width, height: 240 }), [series, width]);
  return (
    <div className="gmc-chart" ref={ref}>
      {g ? (
        <svg
          width={g.W}
          height={g.H}
          role="img"
          aria-label={`Fund return ${fmtSignedPct(series.fundPct)} against ${benchLabel} ${fmtSignedPct(series.benchPct)} from ${fmtDate(series.from)} to ${fmtDate(series.to)}`}
        >
          <defs>
            <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--emerald)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--emerald)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {g.yTicks.map((t) => (
            <g key={t.label}>
              <line
                x1={g.left}
                x2={g.W - 8}
                y1={t.y}
                y2={t.y}
                className={t.zero ? 'gmc-chart__zero' : 'gmc-chart__grid'}
              />
              <text x={g.left - 8} y={t.y + 4} textAnchor="end" className="gmc-chart__tick">
                {t.label}
              </text>
            </g>
          ))}
          {g.xTicks.map((t, i) => (
            <text
              key={`${t.label}-${i}`}
              x={t.x}
              y={g.H - 6}
              textAnchor={t.anchor}
              className="gmc-chart__tick"
            >
              {t.label}
            </text>
          ))}
          <path d={g.area} fill={`url(#${grad})`} />
          {g.bench ? <path d={g.bench} className="gmc-chart__bench" /> : null}
          <path d={g.line} className="gmc-chart__line" />
        </svg>
      ) : null}
    </div>
  );
}

function FundCard({ extras, fund }) {
  const [range, setRange] = useState('ALL');
  const snaps = extras.data?.snapshots;
  const series = useMemo(() => (snaps ? returnSeries(snaps, range) : null), [snaps, range]);
  const b = extras.data?.benchmark || fund.raw?.benchmark || null;
  const benchLabel = b?.source === 'pitch_proxy' ? 'Benchmark (est.)' : b?.symbol || 'Benchmark';
  const ranges = (
    <div className="gmc-ranges" role="group" aria-label="Chart period">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          className="gmc-range"
          aria-pressed={range === r}
          onClick={() => setRange(r)}
        >
          {r}
        </button>
      ))}
    </div>
  );
  let body;
  if (extras.status === 'loading') body = <Loading label="Loading fund snapshots" />;
  else if (extras.status === 'error' || snaps === null)
    body = <Failed onRetry={extras.retry}>Couldn&apos;t load fund snapshots.</Failed>;
  else if (!series)
    body = (
      <Empty href={LINKS.fundAnalytics} action="Open fund analytics">
        {snaps.length < 2
          ? 'No fund snapshots yet. The chart fills in as daily snapshots are recorded.'
          : 'Fewer than two snapshots fall in this period.'}
      </Empty>
    );
  else
    body = (
      <>
        <dl className="gmc-metrics">
          <div>
            <dt>
              <span className="gmc-dot" aria-hidden="true" />
              Fund, return on cost
            </dt>
            <dd>
              <Signed value={series.fundPct} />
            </dd>
          </div>
          <div>
            <dt>
              <span className="gmc-dot gmc-dot--muted" aria-hidden="true" />
              {benchLabel}
            </dt>
            <dd>
              <Signed value={series.benchPct} />
            </dd>
          </div>
          <div>
            <dt>Difference</dt>
            <dd>
              <Signed value={series.alphaPct} />
            </dd>
          </div>
        </dl>
        <ReturnChart series={series} benchLabel={benchLabel} />
        <ul className="gmc-legend">
          <li>
            <span className="gmc-legend__line" aria-hidden="true" />
            Council fund, value over cost
          </li>
          {series.hasBench ? (
            <li>
              <span className="gmc-legend__line gmc-legend__line--dotted" aria-hidden="true" />
              {benchLabel}, stored return
            </li>
          ) : null}
          <li className="gmc-muted">
            Rebased to 0% on <span className="gmc-num">{fmtDate(series.from)}</span>
          </li>
        </ul>
      </>
    );
  return (
    <Section id="gmc-fund" title="Fund against benchmark" aside={ranges}>
      {body}
    </Section>
  );
}

/* ── Sleeve weights beside sector moves ─────────────────────────────────── */

function SleevesCard({ fund, rows, moves }) {
  let body;
  if (fund.status === 'loading') body = <Loading label="Loading team sleeves" />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>Couldn&apos;t load team sleeves.</Failed>;
  else if (!rows.length)
    body = (
      <Empty href={LINKS.tradingDesk} action="Open Trading Desk">
        No holdings yet, so there are no sleeves to weigh.
      </Empty>
    );
  else
    body = (
      <>
        <div className="gmc-table" role="table" aria-label="Sleeve weights">
          <div className="gmc-tr gmc-tr--head gmc-cols-sleeves" role="row">
            <span role="columnheader">Sector team</span>
            <span role="columnheader" className="gmc-r">
              Weight
            </span>
            <span role="columnheader">Holdings</span>
            <span role="columnheader">Sector fund today</span>
            <span role="columnheader">Policy</span>
          </div>
          {rows.map((r) => {
            const q = r.fund ? moves.data?.quotes?.[r.fund] : null;
            const warn = Boolean(r.capNote);
            return (
              <div key={r.teamId || 'none'} className="gmc-tr gmc-cols-sleeves" role="row">
                <span role="cell" className="gmc-cell--lead">
                  <span className={`gmc-dot${warn ? ' gmc-dot--warn' : ''}`} aria-hidden="true" />
                  <strong>{r.name}</strong>
                </span>
                <span role="cell" className="gmc-r gmc-num">
                  {r.weightPct == null ? NA : `${r.weightPct.toFixed(1)}%`}
                </span>
                <span role="cell" className="gmc-num gmc-tickers">
                  {r.tickers.length ? r.tickers.join(', ') : NA}
                </span>
                <span role="cell">
                  {!r.fund ? (
                    NA
                  ) : moves.status === 'loading' ? (
                    <Skeleton height={10} width={72} />
                  ) : (
                    <>
                      <span className="gmc-num gmc-muted">{r.fund}</span>{' '}
                      {q ? <Signed value={q.change} /> : <span className="gmc-num">{NA}</span>}
                    </>
                  )}
                </span>
                <span role="cell" className={warn ? 'gmc-tone--warn' : 'gmc-muted'}>
                  {warn ? (
                    <>
                      <i className="bi bi-exclamation-triangle" aria-hidden="true" />{' '}
                      {r.capNote.text}
                    </>
                  ) : (
                    'No cap note'
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <p className="gmc-foot">
          Weight is the team&apos;s share of fund value. Sector fund moves are delayed day changes
          of the fund that tracks each team&apos;s sector, shown beside the sleeve, not attributed
          to it.
          {moves.status === 'error' ? ' Sector fund quotes could not be loaded.' : ''}
        </p>
      </>
    );
  return (
    <Section id="gmc-sleeves" title="Sleeve weights beside sector moves">
      {body}
    </Section>
  );
}

/* ── Council research ───────────────────────────────────────────────────── */

function ResearchCard({ extras }) {
  const d = extras.data;
  const rows = useMemo(
    () => (d?.notes ? macroResearch(d.notes, { members: d.members, viewer: d.viewer }) : []),
    [d],
  );
  let body;
  if (extras.status === 'loading') body = <Loading label="Loading council research" />;
  else if (extras.status === 'error' || d?.notes === null)
    body = <Failed onRetry={extras.retry}>Couldn&apos;t load council research.</Failed>;
  else if (!rows.length)
    body = <Empty>No macro or sector research has been written yet. New note starts one.</Empty>;
  else
    body = (
      <div className="gmc-table" role="table" aria-label="Council macro research">
        <div className="gmc-tr gmc-tr--head gmc-cols-research" role="row">
          <span role="columnheader">Document</span>
          <span role="columnheader">Type</span>
          <span role="columnheader">Author</span>
          <span role="columnheader">Status</span>
          <span role="columnheader" className="gmc-r">
            Date
          </span>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="gmc-tr gmc-cols-research" role="row">
            <span role="cell" className="gmc-cell--lead">
              <span className="gmc-dot" aria-hidden="true" />
              <Link href={LINKS.doc(r.id)} className="gmc-rowlink">
                {r.title}
              </Link>
            </span>
            <span role="cell">
              {r.kind}
              {r.sector ? <span className="gmc-muted">, {r.sector}</span> : null}
            </span>
            <span role="cell">{r.author}</span>
            <span role="cell" className={`gmc-strong gmc-tone--${r.tone}`}>
              {r.status}
            </span>
            <span role="cell" className="gmc-r gmc-num">
              {fmtDate(r.date)}
            </span>
          </div>
        ))}
      </div>
    );
  return (
    <Section
      id="gmc-research"
      title="Council macro research"
      aside={
        <Link href={LINKS.newNote} className="gmc-btn">
          New note
        </Link>
      }
    >
      {body}
    </Section>
  );
}

/* ── Agenda builder (managers only) ─────────────────────────────────────── */

function AgendaCard({ drafts, onRemove, onKind, onSend, sent }) {
  return (
    <Section
      id="gmc-agenda"
      title="Agenda builder from events"
      aside={
        <button type="button" className="gmc-btn" disabled={!drafts.length} onClick={onSend}>
          Send to meetings
        </button>
      }
    >
      {sent ? (
        <p className="gmc-note" role="status">
          {sent}
        </p>
      ) : null}
      {!drafts.length ? (
        <Empty>
          Use Add to agenda on an event to draft an item. Drafts stay on this page until sent.
        </Empty>
      ) : (
        <div className="gmc-table" role="table" aria-label="Agenda draft">
          <div className="gmc-tr gmc-tr--head gmc-cols-agenda" role="row">
            <span role="columnheader">Agenda item</span>
            <span role="columnheader">Owner</span>
            <span role="columnheader">Type</span>
            <span role="columnheader" className="gmc-r">
              Time
            </span>
            <span role="columnheader">
              <span className="gmc-sr">Remove</span>
            </span>
          </div>
          {drafts.map((d) => (
            <div key={d.key} className="gmc-tr gmc-cols-agenda" role="row">
              <span role="cell" className="gmc-cell--lead">
                <span className="gmc-dot" aria-hidden="true" />
                <strong>{d.label}</strong>
              </span>
              <span role="cell">{d.owner || NA}</span>
              <span role="cell">
                <label className="gmc-sr" htmlFor={`kind-${d.key}`}>
                  Item type
                </label>
                <select
                  id={`kind-${d.key}`}
                  className="gmc-select"
                  value={d.kind}
                  onChange={(e) => onKind(d.key, e.target.value)}
                >
                  {AGENDA_KINDS.map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </span>
              <span role="cell" className="gmc-r gmc-num">
                {d.minutes} min
              </span>
              <span role="cell" className="gmc-r">
                <button type="button" className="gmc-tb" onClick={() => onRemove(d.key)}>
                  Remove
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ── Council versus council ─────────────────────────────────────────────── */

function RivalsCard({ extras }) {
  const st = extras.data?.standing;
  const view = useMemo(() => (st ? standingRows(st.rows, st.myOrgId) : null), [st]);
  let body;
  if (extras.status === 'loading') body = <Loading label="Loading council rankings" />;
  else if (extras.status === 'error' || !view)
    body = <Failed onRetry={extras.retry}>Couldn&apos;t load council rankings.</Failed>;
  else if (view.status !== 'ready')
    body = (
      <Empty href={LINKS.rankings} action="Open council rankings">
        {view.status === 'unrated'
          ? 'Your council has no rating yet. It is rated after a judged competition or a fund report.'
          : 'No councils are rated yet.'}
      </Empty>
    );
  else
    body = (
      <>
        <div className="gmc-table" role="table" aria-label="Council versus council">
          <div className="gmc-tr gmc-tr--head gmc-cols-rivals" role="row">
            <span role="columnheader">Rank</span>
            <span role="columnheader">Council</span>
            <span role="columnheader" className="gmc-r">
              Rating
            </span>
            <span role="columnheader">Tier</span>
          </div>
          {view.rows.map((r) => (
            <div
              key={r.orgId}
              className={`gmc-tr gmc-cols-rivals${r.mine ? ' gmc-tr--mine' : ''}`}
              role="row"
              aria-current={r.mine ? 'true' : undefined}
            >
              <span role="cell" className="gmc-num gmc-muted">
                {r.rank}
              </span>
              <span role="cell" className={r.mine ? 'gmc-strong gmc-tone--accent' : ''}>
                {r.name}
                {r.mine ? <span className="gmc-sr"> (your council)</span> : null}
              </span>
              <span role="cell" className="gmc-r gmc-num">
                {r.rating == null ? NA : r.rating.toLocaleString('en-US')}
              </span>
              <span role="cell">{r.tier}</span>
            </div>
          ))}
        </div>
        <p className="gmc-foot">
          Rank <span className="gmc-num">{view.rank}</span> of{' '}
          <span className="gmc-num">{view.field}</span> rated councils.{' '}
          <Link href={LINKS.rankings} className="gmc-link">
            Open council rankings <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </p>
      </>
    );
  return (
    <Section id="gmc-rivals" title="Council versus council">
      {body}
    </Section>
  );
}

/* ── Policy and exposure check ──────────────────────────────────────────── */

const POLICY_ICON = {
  up: 'bi-check-circle',
  warn: 'bi-exclamation-triangle',
  down: 'bi-x-circle',
  na: 'bi-dash-circle',
};

function PolicyCard({ fund }) {
  const pc = useMemo(() => (fund.status === 'ready' ? policyCheck(fund.raw) : null), [fund]);
  let body;
  if (fund.status === 'loading') body = <Loading label="Loading the policy check" />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>Couldn&apos;t load the policy check.</Failed>;
  else if (!pc.ruleCount)
    body = (
      <Empty href={LINKS.compliance} action="Open compliance">
        No policy rules are recorded for the council.
      </Empty>
    );
  else
    body = (
      <>
        <ul className="gmc-checks">
          {pc.rows.map((r) => (
            <li key={r.id}>
              <i
                className={`bi ${POLICY_ICON[r.tone] || POLICY_ICON.na} gmc-tone--${r.tone}`}
                aria-hidden="true"
              />
              <span className="gmc-checks__label">{r.label}</span>
              <span className={r.mono ? 'gmc-num' : ''}>{r.reading}</span>
              <span className={`gmc-strong gmc-tone--${r.tone}`}>{r.status}</span>
            </li>
          ))}
          {pc.unpriced.length ? (
            <li>
              <i className="bi bi-info-circle gmc-tone--warn" aria-hidden="true" />
              <span className="gmc-checks__label">Not yet priced</span>
              <span>
                <span className="gmc-num">{pc.unpriced.join(', ')}</span> counted at cost in these
                readings
              </span>
              <span />
            </li>
          ) : null}
        </ul>
        <p className="gmc-foot">
          A description of stored rules read against the book. It does not block or advise.{' '}
          <Link href={LINKS.compliance} className="gmc-link">
            Open compliance <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </p>
      </>
    );
  return (
    <Section id="gmc-policy" title="Policy and exposure check">
      {body}
    </Section>
  );
}

/* ── Side column ────────────────────────────────────────────────────────── */

function CoverageCard({ fund, teams }) {
  let body;
  if (fund.status === 'loading') body = <Loading label="Loading coverage" />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>Couldn&apos;t load coverage.</Failed>;
  else if (!teams.length)
    body = (
      <Empty href={LINKS.orgChart} action="Open org chart">
        No sector teams are set up yet.
      </Empty>
    );
  else
    body = (
      <ul className="gmc-cover">
        {teams.map((t) => (
          <li key={t.id}>
            <span className="gmc-cell--lead">
              <span className="gmc-dot" aria-hidden="true" />
              <strong>{t.name}</strong>
            </span>
            <span className={t.owners.length ? '' : 'gmc-muted'}>
              {t.owners.length ? t.owners.join(', ') : 'No coverage recorded'}
            </span>
          </li>
        ))}
      </ul>
    );
  return (
    <Section id="gmc-coverage" title="Coverage and owners">
      {body}
    </Section>
  );
}

function DebriefCard({ debrief }) {
  if (debrief.status === 'loading') return null;
  if (debrief.status === 'error')
    return (
      <Section id="gmc-debrief" title="Debrief queue">
        <Failed onRetry={debrief.retry}>Couldn&apos;t load your Debrief.</Failed>
      </Section>
    );
  const items = (debrief.data?.items || [])
    .slice()
    .sort((a, b) => Number(Boolean(a.reviewed)) - Number(Boolean(b.reviewed)))
    .slice(0, 3);
  if (!items.length) return null;
  return (
    <Section id="gmc-debrief" title="Debrief queue">
      <ul className="gmc-debrief">
        {items.map((it) => (
          <li key={it.id}>
            <span className="gmc-dot" aria-hidden="true" />
            <span>
              <strong>{it.event_title}</strong>
              <span className="gmc-meta">
                <span className="gmc-num">{fmtDate(it.event_time || it.created_at)}</span>
                {it.reviewed ? ' · Reviewed' : ' · Not reviewed'}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <Link href={LINKS.debrief} className="gmc-link">
        Open Debrief <i className="bi bi-arrow-right" aria-hidden="true" />
      </Link>
    </Section>
  );
}

/* ── Dialogs ────────────────────────────────────────────────────────────── */

function EventDialog({ row, onClose, sampleActive, canSendToTeam, onSendToTeam, light }) {
  const [state, setState] = useState(null);
  const e = row?.event || {};
  const save = async () => {
    if (sampleActive) {
      setState({ tone: 'na', text: 'Sample content is showing, so nothing is saved.' });
      return;
    }
    setState({ tone: 'na', text: 'Saving' });
    try {
      const res = await fetch('/api/debrief-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_title: e.title,
          event_body: e.body,
          event_country: e.country,
          event_url: e.url,
          event_time: e.time,
          analysis: null,
        }),
      });
      if (!res.ok) throw new Error('save');
      setState({ tone: 'up', text: 'Added to your Debrief.' });
    } catch {
      setState({ tone: 'down', text: 'Could not add to Debrief. Try again.' });
    }
  };
  return (
    <Modal
      open={Boolean(row)}
      onClose={onClose}
      className={light ? 'force-light-theme' : undefined}
      title="Event analysis"
      footer={
        <div className="gmc-modal__foot">
          <button type="button" className="gmc-tb" onClick={onClose}>
            Close
          </button>
          {canSendToTeam && !sampleActive ? (
            <button type="button" className="gmc-tb" onClick={() => onSendToTeam(e)}>
              Send to team
            </button>
          ) : null}
          <button type="button" className="gmc-btn" onClick={save}>
            Add to Debrief
          </button>
        </div>
      }
    >
      {row ? (
        <div className="gmc-dialog">
          <h3 className="gmc-dialog__title">{row.title}</h3>
          <p className="gmc-meta">
            <span className="gmc-num">{fmtDate(row.time)}</span> · {row.topic}
            {e.country ? ` · ${e.country}` : ''}
          </p>
          {e.body && e.body !== row.title ? <p className="gmc-dialog__body">{e.body}</p> : null}
          {e.url ? (
            <a href={e.url} target="_blank" rel="noopener noreferrer" className="gmc-link">
              Read the source <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </a>
          ) : null}
          <h4 className="gmc-dialog__sub">Council</h4>
          <p className="gmc-foot">
            Sector teams matched to this event by topic. This is a sector match, not an impact
            estimate.
          </p>
          <ul className="gmc-cover">
            {row.teams.map((t) => (
              <li key={t.id}>
                <span>
                  <strong>{t.name}</strong>
                  <span className="gmc-meta">Sector match: {row.topic}</span>
                </span>
                <span className={t.owners.length ? '' : 'gmc-muted'}>
                  {t.owners.join(', ') || 'No coverage recorded'}
                </span>
              </li>
            ))}
          </ul>
          {state ? (
            <p className={`gmc-note gmc-tone--${state.tone}`} role="status">
              {state.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function SendDialog({ open, onClose, meetings, drafts, sampleActive, onSent, light }) {
  const list = meetings || [];
  const [choice, setChoice] = useState(null);
  const [state, setState] = useState(null);
  useEffect(() => {
    if (open) {
      setChoice(list[0]?.id || null);
      setState(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const m = list.find((x) => x.id === choice);
    if (!m) return;
    if (sampleActive) {
      onSent(
        `Sample content: ${drafts.length} item${drafts.length === 1 ? '' : 's'} added to ${m.title} on this page only. Nothing is saved.`,
      );
      return;
    }
    setState({ busy: true });
    try {
      const cur = await fetch(`/api/org/meetings/${encodeURIComponent(m.id)}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await cur.json().catch(() => ({}));
      if (!cur.ok) throw new Error('read');
      const res = await fetch(`/api/org/meetings/${encodeURIComponent(m.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'set_agenda',
          agenda: appendAgenda(data?.meeting?.agenda, drafts),
        }),
      });
      if (!res.ok) throw new Error('write');
      onSent(
        `${drafts.length} item${drafts.length === 1 ? '' : 's'} added to ${m.title} (${fmtMeetingDay(m.scheduled_at)}).`,
        m.id,
      );
    } catch {
      setState({ error: 'Could not add the items to that meeting. Try again.' });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      className={light ? 'force-light-theme' : undefined}
      title="Send to meetings"
      footer={
        <div className="gmc-modal__foot">
          <button type="button" className="gmc-tb" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="gmc-btn"
            disabled={!choice || state?.busy}
            onClick={send}
          >
            {state?.busy ? 'Adding' : 'Add to agenda'}
          </button>
        </div>
      }
    >
      <div className="gmc-dialog">
        <p className="gmc-foot">
          Adds {drafts.length} drafted item{drafts.length === 1 ? '' : 's'} to the end of the
          meeting&apos;s agenda.
        </p>
        {!list.length ? (
          <Empty href={LINKS.meetings} action="Open meetings">
            No upcoming meeting is scheduled.
          </Empty>
        ) : (
          <fieldset className="gmc-options">
            <legend className="gmc-sr">Upcoming meeting</legend>
            {list.slice(0, 6).map((m) => (
              <label key={m.id} className="gmc-option">
                <input
                  type="radio"
                  name="gmc-meeting"
                  value={m.id}
                  checked={choice === m.id}
                  onChange={() => setChoice(m.id)}
                />
                <span className="gmc-num">{fmtMeetingDay(m.scheduled_at)}</span>
                <span>{m.title}</span>
              </label>
            ))}
          </fieldset>
        )}
        {state?.error ? (
          <p className="gmc-note gmc-tone--down" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

/* ── The view ───────────────────────────────────────────────────────────── */

const ORDER = {
  analyst: ['events', 'research', 'sleeves', 'fund', 'rivals', 'policy'],
  portfolio_manager: ['events', 'sleeves', 'agenda', 'fund', 'research', 'policy', 'rivals'],
  default: ['events', 'fund', 'sleeves', 'research', 'agenda', 'rivals', 'policy'],
};

export function CouncilView({
  role,
  light,
  tickerData,
  chainEvents,
  chainStatus,
  onRetryEvents,
  onOpenChain,
  canSendToTeam,
  onSendToTeam,
}) {
  const data = useCouncilMarket();
  const { fund, extras, sampleActive, sampleAvailable, setShowSample, debrief } = data;
  const [now] = useState(() => Date.now());

  const raw = fund.status === 'ready' ? fund.raw : null;
  const teams = useMemo(() => (raw ? councilTeams(raw) : []), [raw]);
  const sleeves = useMemo(() => (raw ? sleeveRows(raw) : []), [raw]);
  const moves = useSectorMoves(sleeveFunds(sleeves));
  const eventRows = useMemo(
    () => (raw ? matchEvents(chainEvents, raw, { now }) : []),
    [raw, chainEvents, now],
  );
  const meetings = useMemo(
    () => (extras.data?.meetings ? upcoming(extras.data.meetings, now).list : []),
    [extras.data, now],
  );

  const viewerRole = extras.data?.viewer?.role || role;
  const canAgenda = Boolean(extras.data?.viewer?.canManage);

  const [open, setOpen] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);

  /* Switching between sample and council data drops the drafts and dialogs. */
  useEffect(() => {
    setDrafts([]);
    setOpen(null);
    setSent(null);
  }, [sampleActive]);

  const drafted = useMemo(() => new Set(drafts.map((d) => d.key)), [drafts]);
  const addDraft = useCallback((row) => {
    setSent(null);
    setDrafts((list) => {
      const d = agendaDraft(row);
      return list.some((x) => x.key === d.key) ? list : [...list, d];
    });
  }, []);

  const eventsState = {
    status:
      chainStatus === 'loading' || fund.status === 'loading'
        ? 'loading'
        : chainStatus === 'error' || fund.status === 'error'
          ? 'error'
          : 'ready',
    retry: fund.status === 'error' ? fund.retry : onRetryEvents,
  };

  const cards = {
    events: (
      <EventsCard
        key="events"
        rows={eventRows}
        teams={teams}
        events={eventsState}
        canAgenda={canAgenda}
        drafted={drafted}
        onOpen={setOpen}
        onAgenda={addDraft}
        onChain={(r) => onOpenChain(r?.event || null)}
      />
    ),
    fund: <FundCard key="fund" extras={extras} fund={fund} />,
    sleeves: <SleevesCard key="sleeves" fund={fund} rows={sleeves} moves={moves} />,
    research: <ResearchCard key="research" extras={extras} />,
    agenda: canAgenda ? (
      <AgendaCard
        key="agenda"
        drafts={drafts}
        sent={sent}
        onRemove={(k) => setDrafts((l) => l.filter((d) => d.key !== k))}
        onKind={(k, kind) => setDrafts((l) => l.map((d) => (d.key === k ? { ...d, kind } : d)))}
        onSend={() => setSending(true)}
      />
    ) : null,
    rivals: <RivalsCard key="rivals" extras={extras} />,
    policy: <PolicyCard key="policy" fund={fund} />,
  };
  const order = ORDER[viewerRole] || ORDER.default;

  return (
    <div className={`gmc ez-canvas${light ? ' force-light-theme' : ''}`}>
      <div className="gmc-inner">
        <h1 className="gmc-sr">Council view of global markets</h1>
        <IndexStrip tickerData={tickerData} />
        <div className="gmc-band">
          {sampleActive || sampleAvailable ? (
            <div className="gmc-band__sample">
              {sampleActive ? <span className="gmc-sample">Sample content</span> : null}
              {sampleAvailable ? (
                <button
                  type="button"
                  className="gmc-tb"
                  aria-pressed={!sampleActive}
                  onClick={() => setShowSample(!sampleActive)}
                >
                  {sampleActive ? 'Show council data' : 'Show sample content'}
                </button>
              ) : null}
            </div>
          ) : null}
          <KpiStrip fund={fund} extras={extras} now={now} />
        </div>
        <div className="gmc-body">
          <div className="gmc-main">{order.map((k) => cards[k])}</div>
          <aside className="gmc-side" aria-label="Coverage and debrief">
            <CoverageCard fund={fund} teams={teams} />
            <DebriefCard debrief={debrief} />
          </aside>
        </div>
        {sampleActive ? (
          <p className="gmc-footer">
            Sample content shown for demo accounts only. Nothing done to sample content is saved.
          </p>
        ) : null}
      </div>
      <EventDialog
        row={open}
        light={light}
        onClose={() => setOpen(null)}
        sampleActive={sampleActive}
        canSendToTeam={canSendToTeam}
        onSendToTeam={(e) => {
          setOpen(null);
          onSendToTeam(e);
        }}
      />
      <SendDialog
        open={sending}
        light={light}
        onClose={() => setSending(false)}
        meetings={meetings}
        drafts={drafts}
        sampleActive={sampleActive}
        onSent={(text) => {
          setSending(false);
          setDrafts([]);
          setSent(text);
        }}
      />
    </div>
  );
}

export default CouncilView;
