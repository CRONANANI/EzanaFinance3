'use client';

/**
 * Council cards of Alternative Markets (/alternative-markets), shown only to
 * council members once their membership is known. The crypto and
 * commodities page is unchanged for everyone; these sit beside it.
 *
 *   CouncilWorkspace   under the headline metrics: policy review, research
 *                      library, pitch pipeline, learning links (order by role)
 *   CouncilContext     after the chart: coverage owners, sector sleeves,
 *                      meetings, council rankings
 *   CouncilChartActions  Start a pitch and Send to team beside the chart
 *
 * Every council figure comes from src/lib/org-alternative-markets-model.js
 * over the council's own records (or the labelled sample, master admin and
 * demo accounts only). Nothing on these cards writes. Start a pitch opens the
 * Pitch Pipeline's own submit flow; Send to team uses the existing
 * permission-gated dialog.
 */
import { useId, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Modal, Skeleton, SkeletonRegion } from '@/components/ds';
import {
  LINKS,
  NA,
  POLICY_NOTE,
  altPitches,
  altResearch,
  bandOrder,
  cleanTicker,
  coverageRows,
  fmtDate,
  fmtDay,
  learningLinks,
  nextMeetings,
  policyLine,
  policyLookup,
  sleeveRows,
  standingRows,
} from '@/lib/org-alternative-markets-model';
import '@/app/(dashboard)/org-trading/org-trading.css';
import './council-alt.css';

const OrgSendToTeamModal = dynamic(
  () =>
    import('@/components/org/OrgSendToTeamModal').then((m) => ({ default: m.OrgSendToTeamModal })),
  { ssr: false, loading: () => null },
);

/* ── States ─────────────────────────────────────────────────────────────── */

function Loading({ label }) {
  return (
    <SkeletonRegion label={label} className="amc-skel">
      {['90%', '72%', '80%', '48%'].map((w) => (
        <Skeleton key={w} height={12} width={w} />
      ))}
    </SkeletonRegion>
  );
}

function Empty({ children, href, action }) {
  return (
    <div className="amc-state">
      <p>{children}</p>
      {href ? (
        <Link href={href} className="amc-link">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

function Failed({ children, onRetry }) {
  return (
    <div className="amc-state amc-state--error" role="alert">
      <p>
        <i className="bi bi-exclamation-circle" aria-hidden="true" />
        <span>{children}</span>
      </p>
      <button type="button" className="amc-link" onClick={onRetry}>
        <i className="bi bi-arrow-clockwise" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

function Col({ icon, title, aside, children, busy }) {
  const id = useId();
  return (
    <section className="amc-col" aria-labelledby={id} aria-busy={busy || undefined}>
      <h2 id={id} className="amc-col__title">
        <i className={`bi ${icon}`} aria-hidden="true" />
        <span>{title}</span>
        {aside ? <span className="amc-faint amc-col__aside">{aside}</span> : null}
      </h2>
      {children}
    </section>
  );
}

function BandHead({ council, councilName }) {
  const { sampleActive, sampleAvailable, setShowSample } = council;
  const name = sampleActive ? 'Sample council' : councilName || 'your council';
  return (
    <div className="amc-band__head">
      <span className="amc-faint">Council workspace, visible to {name} members</span>
      {sampleActive || sampleAvailable ? (
        <span className="amc-band__sample">
          {sampleActive ? <span className="amc-faint">Sample content</span> : null}
          {sampleAvailable ? (
            <button
              type="button"
              className="amc-tb"
              aria-pressed={!sampleActive}
              onClick={() => setShowSample(!sampleActive)}
            >
              {sampleActive ? 'Show council data' : 'Show sample content'}
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

/* ── Policy review ──────────────────────────────────────────────────────── */

function PolicyDialog({ open, onClose, fund, initial }) {
  const [value, setValue] = useState(initial || '');
  const look = useMemo(
    () => (fund.status === 'ready' && value ? policyLookup(fund.raw, value) : null),
    [fund, value],
  );
  const line = policyLine(look);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Check a ticker against policy"
      footer={
        <div className="amc-modal__foot">
          <button type="button" className="amc-tb" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="amc-btn"
            onClick={() => {
              setValue('');
              document.getElementById('amc-policy-dialog-input')?.focus();
            }}
          >
            Check another
          </button>
        </div>
      }
    >
      <div className="amc-dialog">
        <p className="amc-muted">
          Compares a ticker with the policy rules recorded for the council and reads each active
          rule against the council&apos;s own book.
        </p>
        <label className="amc-field">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="amc-sr">Ticker</span>
          <input
            id="amc-policy-dialog-input"
            className="amc-input amc-num"
            value={value}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="Ticker"
            onChange={(e) => setValue(cleanTicker(e.target.value))}
          />
        </label>
        {line ? <p className={`amc-strong amc-tone--${line.tone}`}>{line.text}</p> : null}
        {look ? (
          <div className="amc-table" role="table" aria-label="Policy rules">
            <div className="amc-tr amc-tr--head amc-cols-rules" role="row">
              <span role="columnheader">Rule</span>
              <span role="columnheader">Limit</span>
              <span role="columnheader">On this ticker</span>
              <span role="columnheader" className="amc-r">
                Reading
              </span>
            </div>
            {look.readings.map((r) => (
              <div key={r.id} className="amc-tr amc-cols-rules" role="row">
                <span role="cell">{r.label}</span>
                <span role="cell" className="amc-num">
                  {r.limit}
                </span>
                <span role="cell">{r.current}</span>
                <span role="cell" className={`amc-r amc-tone--${r.tone}`}>
                  {r.reading}
                </span>
              </div>
            ))}
            <div className="amc-tr amc-cols-rules" role="row">
              <span role="cell">Asset class rules</span>
              <span role="cell">{NA}</span>
              <span role="cell">No asset class rule set</span>
              <span role="cell" className="amc-r amc-tone--na">
                Not recorded
              </span>
            </div>
          </div>
        ) : null}
        <p className="amc-faint amc-small">
          This describes the recorded rules only. It is not a recommendation or an approval.
        </p>
      </div>
    </Modal>
  );
}

function PolicyCol({ fund }) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const look = useMemo(
    () => (fund.status === 'ready' && value ? policyLookup(fund.raw, value) : null),
    [fund, value],
  );
  const hasRules =
    fund.status === 'ready' && (fund.raw?.rules || []).some((r) => r.is_active !== false);
  const line = policyLine(look);
  let body;
  if (fund.status === 'loading') body = <Loading label="Loading the policy rules" />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>Could not load the policy rules.</Failed>;
  else if (!hasRules)
    body = (
      <Empty href={LINKS.compliance} action="Open compliance">
        No policy rules are recorded for the council yet.
      </Empty>
    );
  else
    body = (
      <>
        <p className="amc-muted">Checks recorded prohibited tickers and sectors.</p>
        <label className="amc-field">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="amc-sr">Ticker to check</span>
          <input
            className="amc-input amc-num"
            value={value}
            autoComplete="off"
            spellCheck={false}
            placeholder="Ticker, for example BTC"
            onChange={(e) => setValue(cleanTicker(e.target.value))}
          />
        </label>
        <p className="amc-result" aria-live="polite">
          {line ? (
            <span className={`amc-strong amc-tone--${line.tone}`}>{line.text}</span>
          ) : (
            <span className="amc-faint">Type a ticker to check it.</span>
          )}
        </p>
        <p className="amc-faint amc-small">{POLICY_NOTE}</p>
        <button type="button" className="amc-link" onClick={() => setOpen(true)}>
          Open full check
        </button>
        {open ? (
          <PolicyDialog open onClose={() => setOpen(false)} fund={fund} initial={value} />
        ) : null}
      </>
    );
  return (
    <Col icon="bi-file-earmark-text" title="Policy review" busy={fund.status === 'loading'}>
      {body}
    </Col>
  );
}

/* ── Research library ───────────────────────────────────────────────────── */

const MODE_WORD = { crypto: 'crypto', commodities: 'commodities' };

function ResearchCol({ extras, mode, rowTickers }) {
  const d = extras.data;
  const rows = useMemo(
    () =>
      d?.notes
        ? altResearch(d.notes, { mode, rowTickers, members: d.members, viewer: d.viewer })
        : [],
    [d, mode, rowTickers],
  );
  let body;
  if (extras.status === 'loading') body = <Loading label="Loading council research" />;
  else if (extras.status === 'error' || !d?.notes)
    body = <Failed onRetry={extras.retry}>Could not load the research library.</Failed>;
  else if (!rows.length)
    body = (
      <Empty href={LINKS.newNote} action="Write a note">
        No council research on {MODE_WORD[mode]} yet.
      </Empty>
    );
  else
    body = (
      <ul className="amc-list">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={LINKS.doc(r.id)} className="amc-rowlink">
              <span>{r.title}</span>
              <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </Link>
            <span className="amc-meta">
              {r.kind}, {r.author}, <span className="amc-num">{fmtDate(r.date)}</span>
              {r.draft ? ', draft' : ''}
            </span>
          </li>
        ))}
      </ul>
    );
  return (
    <Col icon="bi-stack" title="Research library" busy={extras.status === 'loading'}>
      {body}
    </Col>
  );
}

/* ── Pitch pipeline ─────────────────────────────────────────────────────── */

function PitchCol({ extras, fund, mode, rowTickers }) {
  const d = extras.data;
  const members = useMemo(() => (fund.status === 'ready' ? fund.raw?.members || [] : []), [fund]);
  const rows = useMemo(
    () => (d?.pitches ? altPitches(d.pitches, { mode, rowTickers, members }) : []),
    [d, mode, rowTickers, members],
  );
  let body;
  if (extras.status === 'loading') body = <Loading label="Loading the pitch pipeline" />;
  else if (extras.status === 'error' || !d?.pitches)
    body = <Failed onRetry={extras.retry}>Could not load the pitch pipeline.</Failed>;
  else if (!rows.length)
    body = (
      <Empty href={LINKS.newPitch(null)} action="Start a pitch">
        No {MODE_WORD[mode]} pitches in progress.
      </Empty>
    );
  else {
    const leads = [...new Set(rows.map((r) => r.lead).filter(Boolean))];
    body = (
      <>
        <ul className="amc-rows">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={LINKS.pitch(r.id)} className="amc-rowlink">
                <span className="amc-num amc-strong">{r.ticker}</span>
                <span className="amc-ellipsis" title={r.title}>
                  {r.title}
                </span>
              </Link>
              <span className={`amc-tone--${r.tone}`}>{r.stage}</span>
            </li>
          ))}
        </ul>
        {leads.length ? <p className="amc-meta">Leads: {leads.join(', ')}</p> : null}
        <Link href={LINKS.pitches} className="amc-link">
          Open pipeline
        </Link>
      </>
    );
  }
  return (
    <Col icon="bi-diagram-3" title="Pitch pipeline" busy={extras.status === 'loading'}>
      {body}
    </Col>
  );
}

/* ── Learning links ─────────────────────────────────────────────────────── */

function LearningCol({ mode }) {
  const rows = useMemo(() => learningLinks(mode), [mode]);
  return (
    <Col icon="bi-book" title="Learning links">
      {rows.length ? (
        <ul className="amc-list">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={c.href} className="amc-rowlink">
                <span>{c.title}</span>
                <i className="bi bi-arrow-up-right" aria-hidden="true" />
              </Link>
              {c.minutes ? (
                <span className="amc-meta">
                  <span className="amc-num">{c.minutes}</span> min course
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty href={LINKS.learning} action="Open Learning Center">
          No {MODE_WORD[mode]} courses are listed yet.
        </Empty>
      )}
    </Col>
  );
}

/* ── Band 1 ─────────────────────────────────────────────────────────────── */

export function CouncilWorkspace({ council, mode, rowTickers, councilName }) {
  const { fund, extras } = council;
  const role = extras.data?.viewer?.role || null;
  const cols = {
    policy: <PolicyCol key="policy" fund={fund} />,
    research: <ResearchCol key="research" extras={extras} mode={mode} rowTickers={rowTickers} />,
    pitches: (
      <PitchCol key="pitches" extras={extras} fund={fund} mode={mode} rowTickers={rowTickers} />
    ),
    learning: <LearningCol key="learning" mode={mode} />,
  };
  return (
    <div className="amc-band" role="region" aria-label="Council workspace">
      <BandHead council={council} councilName={councilName} />
      <div className="amc-grid">{bandOrder(role).map((k) => cols[k])}</div>
    </div>
  );
}

/* ── Band 2 ─────────────────────────────────────────────────────────────── */

function CoverageCol({ fund }) {
  const rows = useMemo(() => (fund.status === 'ready' ? coverageRows(fund.raw) : []), [fund]);
  let body;
  if (fund.status === 'loading') body = <Loading label="Loading coverage" />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>Could not load coverage.</Failed>;
  else if (!rows.length)
    body = (
      <Empty href={LINKS.orgChart} action="Open org chart">
        No sector teams are set up yet.
      </Empty>
    );
  else
    body = (
      <ul className="amc-rows">
        {rows.map((t) => (
          <li key={t.id}>
            <span>{t.name}</span>
            <span className={t.owners.length ? '' : 'amc-muted'}>
              {t.owners.length ? t.owners.join(', ') : 'Unassigned'}
            </span>
          </li>
        ))}
      </ul>
    );
  return (
    <Col icon="bi-people" title="Coverage owners" busy={fund.status === 'loading'}>
      {body}
    </Col>
  );
}

function SleevesCol({ fund }) {
  const rows = useMemo(() => (fund.status === 'ready' ? sleeveRows(fund.raw) : []), [fund]);
  const unpriced = useMemo(
    () =>
      new Set(
        (fund.status === 'ready' ? fund.raw?.positions || [] : [])
          .filter((p) => !p.priced)
          .map((p) => String(p.ticker || '').toUpperCase()),
      ),
    [fund],
  );
  let body;
  if (fund.status === 'loading') body = <Loading label="Loading sector sleeves" />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>Could not load the sector sleeves.</Failed>;
  else if (!rows.length)
    body = (
      <Empty href={LINKS.tradingDesk} action="Open Trading Desk">
        The council book has no holdings yet.
      </Empty>
    );
  else
    body = (
      <ul className="amc-sleeves">
        {rows.map((s) => (
          <li key={s.teamId || s.name}>
            <span className="amc-sleeve__name">{s.name}</span>
            <span className="amc-num amc-r">
              {s.weightPct == null ? NA : `${Number(s.weightPct).toFixed(1)}%`}
            </span>
            <span className="amc-sleeve__tickers">
              {s.tickers.map((t) => (
                <span key={t} className={`amc-num ${unpriced.has(t) ? 'amc-faint' : ''}`}>
                  {t}
                  {unpriced.has(t) ? <span className="amc-sans"> not yet priced</span> : null}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    );
  return (
    <Col icon="bi-grid" title="Sector sleeves" busy={fund.status === 'loading'}>
      {body}
    </Col>
  );
}

function MeetingsCol({ extras }) {
  const [now] = useState(() => Date.now());
  const d = extras.data;
  const rows = useMemo(() => (d?.meetings ? nextMeetings(d.meetings, now) : []), [d, now]);
  let body;
  if (extras.status === 'loading') body = <Loading label="Loading meetings" />;
  else if (extras.status === 'error' || !d?.meetings)
    body = <Failed onRetry={extras.retry}>Could not load meetings.</Failed>;
  else if (!rows.length)
    body = (
      <Empty href={LINKS.meetings} action="Open meetings">
        No upcoming meetings are scheduled.
      </Empty>
    );
  else
    body = (
      <>
        <ul className="amc-rows">
          {rows.map((m) => (
            <li key={m.id}>
              <Link href={LINKS.meeting(m.id)} className="amc-rowlink">
                <span className="amc-ellipsis" title={m.title}>
                  {m.title}
                </span>
              </Link>
              <span className="amc-num amc-muted">{fmtDay(m.at)}</span>
            </li>
          ))}
        </ul>
        <Link href={LINKS.meetings} className="amc-link">
          Open meetings <i className="bi bi-arrow-up-right" aria-hidden="true" />
        </Link>
      </>
    );
  return (
    <Col icon="bi-calendar-event" title="Meetings" busy={extras.status === 'loading'}>
      {body}
    </Col>
  );
}

function RankingsCol({ extras }) {
  const st = extras.data?.standing;
  const view = useMemo(() => (st ? standingRows(st.rows, st.myOrgId) : null), [st]);
  let body;
  if (extras.status === 'loading') body = <Loading label="Loading council rankings" />;
  else if (extras.status === 'error' || !view)
    body = <Failed onRetry={extras.retry}>Could not load council rankings.</Failed>;
  else if (view.status !== 'ready')
    body = (
      <Empty href={LINKS.rankings} action="Open council rankings">
        {view.status === 'unrated'
          ? 'Your council has no rating yet.'
          : 'No councils are rated yet.'}
      </Empty>
    );
  else
    body = (
      <>
        <div className="amc-table" role="table" aria-label="Council rankings">
          <div className="amc-tr amc-tr--head amc-cols-rank" role="row">
            <span role="columnheader">Rank</span>
            <span role="columnheader">Council</span>
            <span role="columnheader" className="amc-r">
              Rating
            </span>
            <span role="columnheader" className="amc-r">
              Tier
            </span>
          </div>
          {view.rows.map((r) => (
            <div
              key={r.orgId}
              className="amc-tr amc-cols-rank"
              role="row"
              aria-current={r.mine ? 'true' : undefined}
            >
              <span role="cell" className="amc-num amc-muted">
                {r.rank}
              </span>
              <span
                role="cell"
                className={`amc-ellipsis${r.mine ? ' amc-strong amc-tone--accent' : ''}`}
                title={r.name}
              >
                {r.name}
                {r.mine ? <span className="amc-sr"> (your council)</span> : null}
              </span>
              <span role="cell" className="amc-r amc-num">
                {r.rating == null ? NA : r.rating.toLocaleString('en-US')}
              </span>
              <span role="cell" className="amc-r">
                {r.tier}
              </span>
            </div>
          ))}
        </div>
        <Link href={LINKS.rankings} className="amc-link">
          Open council rankings <i className="bi bi-arrow-up-right" aria-hidden="true" />
        </Link>
      </>
    );
  return (
    <Col icon="bi-trophy" title="Council rankings" busy={extras.status === 'loading'}>
      {body}
    </Col>
  );
}

export function CouncilContext({ council }) {
  const { fund, extras } = council;
  return (
    <div className="amc-band" role="region" aria-label="Council context">
      <div className="amc-grid">
        <CoverageCol fund={fund} />
        <SleevesCol fund={fund} />
        <MeetingsCol extras={extras} />
        <RankingsCol extras={extras} />
      </div>
    </div>
  );
}

/* ── Chart actions ──────────────────────────────────────────────────────── */

export function CouncilChartActions({ council, asset, canSendToTeam }) {
  const [sending, setSending] = useState(false);
  if (!asset) return null;
  return (
    <div className="amc-chart-actions">
      <Link href={LINKS.newPitch(asset.ticker)} className="amc-link">
        <i className="bi bi-lightbulb" aria-hidden="true" />
        Start a pitch
      </Link>
      {canSendToTeam ? (
        <button
          type="button"
          className="amc-link"
          disabled={council.sampleActive}
          title={council.sampleActive ? 'Not available while sample content is showing' : undefined}
          onClick={() => setSending(true)}
        >
          <i className="bi bi-send" aria-hidden="true" />
          Send to team
        </button>
      ) : null}
      {sending ? (
        <OrgSendToTeamModal
          onClose={() => setSending(false)}
          attachment={{
            kind: 'chart',
            ref: JSON.stringify({ ticker: asset.ticker, page: '/alternative-markets' }),
            label: `${asset.name} (${asset.ticker}) on Alternative Markets`,
            meta: { ticker: asset.ticker, note: 'Illustrative figures' },
          }}
        />
      ) : null}
    </div>
  );
}
