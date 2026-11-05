'use client';

/**
 * Deep research mode on /sonar and /datasets (Nov 2026).
 *
 * DeepResearchPrompt: when Sonar recognises a research assignment (a multi-
 * angle, multi-year question about a company), it asks before spending
 * anything: run deep research, or take the quick answer.
 *
 * DeepResearchRun: on yes, the estimate ("about 1 to 3 minutes"), a running
 * clock, the real progress events of the research engine, then the report
 * (for a company: the investment risk assessment). Cancel stops the run and
 * nothing is spent; a failed run is not charged.
 *
 * Branding guide: tokens only, Bootstrap Icons, page prefix `sdr-`, motion
 * off under prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from 'react';
import ResearchReport from '@/components/sonar/research/ResearchReport';
import { useResearchStream } from '@/components/sonar/research/useResearchStream';
import './deep-research.css';

export function DeepResearchPrompt({ query, deep, onDeep, onQuick, onClose }) {
  const firstRef = useRef(null);
  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const angles = deep?.angles || [];
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
          <i className="bi bi-layers" aria-hidden="true" /> Deep research
        </p>
        <h2 id="sdr-title" className="sdr-title">
          This question needs deep research
        </h2>
        <p className="sdr-query">&ldquo;{query}&rdquo;</p>
        <div id="sdr-body" className="sdr-body">
          <p>
            A quick ping answers in seconds by skimming. Deep research reads each dataset this
            question touches and writes an analyst&rsquo;s assessment: the material risks ranked,
            each with dated, cited evidence, scenarios and what would change the view.
          </p>
          {angles.length ? (
            <ul className="sdr-angles" aria-label="What it will cover">
              {angles.map((a) => (
                <li key={a.id}>
                  <i className="bi bi-check2" aria-hidden="true" />
                  {a.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="sdr-actions">
          <button
            ref={firstRef}
            type="button"
            className="sdr-btn sdr-btn--primary"
            onClick={onDeep}
          >
            Run deep research
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
          <button type="button" className="sdr-btn" onClick={onQuick}>
            Quick answer instead
          </button>
        </div>
        <p className="sdr-note">Counts as one ping. Findings only, never financial advice.</p>
      </div>
    </div>
  );
}

function clock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function DeepResearchRun({ query, estimate, onQuick, onBack }) {
  const { state, run, cancel } = useResearchStream();
  const [now, setNow] = useState(Date.now());

  /* One run per question; leaving (or a remount) cancels it, and a
     cancelled run is never charged. */
  useEffect(() => {
    run(query, { mode: 'deep' });
    return () => cancel();
  }, [query, run, cancel]);

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
    <div className="sdr-run">
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
          <a className="sdr-btn sdr-btn--primary" href="/auth/continue?intent=signup&next=/sonar">
            Create a free account
          </a>
        </div>
      ) : null}
      {state.status === 'error' ? (
        <div className="sdr-gate">
          <p>{state.error} Nothing was spent.</p>
          <div className="sdr-actions">
            <button
              type="button"
              className="sdr-btn sdr-btn--primary"
              onClick={() => {
                t0.current = Date.now();
                run(query, { mode: 'deep' });
              }}
            >
              Try deep research again
            </button>
            <button type="button" className="sdr-btn" onClick={onQuick}>
              Quick answer instead
            </button>
          </div>
        </div>
      ) : null}
      {state.status !== 'idle' && state.status !== 'gated' ? (
        <div className="sdr-report">
          <ResearchReport state={state} />
        </div>
      ) : null}
    </div>
  );
}
