'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * SonarLiveAnswer — Section 1, the "Live Briefing". Reveals the REAL synthesized
 * answer token-by-token (client-side typewriter of the actual /api/sonar/query
 * text — not a fake timeout, not fake content) with a blinking emerald caret and a
 * pulsing ping dot that freezes on completion. Inline [S#] markers render as
 * superscript citations. Footer = the "Sonar searched" manifest, distinguishing
 * hit sources (emerald + dot) from searched-no-hit (outline).
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
}) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!answer) return undefined;
    if (reduceMotion) {
      setShown(answer.length);
      onComplete?.();
      return undefined;
    }
    setShown(0);
    let i = 0;
    const step = Math.max(1, Math.round(answer.length / 220));
    const id = setInterval(() => {
      i += step;
      if (i >= answer.length) {
        setShown(answer.length);
        clearInterval(id);
        onComplete?.();
      } else {
        setShown(i);
      }
    }, 16);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, reduceMotion]);

  const done = !answer || shown >= answer.length;
  const visible = answer ? answer.slice(0, shown) : '';

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
                title={d.used ? `${d.source} — returned matches` : `${d.source} — searched, no matches`}
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
