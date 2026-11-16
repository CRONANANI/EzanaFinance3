'use client';

/**
 * Pitch Pipeline (/org-team-hub/pitches): where a council turns a stock idea
 * into a committee decision. An analyst sees where their pitches stand and
 * what each still needs. A portfolio manager sees what waits on their
 * sign-off, review or ballot. An executive runs the committee: the agenda,
 * the session and the vote.
 *
 * One layout for every role. What a member is offered follows the server's
 * rules (lib/pitch/rules.js); the server checks every request again. While a
 * blind vote is open nothing on this page reads as a vote: only the number
 * of ballots received, and the member's own ballot.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import {
  NA,
  WORKING_STAGES,
  END_STAGES,
  agendaOf,
  agingByDesk,
  analystRecord,
  approvedReady,
  awaitingQueue,
  cleanStage,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtPct,
  fmtShortDate,
  kpisOf,
  reviewsDue,
  rowStatus,
  rowsForStage,
  stageCounts,
  stageName,
  toneOf,
} from '@/lib/org-pitch-pipeline-model';
import {
  ArrowLink,
  Empty,
  Section,
  SectionError,
  Skel,
  TextToggle,
} from '@/components/org/command-center/parts';
import { usePipelineData } from './usePipelineData';
import { PitchDialog } from './PitchDialog';
import { SubmitPitchDialog } from './SubmitPitchDialog';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import '@/components/org/command-center/command-center.css';
import './pitch-pipeline.css';
import '@/styles/home-canvas.css';

function Kpi({ icon, label, loading, tone, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem" title={title}>
      <i className={`bi ${icon} tcc-kpi__icon${tone ? ` tcc-${tone}` : ''}`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${tone ? ` tcc-${tone}` : ''}`}>
        {loading ? <Skel w={48} h={16} /> : children}
      </span>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas tcc-page opp-page">
      <VisuallyHidden>
        <h1>Pitch pipeline</h1>
      </VisuallyHidden>
      <p className="tcc-state" role="status">
        {children}
      </p>
    </div>
  );
}

/** Keep the chosen stage and the open pitch in the page address. */
function writeAddress({ stage, pitchId }) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  set('stage', stage || null);
  set('pitch', pitchId || null);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    try {
      window.history.replaceState(window.history.state, '', next);
    } catch {
      /* The address could not be updated; the page itself is unaffected. */
    }
  }
}

/* The table's short form of who moves a pitch on; the full words are the title. */
function shortOwner(label) {
  if (!label) return NA;
  return label
    .replace('Investment committee', 'Committee')
    .replace('Vice president or president', 'VP or president')
    .replace(' or executive', ' or exec');
}

function PitchCell({ p, onOpen }) {
  return (
    <td role="rowheader" className="opp-pitchcell">
      <button type="button" className="opp-open" onClick={() => onOpen(p)}>
        <span className="tcc-ticker tcc-mono">{p.ticker}</span>
        <span className="opp-sub">{p.company_name || NA}</span>
      </button>
    </td>
  );
}

function GateCell({ p }) {
  const g = p.gate;
  if (!g || !g.total) return <td className="opp-num tcc-na">{NA}</td>;
  return (
    <td className="opp-num tcc-mono" title={`${g.passed} of ${g.total} gates passed`}>
      {g.passed} of {g.total}
    </td>
  );
}

function StatusCell({ p }) {
  const s = rowStatus(p);
  if (!s) return <td className="tcc-na">{NA}</td>;
  return (
    <td>
      <span className={`opp-status tcc-${s.tone}`}>
        <i className={`bi ${s.icon}`} aria-hidden="true" />
        {s.label}
      </span>
    </td>
  );
}

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="opp-skel" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i}>
          <Skel w="100%" h={16} />
        </span>
      ))}
    </div>
  );
}

function AwaitingTable({ queue, onOpen }) {
  return (
    <div className="opp-scroll">
      <table className="opp-table">
        <thead>
          <tr>
            <th scope="col">Pitch</th>
            <th scope="col">Stage</th>
            <th scope="col" className="opp-num">
              Gates
            </th>
            <th scope="col">Your next step</th>
            <th scope="col" className="opp-num">
              Days
            </th>
          </tr>
        </thead>
        <tbody>
          {queue.map(({ pitch: p, reasons }) => (
            <tr key={p.id} onClick={() => onOpen(p, reasons[0]?.tab)}>
              <PitchCell p={p} onOpen={(x) => onOpen(x, reasons[0]?.tab)} />
              <td>{stageName(p.stage)}</td>
              <GateCell p={p} />
              <td>
                <span className="opp-step">
                  <i className={`bi ${reasons[0].icon}`} aria-hidden="true" />
                  {reasons[0].label}
                  {reasons.length > 1 && (
                    <span className="opp-more tcc-mono">+{reasons.length - 1}</span>
                  )}
                </span>
              </td>
              <td className={`opp-num tcc-mono${p.is_aging ? ' tcc-warn' : ''}`}>
                {p.days_in_stage ?? NA}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PitchTable({ rows, onOpen }) {
  return (
    <div className="opp-scroll">
      <table className="opp-table opp-table--wide">
        <thead>
          <tr>
            <th scope="col">Pitch</th>
            <th scope="col">Analyst</th>
            <th scope="col">Stage</th>
            <th scope="col" className="opp-num">
              Gates
            </th>
            <th scope="col">Next owner</th>
            <th scope="col" className="opp-num">
              Days
            </th>
            <th
              scope="col"
              className="opp-num"
              title="An estimate: the target price over the current price"
            >
              Upside
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} onClick={() => onOpen(p)}>
              <PitchCell p={p} onOpen={onOpen} />
              <td>
                <span className="opp-two">
                  <span>{p.analyst_name || NA}</span>
                  <span className="opp-sub">{p.team_name || 'No desk'}</span>
                </span>
              </td>
              <td>{stageName(p.stage)}</td>
              <GateCell p={p} />
              <td className={p.next_owner ? '' : 'tcc-na'} title={p.next_owner || undefined}>
                {shortOwner(p.next_owner)}
              </td>
              <td className={`opp-num tcc-mono${p.is_aging ? ' tcc-warn' : ''}`}>
                {p.status === 'active' ? p.days_in_stage : NA}
              </td>
              <td
                className={`opp-num tcc-mono${p.upside_pct == null ? ' tcc-na' : ''}`}
                title={p.target_price != null ? `Target ${fmtMoney(p.target_price)}` : undefined}
              >
                {fmtPct(p.upside_pct)}
              </td>
              <StatusCell p={p} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PitchPipelinePage({
  initialData = null,
  sampleViewer = false,
  initialStage = null,
  initialPitch = null,
}) {
  const { isOrgUser, isLoading } = useOrg();
  const enabled = Boolean(initialData) || Boolean(isOrgUser && !isLoading);
  const data = usePipelineData({ enabled, initialData, sampleViewer });
  const { board, sampleActive, act } = data;

  const [stage, setStage] = useState(() => cleanStage(initialStage));
  const [open, setOpen] = useState(() => (initialPitch ? { id: initialPitch, tab: null } : null));
  const [query, setQuery] = useState('');
  const [agingOnly, setAgingOnly] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    writeAddress({ stage, pitchId: open?.id });
  }, [stage, open?.id]);

  const toggleSample = () => {
    setNotice(null);
    setOpen(null);
    setSubmitOpen(false);
    data.setShowSample((v) => !v);
  };

  const d = board.data;
  const viewer = useMemo(() => d?.viewer || { role: 'analyst' }, [d]);
  const all = useMemo(() => d?.pitches || [], [d]);
  const counts = useMemo(() => stageCounts(all), [all]);
  const kpis = useMemo(() => kpisOf(all), [all]);
  const inStage = useMemo(() => rowsForStage(all, stage), [all, stage]);
  const queue = useMemo(() => awaitingQueue(inStage, viewer), [inStage, viewer]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inStage.filter((p) => {
      if (agingOnly && !p.is_aging) return false;
      if (!q) return true;
      return [p.ticker, p.company_name, p.analyst_name, p.team_name]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });
  }, [inStage, query, agingOnly]);
  const agenda = useMemo(() => agendaOf(all, d?.meetings || []), [all, d]);
  const aging = useMemo(() => agingByDesk(all), [all]);
  const reviews = useMemo(() => reviewsDue(all), [all]);
  const ready = useMemo(() => approvedReady(all), [all]);
  const record = useMemo(() => analystRecord(all, d?.members || [], d?.votes_cast || {}), [all, d]);

  const openPitch = useCallback((p, tab = null) => setOpen({ id: p.id, tab }), []);

  if (!initialData && isLoading) {
    return (
      <Notice>
        {slow ? (
          <>
            <span>The pitch pipeline is taking longer than expected to load.</span>
            <button type="button" className="tcc-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : (
          <span>Loading the pitch pipeline</span>
        )}
      </Notice>
    );
  }
  if ((!initialData && !isOrgUser) || board.status === 'forbidden') {
    return (
      <Notice>
        <span>This page is for organizational members only.</span>
        <Link href="/home" className="tcc-link">
          Go to home <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </Notice>
    );
  }

  const loading = board.status === 'loading';
  const failed = board.status === 'error';
  const num = (v) => (failed ? NA : String(v));
  const openRow = open ? all.find((p) => p.id === open.id) || null : null;
  const manager = Boolean(viewer.is_manager);
  const stageTitle = stage ? stageName(stage) : 'All active pitches';

  const onActed = (text) =>
    setNotice({
      tone: 'ok',
      text: sampleActive ? `${text} Sample content: this is not saved.` : text,
    });

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page opp-page">
      <VisuallyHidden>
        <h1>Pitch pipeline</h1>
      </VisuallyHidden>

      {/* Row 1: the four figures and the page actions */}
      <div className="tcc-top opp-top">
        <div className="tcc-kpis" aria-busy={loading || undefined}>
          <div className="tcc-kpistrip" role="list" aria-label="Pipeline figures">
            <Kpi
              icon="bi-lightning-charge"
              label="Active pitches"
              loading={loading}
              tone={failed ? 'na' : undefined}
              title="Pitches still moving through the stages"
            >
              {num(kpis.active)}
            </Kpi>
            <Kpi
              icon="bi-briefcase"
              label="In portfolio"
              loading={loading}
              tone={failed ? 'na' : undefined}
              title="Approved pitches whose position is on the book"
            >
              {num(kpis.in_portfolio)}
            </Kpi>
            <Kpi
              icon="bi-hourglass-split"
              label="Aging over 30 days"
              loading={loading}
              tone={failed ? 'na' : kpis.aging > 0 ? 'warn' : undefined}
              title="Active pitches that have been in their stage for more than 30 days"
            >
              {num(kpis.aging)}
            </Kpi>
            <Kpi
              icon="bi-archive"
              label="Archived"
              loading={loading}
              tone={failed ? 'na' : undefined}
              title="Rejected and exited pitches"
            >
              {num(kpis.archived)}
            </Kpi>
          </div>
        </div>

        <div className="tcc-actions opp-actions">
          {(sampleActive || data.sampleAvailable) && (
            <div className="tcc-actions__context">
              {sampleActive && <span className="tcc-sample">Sample content</span>}
              {data.sampleAvailable && (
                <button type="button" className="tcc-textbtn opp-action" onClick={toggleSample}>
                  {sampleActive ? 'Show council data' : 'Show sample content'}
                </button>
              )}
            </div>
          )}
          <Link href="/org-team-hub/pitch-archive" className="tcc-textbtn opp-action">
            Pitch archive
          </Link>
          <Link href="/org-team-hub" className="tcc-textbtn opp-action">
            Team Hub
          </Link>
          <button
            type="button"
            className="tcc-btn"
            onClick={() => setSubmitOpen(true)}
            disabled={loading}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Submit new pitch
          </button>
        </div>
      </div>

      {d?.stale && !loading && (
        <p className="opp-notice" role="status">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <span>Current prices are unavailable right now, so upside reads N/A.</span>
        </p>
      )}
      {notice && (
        <p
          className={`opp-notice${notice.tone === 'error' ? ' opp-notice--error' : ''}`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          <i
            className={`bi ${notice.tone === 'error' ? 'bi-exclamation-circle' : 'bi-check2-circle'}`}
            aria-hidden="true"
          />
          <span>{notice.text}</span>
          <button type="button" className="tcc-textbtn opp-action" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </p>
      )}

      {/* Row 2: the stage strip. Choosing a stage narrows both tables. */}
      <nav className="opp-stages" aria-label="Filter by stage">
        <TextToggle pressed={!stage} onClick={() => setStage(null)}>
          All active
          {!loading && !failed && <span className="tcc-mono opp-count">{kpis.active}</span>}
        </TextToggle>
        {WORKING_STAGES.map((s) => (
          <TextToggle
            key={s}
            pressed={stage === s}
            onClick={() => setStage(stage === s ? null : s)}
          >
            {stageName(s)}
            {!loading && !failed && <span className="tcc-mono opp-count">{counts[s]}</span>}
          </TextToggle>
        ))}
        <span className="opp-stages__rule" aria-hidden="true" />
        {END_STAGES.map((s) => (
          <TextToggle
            key={s}
            pressed={stage === s}
            onClick={() => setStage(stage === s ? null : s)}
          >
            {stageName(s)}
            {!loading && !failed && <span className="tcc-mono opp-count">{counts[s]}</span>}
          </TextToggle>
        ))}
      </nav>

      {/* Row 3: the pitches beside the committee, aging, reviews and records */}
      <div className="opp-body">
        <div className="opp-main">
          <Section
            id="opp-awaiting"
            title="Awaiting you"
            aside={
              !loading && !failed ? (
                <span className="opp-aside tcc-mono">{queue.length}</span>
              ) : null
            }
          >
            {loading ? (
              <TableSkeleton rows={4} />
            ) : failed ? (
              <SectionError message="Could not load the pipeline." onRetry={data.retry} />
            ) : queue.length === 0 ? (
              <Empty
                action={stage ? 'Show all stages' : null}
                onAction={stage ? () => setStage(null) : null}
              >
                {stage
                  ? `Nothing at ${stageName(stage).toLowerCase()} waits on you.`
                  : 'Nothing waits on you right now.'}
              </Empty>
            ) : (
              <AwaitingTable queue={queue} onOpen={openPitch} />
            )}
          </Section>

          <Section
            id="opp-all"
            title={stageTitle}
            className="opp-gap"
            aside={
              !loading && !failed ? (
                <span className="opp-aside tcc-mono">{shown.length}</span>
              ) : null
            }
          >
            <div className="opp-filters">
              <label className="opp-search">
                <i className="bi bi-search" aria-hidden="true" />
                <VisuallyHidden>Search pitches</VisuallyHidden>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ticker, company, analyst or desk"
                />
              </label>
              <TextToggle pressed={agingOnly} onClick={() => setAgingOnly((v) => !v)}>
                <i className="bi bi-hourglass-split" aria-hidden="true" />
                Aging only
              </TextToggle>
            </div>
            {loading ? (
              <TableSkeleton rows={7} />
            ) : failed ? (
              <SectionError message="Could not load the pipeline." onRetry={data.retry} />
            ) : all.length === 0 ? (
              <Empty action="Submit new pitch" onAction={() => setSubmitOpen(true)}>
                No pitches yet.
              </Empty>
            ) : shown.length === 0 ? (
              <Empty
                action="Clear filters"
                onAction={() => {
                  setQuery('');
                  setAgingOnly(false);
                  setStage(null);
                }}
              >
                No pitches match.
              </Empty>
            ) : (
              <PitchTable rows={shown} onOpen={openPitch} />
            )}
          </Section>
        </div>

        <span className="tcc-vrule opp-vrule" aria-hidden="true" />

        <aside className="opp-side" aria-label="Committee and records">
          <Section
            id="opp-agenda"
            title="IC agenda"
            aside={
              manager && !loading && !failed ? (
                <button
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent"
                  onClick={() => setScheduleOpen(true)}
                >
                  <i className="bi bi-calendar-plus" aria-hidden="true" />
                  Schedule meeting
                </button>
              ) : null
            }
          >
            {loading ? (
              <TableSkeleton rows={5} />
            ) : failed ? (
              <SectionError message="Could not load the agenda." onRetry={data.retry} />
            ) : !agenda.meeting ? (
              <Empty
                action={manager ? 'Schedule meeting' : null}
                onAction={manager ? () => setScheduleOpen(true) : null}
              >
                No committee meeting is scheduled.
              </Empty>
            ) : (
              <Agenda agenda={agenda} eligible={d.eligible_voters} onOpen={openPitch} />
            )}
          </Section>

          <Section id="opp-aging" title="Aging by desk">
            {loading ? (
              <TableSkeleton rows={3} />
            ) : failed ? (
              <SectionError message="Could not load aging pitches." onRetry={data.retry} />
            ) : aging.length === 0 ? (
              <Empty>No pitch has been in its stage for more than 30 days.</Empty>
            ) : (
              <table className="opp-table opp-table--side">
                <thead>
                  <tr>
                    <th scope="col">Desk</th>
                    <th scope="col" className="opp-num">
                      Aging
                    </th>
                    <th scope="col" className="opp-num">
                      Oldest
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {aging.map((r) => (
                    <tr key={r.desk} className="opp-static">
                      <td>{r.desk}</td>
                      <td className="opp-num tcc-mono">{r.count}</td>
                      <td className="opp-num tcc-mono tcc-warn">{r.oldest}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section id="opp-reviews" title="Thesis reviews">
            {loading ? (
              <TableSkeleton rows={3} />
            ) : failed ? (
              <SectionError message="Could not load reviews." onRetry={data.retry} />
            ) : reviews.length === 0 ? (
              <Empty>No held pitch has a review on the clock.</Empty>
            ) : (
              <ul className="opp-list">
                {reviews.slice(0, 6).map((r) => (
                  <li key={r.pitch.id}>
                    <button
                      type="button"
                      className="opp-open opp-line"
                      onClick={() => openPitch(r.pitch, 'decision')}
                    >
                      <span className="tcc-ticker tcc-mono">{r.pitch.ticker}</span>
                      <span className="opp-sub opp-grow">{r.pitch.company_name}</span>
                      <span className={`tcc-mono${r.overdue ? ' tcc-warn' : ''}`}>
                        {r.overdue && (
                          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                        )}
                        {r.overdue ? 'Due ' : ''}
                        {fmtShortDate(r.due)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="opp-ready" title="Approved, ready for the Trading Desk">
            {loading ? (
              <TableSkeleton rows={2} />
            ) : failed ? (
              <SectionError message="Could not load approved pitches." onRetry={data.retry} />
            ) : ready.length === 0 ? (
              <Empty>No approved pitch is waiting for its position.</Empty>
            ) : (
              <>
                <ul className="opp-list">
                  {ready.map((p) => (
                    <li key={p.id} className="opp-line">
                      <button
                        type="button"
                        className="opp-open opp-line opp-grow"
                        onClick={() => openPitch(p, 'decision')}
                      >
                        <span className="tcc-ticker tcc-mono">{p.ticker}</span>
                        <span className="opp-sub opp-grow">{p.company_name}</span>
                      </button>
                      <ArrowLink href="/org-trading">Open Trading Desk</ArrowLink>
                    </li>
                  ))}
                </ul>
                <p className="opp-note">
                  A pitch moves to In portfolio once a position in its ticker is on the book.
                </p>
              </>
            )}
          </Section>

          <Section id="opp-record" title="Pitch record">
            {loading ? (
              <TableSkeleton rows={5} />
            ) : failed ? (
              <SectionError message="Could not load the record." onRetry={data.retry} />
            ) : record.length === 0 ? (
              <Empty>No pitches on record yet.</Empty>
            ) : (
              <table className="opp-table opp-table--side">
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col" className="opp-num">
                      Pitches
                    </th>
                    <th
                      scope="col"
                      className="opp-num"
                      title="Mean alpha over pitches with a reading"
                    >
                      Alpha
                    </th>
                    <th
                      scope="col"
                      className="opp-num"
                      title="Committee ballots cast. Ballots in a blind vote count once the meeting closes."
                    >
                      Votes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {record.map((r) => (
                    <tr key={r.member_id} className="opp-static">
                      <td>{r.name}</td>
                      <td className="opp-num tcc-mono">{r.pitches}</td>
                      <td className={`opp-num tcc-mono tcc-${toneOf(r.avg_alpha)}`}>
                        {fmtPct(r.avg_alpha)}
                      </td>
                      <td className="opp-num tcc-mono">{r.votes_cast}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </aside>
      </div>

      {open && board.status === 'ready' && (
        <PitchDialog
          key={`${open.id}:${sampleActive ? 's' : 'l'}`}
          id={open.id}
          row={openRow}
          board={d}
          initialTab={open.tab}
          sample={sampleActive}
          act={act}
          loadDetail={data.loadDetail}
          loadPanels={data.loadPanels}
          onClose={() => setOpen(null)}
          onActed={onActed}
        />
      )}

      {submitOpen && (
        <SubmitPitchDialog
          board={d}
          sample={sampleActive}
          act={act}
          onClose={() => setSubmitOpen(false)}
          onCreated={(ticker, newId) => {
            setSubmitOpen(false);
            onActed(`${ticker} was submitted at Idea.`);
            if (newId) setOpen({ id: newId, tab: null });
          }}
        />
      )}

      {scheduleOpen && (
        <ScheduleMeetingDialog
          sample={sampleActive}
          act={act}
          onClose={() => setScheduleOpen(false)}
          onScheduled={(when) => {
            setScheduleOpen(false);
            onActed(`A committee meeting was scheduled for ${when}.`);
          }}
        />
      )}
    </div>
  );
}

function Agenda({ agenda, eligible, onOpen }) {
  const m = agenda.meeting;
  const session = { scheduled: 'Scheduled', in_session: 'In session', closed: 'Closed' };
  return (
    <>
      <dl className="tcc-pairs opp-pairs">
        <div className="tcc-pair">
          <dt>Next meeting</dt>
          <dd className="tcc-mono">{fmtDateTime(m.meets_at)}</dd>
        </div>
        <div className="tcc-pair">
          <dt>Session</dt>
          <dd>{session[m.status] || NA}</dd>
        </div>
        <div className="tcc-pair">
          <dt>Ballot</dt>
          <dd>
            {m.ballot_type === 'blind' ? (
              <>
                <i className="bi bi-lock" aria-hidden="true" /> Blind
              </>
            ) : (
              'Open'
            )}
          </dd>
        </div>
        <div className="tcc-pair">
          <dt>Threshold</dt>
          <dd>{m.threshold === 'supermajority' ? 'Two thirds Buy' : 'Simple majority'}</dd>
        </div>
        <div className="tcc-pair">
          <dt>Quorum</dt>
          <dd className="tcc-mono">{m.quorum_pct ?? 50}% of voters</dd>
        </div>
        <div className="tcc-pair">
          <dt>Eligible voters</dt>
          <dd className="tcc-mono">{eligible ?? NA}</dd>
        </div>
      </dl>
      <h3 className="opp-subhead">
        Agenda <span className="tcc-mono">({agenda.items.length})</span>
      </h3>
      {agenda.items.length === 0 ? (
        <p className="opp-note">No pitch is attached to this meeting yet.</p>
      ) : (
        <ol className="opp-agenda">
          {agenda.items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="opp-open opp-line"
                onClick={() => onOpen(p, 'voting')}
              >
                <span className="tcc-ticker tcc-mono">{p.ticker}</span>
                <span className="opp-grow">{p.company_name}</span>
              </button>
              <span className="opp-sub">
                {p.pitch_type
                  ? `${p.pitch_type.charAt(0).toUpperCase()}${p.pitch_type.slice(1)} pitch`
                  : 'Pitch'}
                {', at '}
                {stageName(p.stage)}
                {p.ballot && (
                  <>
                    {', '}
                    <span className="tcc-mono">
                      {p.ballot.received} of {p.ballot.eligible}
                    </span>{' '}
                    ballots received
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
      {agenda.unassigned.length > 0 && (
        <p className="opp-note">
          <span className="tcc-mono">{agenda.unassigned.length}</span> scheduled{' '}
          {agenda.unassigned.length === 1 ? 'pitch has' : 'pitches have'} no meeting yet.
        </p>
      )}
      {agenda.upcoming.length > 0 && (
        <p className="opp-note">
          Later:{' '}
          {agenda.upcoming.map((u, i) => (
            <span key={u.id}>
              {i ? ', ' : ''}
              <span className="tcc-mono">{fmtDate(u.meets_at)}</span> ({u.ballot_type})
            </span>
          ))}
        </p>
      )}
    </>
  );
}
