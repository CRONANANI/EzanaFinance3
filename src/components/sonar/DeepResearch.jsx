'use client';

/**
 * Research modes on /sonar and /datasets (Nov 2026).
 *
 * DeepResearchPrompt: when the research-mode classifier rates a question
 * deep, Sonar recommends deep research before spending anything and says
 * why, what it will produce and how long it takes. The visitor chooses:
 * run deep research, or take the quick answer. Deep research needs a free
 * account, so a guest's primary button opens sign-up and returns to the
 * question; the quick answer still works.
 *
 * DeepResearchRun: on yes, the estimate, a running clock, the research
 * engine's real progress events, then the report (for a company: the
 * investment risk assessment). Cancel stops the run and nothing is spent.
 *
 * StandardResearchRun: a focused question runs the engine at standard depth
 * automatically, with a compact progress line, then the report.
 *
 * GoDeeperBar: under a lighter answer, a quiet way to run the next mode up.
 * Since Nov 2026 (estimates) the deep research card (DeepResearchCard.jsx)
 * takes its place: beside the progress and under the report, with the time
 * and a usage line from POST /api/sonar/estimate. The offer dialog carries
 * the same usage line, and its alternative is the standard answer with its
 * time.
 *
 * Branding guide: tokens only, Bootstrap Icons, prefix `sdr-`, motion off
 * under prefers-reduced-motion. No em dashes in copy.
 */
import { useEffect, useRef, useState } from 'react';
import { SonarRunPingBar, SonarRunNav } from './SonarRunPingBar';
import ResearchReport from '@/components/sonar/research/ResearchReport';
import SaveToOrg from '@/components/org/sonar/SaveToOrg';
import { useResearchStream } from '@/components/sonar/research/useResearchStream';
import { sendModeEvent } from '@/lib/sonar/mode-events-client';
import { deepState } from '@/lib/sonar/estimate-copy';
import { GoDeeperBar } from './GoDeeperBar';
import { DeepResearchCard, deepSignupHref } from './DeepResearchCard';
import { deepNoteFrom } from '@/components/sonar/workspace-rail-helpers';
import './deep-research.css';

export { GoDeeperBar, DeepResearchCard, deepSignupHref };

const PRODUCES = {
  investment_memo:
    'An investment view, ranked material risks with dated evidence, financial and ownership evidence, bull, base and bear scenarios, and the data still missing.',
  report:
    'A conclusion, key findings with cited evidence, relevant comparisons or rankings, and the limits of what the data shows.',
};

/**
 * `estimate` (Nov 2026) is the /api/sonar/estimate response for this
 * question, or null while it loads: it gives the usage line (the same one
 * the deep research card shows), disables the primary button at the cap,
 * and times the standard answer offered as the alternative.
 */
export function DeepResearchPrompt({ query, deep, estimate = null, onDeep, onQuick, onClose }) {
  const firstRef = useRef(null);
  const altRef = useRef(null);
  const usage = deepState(estimate);
  const guest = Boolean(deep?.guestNeedsAccount) || usage?.blocked === 'signup';
  const atCap = Boolean(usage && !usage.available);
  const meta = deep?.meta || null;
  useEffect(() => {
    (atCap ? altRef : firstRef).current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, atCap]);
  /* One 'offered_deep' per offer shown. */
  useEffect(() => {
    sendModeEvent('offered_deep', { query, meta, details: { guest } });
  }, [query, meta, guest]);

  const why = deep?.reasons?.[0] || 'This question needs evidence from several datasets.';
  const areas = (deep?.domains || []).slice(0, 6);
  const produces = PRODUCES[deep?.format] || PRODUCES.report;
  const deepTime = estimate?.deep?.label || deep?.estimate?.label || 'about 1 to 4 minutes';
  const standardTime = estimate?.answer?.label || '';

  const accept = () => {
    if (atCap) return;
    sendModeEvent('accepted_deep', {
      query,
      meta,
      ranMode: guest ? null : 'deep',
      details: { guest },
    });
    if (guest) {
      window.location.assign(deepSignupHref(query));
      return;
    }
    onDeep?.();
  };
  const quick = () => {
    /* The alternative is the standard answer (the landing ping ledgers it
       as 'standard' for a question rated deep). */
    sendModeEvent('chose_quick', { query, meta, ranMode: 'standard', details: { guest } });
    onQuick?.();
  };

  return (
    <div
      className="sdr-overlay force-dark-theme"
      role="presentation"
      onMouseDown={(e) => {
        /* A press on the scrim (not the card) closes, as on the free account popup. */
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="sdr-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sdr-title"
        aria-describedby="sdr-body"
      >
        <button type="button" className="sdr-close" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
        <p className="sdr-eyebrow">
          <i className="bi bi-layers" aria-hidden="true" /> Deep research recommended
        </p>
        <h2 id="sdr-title" className="sdr-title">
          This question would benefit from deep research
        </h2>
        <p className="sdr-query">&ldquo;{query}&rdquo;</p>
        <div id="sdr-body" className="sdr-body">
          <h3 className="sdr-h3">Why</h3>
          <p>{why}</p>
          {areas.length ? (
            <ul className="sdr-angles" aria-label="Research areas">
              {areas.map((a) => (
                <li key={a.id}>
                  <i className="bi bi-check2" aria-hidden="true" />
                  {a.label}
                </li>
              ))}
            </ul>
          ) : null}
          <h3 className="sdr-h3">What Sonar will produce</h3>
          <p>{produces}</p>
          <p className="sdr-estimate">
            <i className="bi bi-clock" aria-hidden="true" /> Estimated time {deepTime}
          </p>
          {usage?.line ? (
            <p className="sdr-usage" id="sdr-usage">
              {usage.line}
            </p>
          ) : null}
        </div>
        <div className="sdr-actions">
          <button
            ref={firstRef}
            type="button"
            className="sdr-btn sdr-btn--primary sdr-dcard-btn"
            onClick={accept}
            disabled={atCap}
            aria-disabled={atCap ? 'true' : undefined}
            aria-describedby={usage?.line ? 'sdr-usage' : undefined}
          >
            {guest ? 'Create a free account to run it' : 'Run deep research'}
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
          <button ref={altRef} type="button" className="sdr-btn" onClick={quick}>
            {standardTime ? `Standard answer \u00b7 ${standardTime}` : 'Standard answer'}
          </button>
        </div>
        <p className="sdr-note">
          {guest
            ? 'Deep research needs a free account. The standard answer works without one.'
            : 'Findings only, never financial advice.'}
        </p>
      </div>
    </div>
  );
}

/**
 * Nov 7: while the red team and the audit review run, the engine sends the research
 * director's grounded draft. It renders in the report's place, marked as under review,
 * until findings replaces it in place. Only while the run is live: a cancelled or failed
 * run shows no draft. Save stays off because SaveToOrg renders only once the run is done,
 * after findings has replaced the draft.
 */
function withDraft(state) {
  const showing = state.status === 'running' && !state.report && Boolean(state.draft?.report);
  return {
    showing,
    view: showing ? { ...state, report: state.draft.report, brief: state.draft.brief } : state,
  };
}

/* One live region per run, present before the label fills it, so a screen reader hears
   the label once when the draft appears and nothing when findings removes it. */
function DraftStatus({ showing }) {
  return (
    <div className="sdr-draft-live" role="status" aria-live="polite">
      {showing ? (
        <p className="sdr-draft">
          <i className="bi bi-hourglass-split" aria-hidden="true" />
          Draft. Review in progress
        </p>
      ) : null}
    </div>
  );
}

function clock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function DeepResearchRun({
  query,
  estimate,
  onQuick,
  onStandard,
  onBack,
  extra = null,
  saveLabel = null,
  challengeOf = null,
  /* Nov 2026: started from the deep research card, whose overlay has just
     closed: focus moves to the run so it is not dropped on the page. */
  focusOnMount = false,
  /* Nov 7: the next question, from the ping bar on this answer (the host pings it). */
  onPing = null,
}) {
  const { state, run, cancel } = useResearchStream();
  const rootRef = useRef(null);
  useEffect(() => {
    if (focusOnMount) rootRef.current?.focus({ preventScroll: true });
  }, [focusOnMount]);
  const [now, setNow] = useState(Date.now());
  /* Org research (Nov 2026) passes { fundFit } or { challenge } through. */
  const extraKey = extra ? JSON.stringify(extra) : '';

  /* One run per question; leaving (or a remount) cancels it, and a
     cancelled run is never charged. */
  useEffect(() => {
    run(query, { mode: 'deep', extra: extraKey ? JSON.parse(extraKey) : null });
    return () => cancel();
  }, [query, extraKey, run, cancel]);

  const running = state.status === 'running';
  const t0 = useRef(Date.now());
  useEffect(() => {
    t0.current = Date.now();
  }, [query]);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  const elapsed = (now - t0.current) / 1000;
  const over = estimate?.maxSec && elapsed > estimate.maxSec;
  const draft = withDraft(state);

  /* Nov 7: as on a standard run, a finished board takes Back and the ping bar into its
     sections column. */
  const doneReport = state.status === 'done' ? draft.view?.report : null;
  const boardUp = Boolean(
    doneReport &&
    doneReport.format !== 'investment_memo' &&
    (doneReport.executiveConclusion || doneReport.keyFindings?.length),
  );

  return (
    <div
      className="sdr-run force-dark-theme"
      ref={rootRef}
      tabIndex={-1}
      aria-label="Deep research"
    >
      {boardUp ? null : (
        <div className="sdr-run-bar">
          <button type="button" className="sdr-link" onClick={onBack}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back
          </button>
          {onPing ? <SonarRunPingBar onPing={onPing} /> : null}
          {running ? (
            <div className="sdr-timer" role="status" aria-live="polite">
              <span className="sdr-pulse" aria-hidden="true" />
              <span>
                Deep research in progress. Estimated time{' '}
                {estimate?.label || 'about 1 to 4 minutes'}.
              </span>
              {/* The clock ticks every second: out of the live region, so only
                the status text is announced. */}
              <span className="sdr-clock" aria-hidden="true">
                {clock(elapsed)} elapsed
              </span>
              {over ? (
                <span className="sdr-over">Taking longer than usual. Still working.</span>
              ) : null}
              <button type="button" className="sdr-link" onClick={cancel}>
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      )}
      {state.status === 'gated' ? (
        <div className="sdr-gate">
          <p>{state.error}</p>
          <div className="sdr-actions">
            <a className="sdr-btn sdr-btn--primary" href={deepSignupHref(query)}>
              Create a free account
            </a>
            <button type="button" className="sdr-btn" onClick={onQuick}>
              Quick answer
            </button>
          </div>
        </div>
      ) : null}
      {state.status === 'quota' ? (
        <div className="sdr-gate" role="alert">
          <p>{state.error}</p>
          <div className="sdr-actions">
            {state.standardAvailable && onStandard ? (
              <button type="button" className="sdr-btn sdr-btn--primary" onClick={onStandard}>
                Run standard research
              </button>
            ) : null}
            <button type="button" className="sdr-btn" onClick={onQuick}>
              Quick answer
            </button>
          </div>
        </div>
      ) : null}
      {state.status === 'error' ? (
        <div className="sdr-gate" role="alert">
          <p>{state.error} Nothing was spent.</p>
          <div className="sdr-actions">
            <button
              type="button"
              className="sdr-btn sdr-btn--primary"
              onClick={() => {
                t0.current = Date.now();
                run(query, { mode: 'deep', extra: extraKey ? JSON.parse(extraKey) : null });
              }}
            >
              Try deep research again
            </button>
            <button type="button" className="sdr-btn" onClick={onQuick}>
              Quick answer
            </button>
          </div>
        </div>
      ) : null}
      {state.status !== 'idle' && state.status !== 'gated' && state.status !== 'quota' ? (
        <div className="sdr-report">
          {running ? <DraftStatus showing={draft.showing} /> : null}
          <ResearchReport
            state={draft.view}
            navTop={boardUp ? <SonarRunNav onBack={onBack} onPing={onPing} /> : null}
            onRun={onPing}
          />
        </div>
      ) : null}
      {state.status === 'done' ? (
        <SaveToOrg
          org={state.org}
          query={state.run?.researchQuestion || query}
          label={saveLabel}
          challengeOf={challengeOf || state.org?.challengeOf || null}
        />
      ) : null}
    </div>
  );
}

/* The engine's stage ids, as a person reads them. */
const STAGE_LABEL = {
  understanding: 'Understanding the question',
  retrieving: 'Reading the sources',
  verifying_evidence: 'Weighing the evidence',
  analyzing: 'Calculating',
  relating: 'Connecting the evidence',
  specialists: 'Specialists analysing the evidence',
  synthesizing: 'Writing',
  red_team: 'Red-team review',
  auditing: 'Auditing the report',
  validating: 'Checking every claim',
};

/**
 * Standard research, run automatically: a compact progress line ("Researching:
 * reading 6 sources", the live stage, about 20 to 40 seconds), then the report
 * and, when the run left out evidence or the question was borderline, Go
 * deeper.
 *
 * Nov 2026 (estimates): with `estimate` (the /api/sonar/estimate response)
 * the deep research card shows under the progress line while the run works
 * and under the report once it is done, in place of Go deeper. `onDeep`
 * gets { supersede: true } while the run is still working: the host cancels
 * it (unmounting this cancels the stream, and the research route releases an
 * unfinished run) and the deep run releases its ledger row, so only the deep
 * run is charged.
 */
export function StandardResearchRun({
  query,
  classification,
  goDeeper,
  onGoDeeper,
  onQuick,
  onBack,
  estimate = null,
  onDeep = null,
  /* Nov 7: the next question, from the ping bar on this answer (the host pings it). */
  onPing = null,
  /* Nov 7: the run's status ('running' | 'done' | 'error' | 'gated' | 'quota'), so the host
     can hold its loading screen until the report has landed. */
  onStatus = null,
}) {
  const { state, run, cancel } = useResearchStream();
  useEffect(() => {
    run(query, { mode: 'standard' });
    return () => cancel();
  }, [query, run, cancel]);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  useEffect(() => {
    onStatusRef.current?.(state.status);
  }, [state.status]);

  const running = state.status === 'running';
  const planned = state.plan?.plan?.tasks?.length || classification?.plannedWork?.tasks || null;
  const stage = STAGE_LABEL[state.stage] || null;
  const coverageHint = state.coverage?.incomplete
    ? {
        to: 'deep',
        meta: classification?.meta || goDeeper?.meta || null,
        deep: goDeeper?.deep || null,
        reasons: [
          `This run left out ${state.coverage.missing.join(' and ')}, which the question asks for. Deep research reads them.`,
        ],
      }
    : null;
  const hint = coverageHint || goDeeper || null;
  /* A standard run sends a draft only when the org requires a red team. */
  const draft = withDraft(state);
  /* Nov 6: a finished research report (not a memo) renders as the research board, whose
     executive answer carries deep research as one inline button; the card below goes. */
  const onBoard = Boolean(
    state.report &&
    state.report.format !== 'investment_memo' &&
    (state.report.executiveConclusion || state.report.keyFindings?.length),
  );
  const deepEstimate = coverageHint
    ? {
        ...estimate,
        deep: { ...estimate?.deep, recommended: true, reasons: coverageHint.reasons },
      }
    : estimate;

  /* Nov 7: a finished board carries Back and the ping bar at the top of its sections column,
     so the full-width run bar goes and the answer starts at the top. */
  const boardUp = onBoard && state.status === 'done';

  return (
    <div className="sdr-run force-dark-theme">
      {boardUp ? null : (
        <div className="sdr-run-bar">
          <button type="button" className="sdr-link" onClick={onBack}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back
          </button>
          {onPing ? <SonarRunPingBar onPing={onPing} /> : null}
          {running ? (
            <div className="sdr-timer" role="status" aria-live="polite">
              <span className="sdr-pulse" aria-hidden="true" />
              <span>
                Researching{planned ? `: reading ${planned} sources` : ''}
                {/* The report's progress region announces each stage and
                  analyst once; kept out of this live region so a stage
                  change is not read twice. */}
                <span aria-hidden="true">{stage ? `. ${stage}` : ''}</span>.
              </span>
              <span className="sdr-over">
                {classification?.estimate?.label || 'about 20 to 40 seconds'}
              </span>
              <button type="button" className="sdr-link" onClick={cancel}>
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      )}
      {state.status === 'gated' ? (
        <div className="sdr-gate">
          <p>{state.error}</p>
          <a className="sdr-btn sdr-btn--primary" href={deepSignupHref(query, { deep: false })}>
            Create a free account
          </a>
        </div>
      ) : null}
      {state.status === 'error' ? (
        <div className="sdr-gate" role="alert">
          <p>{state.error} Nothing was spent.</p>
          <div className="sdr-actions">
            <button
              type="button"
              className="sdr-btn sdr-btn--primary"
              onClick={() => run(query, { mode: 'standard' })}
            >
              Try again
            </button>
            {onQuick ? (
              <button type="button" className="sdr-btn" onClick={onQuick}>
                Quick answer
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {state.status !== 'idle' && state.status !== 'gated' ? (
        <div className="sdr-report">
          {running ? <DraftStatus showing={draft.showing} /> : null}
          <ResearchReport
            state={draft.view}
            navTop={boardUp ? <SonarRunNav onBack={onBack} onPing={onPing} /> : null}
            onRun={onPing}
            deepNote={estimate && onDeep ? deepNoteFrom(deepEstimate) : null}
            onRunDeep={
              estimate && onDeep && !draft.showing ? () => onDeep({ supersede: false }) : null
            }
            deepAction={
              onBoard && state.status === 'done' && estimate && onDeep ? (
                <DeepResearchCard
                  query={query}
                  estimate={deepEstimate}
                  placement="inline"
                  pingsSpent={1}
                  onRun={(st) => onDeep({ supersede: false, signup: st.blocked === 'signup' })}
                />
              ) : null
            }
          />
        </div>
      ) : null}
      {running && estimate && onDeep ? (
        <DeepResearchCard
          query={query}
          estimate={estimate}
          placement="progress"
          onRun={(st) => onDeep({ supersede: true, signup: st.blocked === 'signup' })}
        />
      ) : null}
      {state.status === 'done' ? <SaveToOrg org={state.org} query={query} /> : null}
      {state.status === 'done' && estimate && onDeep && !onBoard ? (
        <DeepResearchCard
          query={query}
          estimate={deepEstimate}
          placement="after"
          pingsSpent={1}
          onRun={(st) => onDeep({ supersede: false, signup: st.blocked === 'signup' })}
        />
      ) : null}
      {state.status === 'done' && hint && !(estimate && onDeep) ? (
        <GoDeeperBar
          query={query}
          goDeeper={hint}
          prominent={Boolean(coverageHint)}
          onClick={() => onGoDeeper?.(hint)}
        />
      ) : null}
    </div>
  );
}
