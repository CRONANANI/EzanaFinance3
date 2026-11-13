'use client';

/**
 * The right rail of the Sonar research workspace (Nov 13 2026): Next steps and Related
 * research. Presentational: the host passes real items and real handlers, and a card with
 * nothing to show is not rendered (never an empty rectangle, never a dead control).
 * Research controls live in SonarResearchControls.jsx. Styles: sonar-answer-frame.css.
 */

import Link from 'next/link';

/**
 * steps: lib/sonar/workspace nextSteps(). onStep(step) runs it: 'deep' starts deep research,
 * 'run' pings step.query, 'section' scrolls to step.section.
 */
export function SonarNextSteps({ steps = [], onStep }) {
  if (!steps.length || typeof onStep !== 'function') return null;
  return (
    <section className="san-card" aria-labelledby="san-next-title">
      <h2 id="san-next-title" className="san-card-head">
        <i className="bi bi-signpost-split" aria-hidden="true" />
        Next steps
      </h2>
      <ul className="san-steps">
        {steps.map((s) => (
          <li key={s.key}>
            <button type="button" className="san-step" onClick={() => onStep(s)}>
              <span className="san-step-tile" aria-hidden="true">
                <i className={`bi ${s.icon}`} />
              </span>
              <span className="san-step-copy">
                <span className="san-step-title">{s.title}</span>
                <span className="san-step-line">{s.line}</span>
              </span>
              <i className="bi bi-chevron-right san-step-go" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * items: [{ key, title, href, kind, meta }] from real Ezana content only (Echo articles the
 * answer matched, the reader's own saved research). kind is a short label ("Ezana Echo",
 * "Saved research"); meta is a real date or read time, or null.
 */
export function SonarRelatedResearch({ items = [], moreHref = null }) {
  if (!items.length) return null;
  return (
    <section className="san-card" aria-labelledby="san-related-title">
      <h2 id="san-related-title" className="san-card-head">
        <i className="bi bi-journal-text" aria-hidden="true" />
        Related research
      </h2>
      <ul className="san-related">
        {items.slice(0, 5).map((it) => (
          <li key={it.key}>
            <Link href={it.href} className="san-related-link">
              <span className="san-related-title">{it.title}</span>
              <span className="san-related-meta">
                {[it.kind, it.meta].filter(Boolean).join(' · ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {moreHref ? (
        <Link href={moreHref} className="san-more">
          View more research <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}
