'use client';

/**
 * Go deeper (Nov 2026, research modes): under a quick or standard answer that
 * the classifier rated borderline, or after a standard run that left out
 * evidence the question asked for, a quiet bar that runs the next mode up.
 * Its own file so the landing band does not load the research report.
 */
import { useEffect, useId, useRef } from 'react';
import { sendModeEvent } from '@/lib/sonar/mode-events-client';
import './deep-research.css';

/**
 * "Go deeper: run deep research" under a lighter answer. Logs one
 * go_deeper_shown per answer and go_deeper_clicked on click.
 */
export function GoDeeperBar({ query, goDeeper, prominent = false, onClick }) {
  const to = goDeeper?.to === 'standard' ? 'standard' : 'deep';
  const meta = goDeeper?.meta || null;
  const shown = useRef(null);
  const lineId = useId();
  useEffect(() => {
    if (shown.current === query) return;
    shown.current = query;
    sendModeEvent('go_deeper_shown', { query, meta, details: { to, prominent } });
  }, [query, meta, to, prominent]);
  if (!goDeeper) return null;
  const line = goDeeper.reasons?.[0] || '';
  return (
    <div className={`sdr-deeper${prominent ? ' sdr-deeper--prominent' : ''}`}>
      <button
        type="button"
        className="sdr-deeper-btn"
        aria-describedby={goDeeper?.reasons?.[0] ? lineId : undefined}
        onClick={() => {
          sendModeEvent('go_deeper_clicked', { query, meta, ranMode: to, details: { prominent } });
          onClick?.();
        }}
      >
        <i className="bi bi-layers" aria-hidden="true" />
        <span>Go deeper: run {to} research</span>
        <i className="bi bi-arrow-right" aria-hidden="true" />
      </button>
      {line ? (
        <p id={lineId} className="sdr-deeper-line">
          {line}
        </p>
      ) : null}
    </div>
  );
}
