'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VisuallyHidden } from '@/components/ds';
import { PITCH_CIRCUIT } from '@/lib/competitions/pitch-circuit';
import {
  NA,
  admissionLabel,
  circuitDeadlinesOf,
  eventDeadline,
  fmtDate,
  fmtRank,
  fmtSignedPct,
  fmtTime,
  fmtWindow,
  formatLabel,
  fundRowsOf,
  kpisOf,
  nextMilestoneOf,
  obligationsOf,
  openFundChallenges,
  pageTabOf,
  placementOf,
  publicStandings,
  stageOf,
  toneOf,
  trophyTally,
} from '@/lib/org-competitions-model';
import { useCompetitionsData } from './useCompetitionsData';
import { ConfirmDialog, NewCompetitionDialog, SampleJoinDialog } from './Dialogs';
import '@/components/org/command-center/command-center.css';
import './landing.css';
import '@/styles/home-canvas.css';

const CIRCUIT_HREF = '/org-competitions/circuit';
const RANKINGS_HREF = '/council-rankings';
const COUNCIL_HREF = '/org-competitions/council';
const workspaceHref = (slug) => `/org-competitions/${slug}`;

const Skel = ({ w, h = 12 }) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

function Kpi({ icon, label, loading, na, children }) {
  return (
    <div className="tcc-kpi" role="listitem">
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${na ? ' tcc-na' : ''}`}>
        {loading ? <Skel w={56} h={16} /> : children}
      </span>
    </div>
  );
}

function Section({ id, title, count, aside, children, className = '' }) {
  return (
    <section className={`ocp-section ${className}`} aria-labelledby={id}>
      <div className="tcc-head">
        <h2 className="ocp-title" id={id}>
          {title}
          {count != null && <span className="ocp-count tcc-mono">{count}</span>}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function SkelRows({ rows = 3 }) {
  return (
    <div className="ocp-skel" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} className="ocp-skel__row">
          <Skel w={`${46 - (i % 3) * 6}%`} />
          <Skel w="16%" />
          <Skel w="12%" />
        </span>
      ))}
    </div>
  );
}

function Empty({ children, action }) {
  return (
    <p className="tcc-state ocp-state">
      <span>{children}</span>
      {action}
    </p>
  );
}

function Failed({ what, onRetry }) {
  return (
    <p className="tcc-state tcc-state--error ocp-state" role="alert">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      <span>Could not load {what}.</span>
      <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onRetry}>
        Retry
      </button>
    </p>
  );
}

function Stage({ status }) {
  const s = stageOf(status);
  return (
    <span className="ocp-stage">
      <i className={`bi ${s.icon}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

/* ── Pitch competitions tab ─────────────────────────────────────────────── */

function Obligations({ items, loading, failed, onRetry }) {
  return (
    <Section id="ocp-obligations" title="Current obligations">
      {failed ? (
        <Failed what="obligations" onRetry={onRetry} />
      ) : loading ? (
        <SkelRows />
      ) : !items.length ? (
        <Empty
          action={
            <a className="tcc-link" href="#ocp-open">
              Browse open competitions
            </a>
          }
        >
          Nothing is due right now.
        </Empty>
      ) : (
        <ul className="tcc-rows ocp-oblig">
          {items.map((o) => (
            <li key={o.key}>
              <Link href={workspaceHref(o.slug)} className="tcc-rowlink ocp-oblig__row">
                <i className={`bi ${o.icon} ocp-oblig__icon`} aria-hidden="true" />
                <span className="ocp-oblig__main">
                  <span className="ocp-oblig__name">{o.competition}</span>
                  <span className="ocp-oblig__sub">{o.title}</span>
                </span>
                <span className="ocp-oblig__when tcc-mono">
                  <span className={o.due ? '' : 'tcc-na'}>{fmtDate(o.due)}</span>
                  {o.time && o.due && <span className="ocp-oblig__time">{fmtTime(o.due)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function EnteredTable({ rows, nowIso, loading, failed, onRetry }) {
  return (
    <Section
      id="ocp-entered"
      title="Entered competitions"
      count={loading || failed ? null : rows.length}
    >
      {failed ? (
        <Failed what="entered competitions" onRetry={onRetry} />
      ) : loading ? (
        <SkelRows />
      ) : !rows.length ? (
        <Empty
          action={
            <a className="tcc-link" href="#ocp-open">
              Browse open competitions
            </a>
          }
        >
          Your council has not entered a competition.
        </Empty>
      ) : (
        <table className="ocp-table ocp-table--entered">
          <thead>
            <tr>
              <th scope="col">Competition</th>
              <th scope="col">Stage</th>
              <th scope="col" className="ocp-num">
                Next deadline
              </th>
              <th scope="col" className="ocp-num">
                Placement
              </th>
              <th scope="col" className="ocp-col-format">
                Format
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const due = eventDeadline(e, nowIso);
              const place = placementOf(e);
              return (
                <tr key={e.id}>
                  <td className="ocp-name">
                    <Link href={workspaceHref(e.slug)} className="tcc-rowlink" title={e.name}>
                      {e.name}
                    </Link>
                  </td>
                  <td>
                    <Stage status={e.status} />
                  </td>
                  <td className={`ocp-num tcc-mono${due ? '' : ' tcc-na'}`}>{fmtDate(due)}</td>
                  <td className={`ocp-num tcc-mono${place ? '' : ' tcc-na'}`}>
                    {place ? fmtRank(place) : NA}
                  </td>
                  <td className="ocp-col-format ocp-muted">{formatLabel(e.format)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Section>
  );
}

function joinVerb(mode) {
  if (mode === 'open_signup') return 'Join';
  if (mode === 'application') return 'Apply';
  return 'Request';
}

function OpenTable({ rows, sample, loading, failed, onRetry, onSampleJoin }) {
  return (
    <Section id="ocp-open" title="Open to join" count={loading || failed ? null : rows.length}>
      {failed ? (
        <Failed what="open competitions" onRetry={onRetry} />
      ) : loading ? (
        <SkelRows />
      ) : !rows.length ? (
        <Empty
          action={
            <Link className="tcc-link" href={CIRCUIT_HREF}>
              View pitch circuit
            </Link>
          }
        >
          No competitions are open to join.
        </Empty>
      ) : (
        <table className="ocp-table ocp-table--open">
          <thead>
            <tr>
              <th scope="col">Competition</th>
              <th scope="col">Registration window</th>
              <th scope="col" className="ocp-col-admission">
                Admission
              </th>
              <th scope="col" className="ocp-col-format">
                Format
              </th>
              <th scope="col" className="ocp-num">
                <VisuallyHidden>Action</VisuallyHidden>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const mode = e.config?.admission_mode;
              const closed = mode === 'invite_only';
              return (
                <tr key={e.id}>
                  <td className="ocp-name" title={e.name}>
                    {e.name}
                  </td>
                  <td className="tcc-mono ocp-muted">
                    {fmtWindow(e.config?.registration_opens_at, e.config?.registration_closes_at)}
                  </td>
                  <td className="ocp-col-admission">{admissionLabel(mode)}</td>
                  <td className="ocp-col-format ocp-muted">{formatLabel(e.format)}</td>
                  <td className="ocp-num">
                    {e.requested ? (
                      <span className="ocp-muted">Requested</span>
                    ) : closed ? (
                      <span className="ocp-muted">Invite only</span>
                    ) : sample ? (
                      <button
                        type="button"
                        className="tcc-textbtn tcc-textbtn--accent"
                        onClick={() => onSampleJoin(e)}
                        aria-label={`${joinVerb(mode)}: ${e.name}`}
                      >
                        {joinVerb(mode)}
                      </button>
                    ) : (
                      <Link
                        className="tcc-link"
                        href={`${workspaceHref(e.slug)}/join`}
                        aria-label={`${joinVerb(mode)}: ${e.name}`}
                      >
                        {joinVerb(mode)}
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Section>
  );
}

function HostingTable({ rows, nowIso, canManage, loading, failed, onRetry, onNew }) {
  return (
    <Section id="ocp-hosting" title="Hosting" count={loading || failed ? null : rows.length}>
      {failed ? (
        <Failed what="hosted competitions" onRetry={onRetry} />
      ) : loading ? (
        <SkelRows rows={2} />
      ) : !rows.length ? (
        <Empty
          action={
            canManage ? (
              <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onNew}>
                New competition
              </button>
            ) : null
          }
        >
          Your council is not hosting an event.
        </Empty>
      ) : (
        <table className="ocp-table ocp-table--hosting">
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Stage</th>
              <th scope="col">Readiness</th>
              <th scope="col">Next milestone</th>
              <th scope="col" className="ocp-col-format">
                Format
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => {
              const r = h.readiness;
              const m = nextMilestoneOf(h, nowIso);
              return (
                <tr key={h.id}>
                  <td className="ocp-name">
                    <Link href={workspaceHref(h.slug)} className="tcc-rowlink" title={h.name}>
                      {h.name}
                    </Link>
                  </td>
                  <td>
                    <Stage status={h.status} />
                  </td>
                  <td>
                    <span className={`ocp-ready${r.allMet ? ' is-met' : ''}`}>
                      <i
                        className={`bi ${r.allMet ? 'bi-check-circle' : 'bi-exclamation-circle'}`}
                        aria-hidden="true"
                      />
                      <span className="tcc-mono">
                        {r.met} of {r.total}
                      </span>{' '}
                      ready
                    </span>
                  </td>
                  <td className="ocp-milestone">
                    {m ? (
                      <>
                        {m.label}
                        {m.date && <span className="tcc-mono ocp-muted"> {fmtDate(m.date)}</span>}
                      </>
                    ) : (
                      <span className="tcc-na">{NA}</span>
                    )}
                  </td>
                  <td className="ocp-col-format ocp-muted">
                    {formatLabel(h.format)}
                    {h.counts?.teams ? (
                      <span className="tcc-mono">, {h.counts.teams} teams</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Section>
  );
}

function CircuitDeadlines({ items }) {
  return (
    <Section id="ocp-circuit" title="Circuit deadlines" className="ocp-rail__section">
      <p className="ocp-sub">External pitch circuit events</p>
      {!items.length ? (
        <Empty
          action={
            <Link className="tcc-link" href={CIRCUIT_HREF}>
              View pitch circuit
            </Link>
          }
        >
          No upcoming circuit dates.
        </Empty>
      ) : (
        <>
          <ol className="ocp-timeline">
            {items.map((d, i) => (
              <li key={d.key} className={i === 0 ? 'is-next' : ''}>
                <i
                  className={`bi ${i === 0 ? 'bi-circle-fill' : 'bi-circle'}`}
                  aria-hidden="true"
                />
                <Link href={`${CIRCUIT_HREF}/${d.slug}`} className="tcc-rowlink ocp-timeline__body">
                  <span className="tcc-mono ocp-timeline__date">{fmtDate(d.date)}</span>
                  <span className="ocp-timeline__what">
                    {d.name}, {d.label.charAt(0).toLowerCase() + d.label.slice(1)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <Link className="tcc-link ocp-more" href={CIRCUIT_HREF}>
            Pitch circuit <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </>
      )}
    </Section>
  );
}

/** The fund challenges the council entered: the Fund Analytics block's columns. */
function FundStandingTable({ rows, compact, open, onToggle }) {
  return (
    <table className={`ocp-table ocp-table--fund${compact ? ' is-compact' : ''}`}>
      <thead>
        <tr>
          <th scope="col">Challenge</th>
          <th scope="col" className="ocp-num">
            {compact ? 'Rank' : 'Competition rank'}
          </th>
          <th scope="col" className="ocp-num">
            {compact ? 'Return' : 'Return since entry'}
          </th>
          <th scope="col" className="ocp-num ocp-col-field">
            {compact ? 'Councils' : 'Councils entered'}
          </th>
          <th scope="col" className="ocp-num ocp-col-ends">
            Ends
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="ocp-name" title={r.name}>
              {onToggle ? (
                <button
                  type="button"
                  className={`tcc-textbtn ocp-rowbtn${open === r.id ? ' is-on' : ''}`}
                  aria-expanded={open === r.id}
                  onClick={() => onToggle(r.id)}
                >
                  <i
                    className={`bi ${open === r.id ? 'bi-chevron-down' : 'bi-chevron-right'}`}
                    aria-hidden="true"
                  />
                  {r.name}
                </button>
              ) : (
                r.name
              )}
            </td>
            <td className={`ocp-num tcc-mono${r.rank == null ? ' tcc-na' : ''}`}>
              {fmtRank(r.rank, r.field)}
            </td>
            <td className={`ocp-num tcc-mono tcc-${toneOf(r.return_pct)}`}>
              {fmtSignedPct(r.return_pct)}
            </td>
            <td className={`ocp-num tcc-mono ocp-col-field${r.field == null ? ' tcc-na' : ''}`}>
              {r.field ?? NA}
            </td>
            <td className={`ocp-num tcc-mono ocp-col-ends${r.ends_at ? '' : ' tcc-na'}`}>
              {fmtDate(r.ends_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FundRail({ rows, loading, failed, onRetry, onOpenFund }) {
  return (
    <Section id="ocp-fundrail" title="Fund challenges standing" className="ocp-rail__section">
      {failed ? (
        <Failed what="fund challenges" onRetry={onRetry} />
      ) : loading ? (
        <SkelRows rows={2} />
      ) : !rows.length ? (
        <Empty
          action={
            <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onOpenFund}>
              Browse fund challenges
            </button>
          }
        >
          Your council has not entered a fund challenge.
        </Empty>
      ) : (
        <>
          <p className="ocp-sub">
            <span className="tcc-mono">{rows.length}</span> entered, ranked by return since entry
          </p>
          <FundStandingTable rows={rows} compact />
        </>
      )}
    </Section>
  );
}

function Trophies({ tally, loading, failed, onRetry }) {
  const none = tally.every((t) => !t.members);
  return (
    <Section id="ocp-trophies" title="Member trophies this season" className="ocp-rail__section">
      {failed ? (
        <Failed what="trophies" onRetry={onRetry} />
      ) : loading ? (
        <SkelRows rows={3} />
      ) : none ? (
        <Empty>No trophies this season.</Empty>
      ) : (
        <dl className="tcc-pairs">
          {tally.map((t) => (
            <div className="tcc-pair" key={t.key}>
              <dt>
                <i className={`bi ${t.icon}${t.gold ? ' ocp-gold' : ''}`} aria-hidden="true" />
                {t.label}
              </dt>
              <dd className={`tcc-mono${t.members ? '' : ' tcc-na'}`}>
                {t.members} {t.members === 1 ? 'member' : 'members'}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  );
}

/* ── Fund challenges tab ───────────────────────────────────────────────── */

function FundTab({ data, loading, failed, onRetry, sample, onEnter }) {
  const [open, setOpen] = useState(null);
  const rows = fundRowsOf(data.fund.competitions, data.fund.boards);
  const available = openFundChallenges(data.fund.competitions);
  const board = open ? publicStandings(data.fund.boards[open] || []) : [];
  const openRow = rows.find((r) => r.id === open);

  return (
    <div className="ocp-fund">
      <Section
        id="ocp-fund-entered"
        title="Entered fund challenges"
        count={loading || failed ? null : rows.length}
      >
        <p className="ocp-sub">
          Councils are ranked by the return on their own fund since they entered. Recalculated each
          weekday evening.
        </p>
        {failed ? (
          <Failed what="fund challenges" onRetry={onRetry} />
        ) : loading ? (
          <SkelRows rows={2} />
        ) : !rows.length ? (
          <Empty>Your council has not entered a fund challenge.</Empty>
        ) : (
          <>
            <FundStandingTable
              rows={rows}
              open={open}
              onToggle={(id) => setOpen(open === id ? null : id)}
            />
            {openRow && (
              <div className="ocp-board" aria-live="polite">
                <h3 className="ocp-subtitle">{openRow.name}: standings</h3>
                {!board.length ? (
                  <Empty>No standings yet.</Empty>
                ) : (
                  <table className="ocp-table ocp-table--board">
                    <thead>
                      <tr>
                        <th scope="col" className="ocp-num">
                          Rank
                        </th>
                        <th scope="col">Council</th>
                        <th scope="col" className="ocp-num">
                          Return since entry
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.map((b) => (
                        <tr key={b.org_id} className={b.isMine ? 'is-mine' : ''}>
                          <td className="ocp-num tcc-mono">{b.rank ?? NA}</td>
                          <td className="ocp-name">
                            {b.university}
                            {b.isMine && <span className="ocp-you"> Your council</span>}
                          </td>
                          <td className={`ocp-num tcc-mono tcc-${toneOf(b.return_pct)}`}>
                            {fmtSignedPct(b.return_pct)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </Section>

      <Section
        id="ocp-fund-open"
        title="Open to enter"
        count={loading || failed ? null : available.length}
      >
        {failed ? null : loading ? (
          <SkelRows rows={1} />
        ) : !available.length ? (
          <Empty>No fund challenge is open to enter.</Empty>
        ) : (
          <table className="ocp-table ocp-table--fundopen">
            <thead>
              <tr>
                <th scope="col">Challenge</th>
                <th scope="col" className="ocp-num">
                  Started
                </th>
                <th scope="col" className="ocp-num">
                  Ends
                </th>
                <th scope="col" className="ocp-num">
                  <VisuallyHidden>Action</VisuallyHidden>
                </th>
              </tr>
            </thead>
            <tbody>
              {available.map((c) => (
                <tr key={c.id}>
                  <td className="ocp-name" title={c.name}>
                    {c.name}
                  </td>
                  <td className="ocp-num tcc-mono">{fmtDate(c.starts_at)}</td>
                  <td className="ocp-num tcc-mono">{fmtDate(c.ends_at)}</td>
                  <td className="ocp-num">
                    {data.fund.canEnter ? (
                      <button
                        type="button"
                        className="tcc-textbtn tcc-textbtn--accent"
                        onClick={() => onEnter(c)}
                        aria-label={`Enter ${c.name}`}
                      >
                        Enter
                      </button>
                    ) : (
                      <span className="ocp-muted">Managers enter</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <p className="ocp-foot">
        The council rating blends pitch results and fund results across every council.{' '}
        <Link className="tcc-link" href={RANKINGS_HREF}>
          Council Rankings
        </Link>{' '}
        <span aria-hidden="true">·</span>{' '}
        <Link className="tcc-link" href={COUNCIL_HREF}>
          Council rating and fund ratios
        </Link>
        {sample && <span className="ocp-muted"> Sample content is not saved.</span>}
      </p>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function CompetitionsPage({ initialData, sampleViewer, initialTab, todayIso }) {
  const router = useRouter();
  const data = useCompetitionsData({ initialData, sampleViewer });
  const { state, sampleActive } = data;
  const [tab, setTab] = useState(pageTabOf(initialTab));
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState('');

  const loading = state.status === 'loading' && !state.data;
  const failedAll = state.status === 'error';
  const d = state.data || {
    viewer: {},
    entered: [],
    hosted: [],
    joinable: [],
    fund: { competitions: [], boards: {} },
    badges: [],
    errors: {},
  };
  const err = failedAll
    ? { entered: true, hosted: true, joinable: true, fund: true, trophies: true }
    : d.errors || {};
  const nowIso = useMemo(() => `${todayIso}T12:00:00`, [todayIso]);

  const obligations = useMemo(
    () => obligationsOf(d.entered, new Date().toISOString()),
    [d.entered],
  );
  const fundRows = useMemo(() => fundRowsOf(d.fund.competitions, d.fund.boards), [d.fund]);
  const kpis = kpisOf(
    { entered: d.entered, hosted: d.hosted, joinable: d.joinable, fund: fundRows, obligations },
    new Date().toISOString(),
  );
  const tally = useMemo(() => trophyTally(d.badges, nowIso), [d.badges, nowIso]);
  const circuit = useMemo(() => circuitDeadlinesOf(PITCH_CIRCUIT, todayIso), [todayIso]);
  const canManage = Boolean(d.viewer?.canManage);

  const chooseTab = (next) => {
    setTab(next);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (next === 'fund') url.searchParams.set('tab', 'fund');
      else url.searchParams.delete('tab');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  if (state.status === 'forbidden') {
    return (
      <div className="dashboard-page-inset ez-canvas tcc-page ocp-page">
        <VisuallyHidden>
          <h1>Competitions</h1>
        </VisuallyHidden>
        <p className="tcc-state">This page is for organizational members only.</p>
      </div>
    );
  }

  const say = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page ocp-page">
      <VisuallyHidden>
        <h1>Competitions</h1>
      </VisuallyHidden>

      <div className="tcc-top">
        <div className="tcc-kpis" aria-busy={loading || undefined}>
          <div className="tcc-kpistrip ocp-kpistrip" role="list" aria-label="Competition figures">
            <Kpi icon="bi-flag" label="Entered" loading={loading} na={err.entered}>
              {err.entered ? NA : kpis.entered}
            </Kpi>
            <Kpi icon="bi-bank" label="Hosting" loading={loading} na={err.hosted}>
              {err.hosted ? NA : kpis.hosting}
            </Kpi>
            <Kpi icon="bi-door-open" label="Open to join" loading={loading} na={err.joinable}>
              {err.joinable ? NA : kpis.joinable}
            </Kpi>
            <Kpi
              icon="bi-calendar-event"
              label="Next deadline"
              loading={loading}
              na={err.entered || !kpis.nextDeadline}
            >
              {err.entered ? NA : fmtDate(kpis.nextDeadline)}
            </Kpi>
            <Kpi icon="bi-graph-up" label="Fund challenges" loading={loading} na={err.fund}>
              {err.fund ? NA : kpis.fund}
            </Kpi>
          </div>
        </div>
        <div className="tcc-actions">
          {(sampleActive || data.sampleAvailable) && (
            <div className="tcc-actions__context">
              {sampleActive && <span className="tcc-sample">Sample content</span>}
              {data.sampleAvailable && (
                <button
                  type="button"
                  className="tcc-textbtn"
                  onClick={() => data.setShowSample(!sampleActive)}
                >
                  {sampleActive ? 'Show council data' : 'Show sample content'}
                </button>
              )}
            </div>
          )}
          <Link href={RANKINGS_HREF} className="tcc-textbtn">
            <i className="bi bi-bar-chart-steps" aria-hidden="true" />
            Council Rankings
          </Link>
          <Link href={CIRCUIT_HREF} className="tcc-textbtn">
            <i className="bi bi-signpost-split" aria-hidden="true" />
            Pitch circuit
          </Link>
          {canManage && (
            <button type="button" className="tcc-btn" onClick={() => setDialog({ kind: 'new' })}>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              New competition
            </button>
          )}
        </div>
      </div>

      <div className="ocp-tabs" role="tablist" aria-label="Competition kind">
        {[
          ['pitch', 'Pitch competitions'],
          ['fund', 'Fund challenges'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`ocp-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`ocp-panel-${key}`}
            className={`ocp-tab${tab === key ? ' is-on' : ''}`}
            onClick={() => chooseTab(key)}
          >
            {label}
          </button>
        ))}
        {notice && (
          <span className="ocp-notice" role="status">
            {notice}
          </span>
        )}
      </div>

      {tab === 'pitch' ? (
        <div
          className="ocp-body"
          role="tabpanel"
          id="ocp-panel-pitch"
          aria-labelledby="ocp-tab-pitch"
        >
          <div className="ocp-main">
            <Obligations
              items={obligations}
              loading={loading}
              failed={err.entered}
              onRetry={data.retry}
            />
            <EnteredTable
              rows={d.entered}
              nowIso={new Date().toISOString()}
              loading={loading}
              failed={err.entered}
              onRetry={data.retry}
            />
            <OpenTable
              rows={d.joinable}
              sample={sampleActive}
              loading={loading}
              failed={err.joinable}
              onRetry={data.retry}
              onSampleJoin={(e) => setDialog({ kind: 'join', event: e })}
            />
            <HostingTable
              rows={d.hosted}
              nowIso={new Date().toISOString()}
              canManage={canManage}
              loading={loading}
              failed={err.hosted}
              onRetry={data.retry}
              onNew={() => setDialog({ kind: 'new' })}
            />
          </div>
          <span className="tcc-vrule ocp-vrule" aria-hidden="true" />
          <aside className="ocp-rail" aria-label="Circuit, fund challenges and trophies">
            <CircuitDeadlines items={circuit} />
            <FundRail
              rows={fundRows}
              loading={loading}
              failed={err.fund}
              onRetry={data.retry}
              onOpenFund={() => chooseTab('fund')}
            />
            <Trophies tally={tally} loading={loading} failed={err.trophies} onRetry={data.retry} />
          </aside>
        </div>
      ) : (
        <div role="tabpanel" id="ocp-panel-fund" aria-labelledby="ocp-tab-fund">
          <FundTab
            data={d}
            loading={loading}
            failed={err.fund}
            onRetry={data.retry}
            sample={sampleActive}
            onEnter={(c) => setDialog({ kind: 'enter', challenge: c })}
          />
        </div>
      )}

      {dialog?.kind === 'new' && (
        <NewCompetitionDialog
          sample={sampleActive}
          onClose={() => setDialog(null)}
          onSubmit={async (form) => {
            const res = await data.act({ type: 'create', form });
            if (res.ok) {
              setDialog(null);
              if (res.slug) router.push(workspaceHref(res.slug));
              else say('Competition added to the page.');
            }
            return res;
          }}
        />
      )}
      {dialog?.kind === 'join' && (
        <SampleJoinDialog
          event={dialog.event}
          onClose={() => setDialog(null)}
          onSubmit={async () => {
            await data.act({ type: 'join', id: dialog.event.id });
            setDialog(null);
            say('Request added to the page.');
          }}
        />
      )}
      {dialog?.kind === 'enter' && (
        <ConfirmDialog
          title="Enter fund challenge?"
          confirmLabel="Enter council"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            const res = await data.act({ type: 'enter_fund', id: dialog.challenge.id });
            if (res.ok) {
              setDialog(null);
              say(`Entered ${dialog.challenge.name}.`);
            }
            return res;
          }}
        >
          Enter the council in {dialog.challenge.name}? Its return is measured from the fund&apos;s
          value on the later of the start date and today, and its rank shows once a starting value
          is recorded.
          {sampleActive && ' Sample content is showing, so this is applied to the page only.'}
        </ConfirmDialog>
      )}
    </div>
  );
}
