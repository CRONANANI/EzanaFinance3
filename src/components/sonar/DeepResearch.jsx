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
 *
 * Branding guide: tokens only, Bootstrap Icons, prefix `sdr-`, motion off
 * under prefers-reduced-motion. No em dashes in copy.
 */
import { useEffect, useRef, useState } from 'react';
import ResearchReport from '@/components/sonar/research/ResearchReport';
import SaveToOrg from '@/components/org/sonar/SaveToOrg';
import { useResearchStream } from '@/components/sonar/research/useResearchStream';
import { sendModeEvent } from '@/lib/sonar/mode-events-client';
import { GoDeeperBar } from './GoDeeperBar';
import './deep-research.css';

export { GoDeeperBar };

const PRODUCES = {
  investment_memo:
    'An investment view, ranked material risks with dated evidence, financial and ownership evidence, bull, base and bear scenarios, and the data still missing.',
  report:
    'A conclusion, key findings with cited evidence, relevant comparisons or rankings, and the limits of what the data shows.',
};

/** The sign-up link that brings a guest back to this question (run deep
    when `deep`). */
export function deepSignupHref(query, { deep = true } = {}) {
  let next = `/datasets?q=${encodeURIComponent(query || '')}${deep ? '&deep=1' : ''}`;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('q', query || '');
    if (deep) url.searchParams.set('deep', '1');
    else url.searchParams.delete('deep');
    next = `${url.pathname}${url.search}`;
  } catch {
    /* default above */
  }
  return `/auth/continue?intent=signup&next=${encodeURIComponent(next)}`;
}

export function DeepResearchPrompt({ query, deep, onDeep, onQuick, onClose }) {
  const firstRef = useRef(null);
  const guest = Boolean(deep?.guestNeedsAccount);
  const meta = deep?.meta || null;
  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  /* One 'offered_deep' per offer shown. */
  useEffect(() => {
    sendModeEvent('offered_deep', { query, meta, details: { guest } });
  }, [query, meta, guest]);

  const why = deep?.reasons?.[0] || 'This question needs evidence from several datasets.';
  const areas = (deep?.domains || []).slice(0, 6);
  const produces = PRODUCES[deep?.format] || PRODUCES.report;
  const estimate = deep?.estimate?.label || 'about 1 to 3 minutes';

  const accept = () => {
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
    sendModeEvent('chose_quick', { query, meta, ranMode: 'quick', details: { guest } });
    onQuick?.();
  };

  return (
    <div className="sdr-overlay" role="presentation">
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
            <i className="bi bi-clock" aria-hidden="true" /> Estimated time {estimate}
          </p>
        </div>
        <div className="sdr-actions">
          <button
            ref={firstRef}
            type="button"
            className="sdr-btn sdr-btn--primary"
            onClick={accept}
          >
            {guest ? 'Create a free account to run it' : 'Run deep research'}
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
          <button type="button" className="sdr-btn" onClick={quick}>
            Quick answer
          </button>
        </div>
        <p className="sdr-note">
          {guest
            ? 'Deep research needs a free account. The quick answer works without one.'
            : 'Counts as one ping. Findings only, never financial advice.'}
        </p>
      </div>
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
}) {
  const { state, run, cancel } = useResearchStream();
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

  return (
    <div className="sdr-run force-dark-theme">
      <div className="sdr-run-bar">
        <button type="button" className="sdr-link" onClick={onBack}>
          <i className="bi bi-arrow-left" aria-hidden="true" /> New question
        </button>
        {running ? (
          <div className="sdr-timer" role="status" aria-live="polite">
            <span className="sdr-pulse" aria-hidden="true" />
            <span>
              Deep research in progress. Estimated time {estimate?.label || 'about 1 to 3 minutes'}.
            </span>
            <span className="sdr-clock">{clock(elapsed)} elapsed</span>
            {over ? (
              <span className="sdr-over">Taking longer than usual. Still working.</span>
            ) : null}
            <button type="button" className="sdr-link" onClick={cancel}>
              Cancel
            </button>
          </div>
        ) : null}
      </div>
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
          <ResearchReport state={state} />
        </div>
      ) : null}
      {state.status === 'done' ? (
        <SaveToOrg
          org={state.org}
          query={state.run?.researchQuestion || query}
          label={saveLabel}
          challengeOf={challengeOf}
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
  synthesizing: 'Writing',
  validating: 'Checking every claim',
};

/**
 * Standard research, run automatically: a compact progress line ("Researching:
 * reading 6 sources", the live stage, about 15 to 30 seconds), then the report
 * and, when the run left out evidence or the question was borderline, Go
 * deeper.
 */
export function StandardResearchRun({
  query,
  classification,
  goDeeper,
  onGoDeeper,
  onQuick,
  onBack,
}) {
  const { state, run, cancel } = useResearchStream();
  useEffect(() => {
    run(query, { mode: 'standard' });
    return () => cancel();
  }, [query, run, cancel]);

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

  return (
    <div className="sdr-run force-dark-theme">
      <div className="sdr-run-bar">
        <button type="button" className="sdr-link" onClick={onBack}>
          <i className="bi bi-arrow-left" aria-hidden="true" /> New question
        </button>
        {running ? (
          <div className="sdr-timer" role="status" aria-live="polite">
            <span className="sdr-pulse" aria-hidden="true" />
            <span>
              Researching{planned ? `: reading ${planned} sources` : ''}
              {stage ? `. ${stage}` : ''}.
            </span>
            <span className="sdr-over">
              {classification?.estimate?.label || 'about 15 to 30 seconds'}
            </span>
            <button type="button" className="sdr-link" onClick={cancel}>
              Cancel
            </button>
          </div>
        ) : null}
      </div>
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
          <ResearchReport state={state} />
        </div>
      ) : null}
      {state.status === 'done' ? <SaveToOrg org={state.org} query={query} /> : null}
      {state.status === 'done' && hint ? (
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
