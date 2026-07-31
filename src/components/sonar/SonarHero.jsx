'use client';

import { useState } from 'react';
import { SonarQueryBar } from './SonarQueryBar';

/**
 * SonarHero — State 01 (pre-search). The rings-gradient centered stack: eyebrow,
 * two-line H1, sub-copy, the Ping input, example-query pills, a recent-pings panel,
 * and the live daily quota. All actions call back up to the page, which owns the
 * query + backend.
 */
export function SonarHero({
  value,
  onChange,
  onSubmit,
  loading,
  examples,
  recent,
  onPick,
  quota,
  version,
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleRecent = showAll ? recent : recent?.slice(0, 3);
  return (
    <div className="sonar-hero">
      <div className="sonar-eyebrow">Ezana Sonar</div>
      <h1 className="sonar-h1">
        Ping anything.
        <br />
        Get the whole field back.
      </h1>
      <p className="sonar-sub">
        A name, a bank, a policy, a ticker, a bill — Sonar cross-references every dataset Ezana has
        and returns a synthesized, cited briefing.
      </p>

      <SonarQueryBar value={value} onChange={onChange} onSubmit={onSubmit} loading={loading} autoFocus />

      {examples?.length > 0 && (
        <div className="sonar-examples">
          {examples.map((ex) => (
            <button key={ex} type="button" className="sonar-ex-pill" onClick={() => onPick(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {recent?.length > 0 && (
        <div className="sonar-recent">
          <div className="sonar-recent-head">
            <span className="sonar-recent-title">Recent pings</span>
            {recent.length > 3 && (
              <button
                type="button"
                className="sonar-recent-viewall"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? 'Show less' : 'View all'}
              </button>
            )}
          </div>
          {visibleRecent.map((r, i) => (
            <button
              key={`${r.query}-${i}`}
              type="button"
              className="sonar-recent-row"
              onClick={() => onPick(r.query)}
            >
              <span className={`sonar-recent-dot sonar-recent-dot--${r.type}`} aria-hidden />
              <span className="sonar-recent-q">{r.query}</span>
              <span className={`sonar-badge sonar-badge--${r.type}`}>{r.typeLabel}</span>
            </button>
          ))}
        </div>
      )}

      {quota && (
        <div className="sonar-quota">
          {quota.remaining} of {quota.limit} pings left today
          {version && version !== 'regular' ? ` · ${version} scope` : ''}
        </div>
      )}
    </div>
  );
}

export default SonarHero;
