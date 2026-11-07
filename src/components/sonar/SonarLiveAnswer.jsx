'use client';

import { useEffect, useRef } from 'react';

/**
 * SonarLiveAnswer — Section 1, the "Live Briefing". Renders the REAL synthesized
 * answer from /api/sonar/query with a blinking emerald caret and a pulsing ping dot
 * that freezes on completion. Inline [S#] markers render as superscript citations;
 * a half-received marker ("[S1" at the end of a streamed answer) stays plain text
 * until it completes. Footer = the "Sonar searched" manifest, distinguishing hit
 * sources (emerald + dot) from searched-no-hit (outline).
 *
 * Nov 2026: `live` answers arrive as the model writes them (streamed); the text
 * renders as it grows, with the caret, until `final`, then onComplete fires once.
 * A non-streamed answer renders whole at once (no artificial typewriter).
 */

/** Split text into strings + citation nodes for any [S#] markers present. */
function renderWithCitations(text) {
  const parts = [];
  const re = /\[S(\d+)\]/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a key={`c${m.index}`} className="sonar-cite" href={`#sonar-src-S${m[1]}`}>
        [{m[1]}]
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function SonarLiveAnswer({
  answer,
  sourceCount,
  elapsedSec,
  searched = [],
  webSources = [],
  onComplete,
  live = false,
  final = true,
}) {
  /* onComplete fires once per finished answer: when a live answer is final, or as
     soon as a whole answer is shown. */
  const completedFor = useRef(null);
  const done = live ? Boolean(final) : true;
  useEffect(() => {
    if (!done || !answer) return;
    if (completedFor.current === answer) return;
    completedFor.current = answer;
    onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, answer]);

  const visible = answer || '';

  return (
    <div className="sonar-answer sonar-surface">
      <div className="sonar-answer-head">
        <span className={`sonar-ping-dot${done ? ' sonar-ping-dot--frozen' : ''}`} aria-hidden />
        <span className="sonar-live-label">Live Briefing</span>
        <span className="sonar-answer-meta">
          {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
          {elapsedSec != null ? ` · ${elapsedSec}s` : ''}
        </span>
      </div>

      <div className="sonar-answer-body">
        {renderWithCitations(visible)}
        {!done && <span className="sonar-caret" aria-hidden />}
      </div>

      {searched.length > 0 && (
        <div className="sonar-manifest">
          <div className="sonar-manifest-title">Sonar searched</div>
          <div className="sonar-manifest-row">
            {searched.map((d) => (
              <span
                key={d.id}
                className={`sonar-src-chip${d.used ? ' sonar-src-chip--hit' : ''}`}
                title={
                  d.used ? `${d.source}, returned matches` : `${d.source}, searched, no matches`
                }
              >
                {d.label}
              </span>
            ))}
          </div>

          {webSources.length > 0 && (
            <div className="sonar-web-sources">
              <span className="sonar-web-sources-label">Live web:</span>
              {webSources.map((w, i) => (
                <a
                  key={w.url}
                  className="sonar-web-source"
                  href={w.url}
                  target="_blank"
                  rel="noreferrer"
                  title={w.url}
                >
                  {i + 1}. {w.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SonarLiveAnswer;
