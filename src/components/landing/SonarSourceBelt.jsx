'use client';

/**
 * The resources belt (Nov 2026): a slow conveyor of every resource a ping used, shown at the
 * top of the answer once it lands, so the reader sees where it came from before reading it.
 * Ezana datasets first, then the data publishers behind the figures, the web pages the brief
 * read and the news it surfaced (pingResources in country-board.js). Any ping kind.
 *
 * Motion: one CSS transform loop over two copies of the list (the second aria-hidden and out
 * of the tab order). It pauses on hover, on keyboard focus and with the Pause button
 * (WCAG 2.2.2), and stops entirely under prefers-reduced-motion, where the list becomes a
 * plain horizontal scroller. Under four resources nothing moves.
 *
 * Borderless chips on the band's row tint, per the Sonar card rule. Styles: sonar-source-belt.css.
 */

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { pingResources } from '@/lib/sonar/country-board';
import './sonar-source-belt.css';

const ICON = {
  dataset: 'bi-database',
  publisher: 'bi-bank',
  web: 'bi-globe2',
  news: 'bi-newspaper',
};
const KIND = {
  dataset: 'Ezana dataset',
  publisher: 'Data publisher',
  web: 'Web page',
  news: 'News',
};

function Chip({ r, hidden = false }) {
  const body = (
    <>
      <i className={`bi ${ICON[r.kind] || 'bi-link-45deg'} snr-belt-ico`} aria-hidden="true" />
      <span className="snr-belt-label">{r.label}</span>
      {r.sub ? <span className="snr-belt-sub">{r.sub}</span> : null}
      {!hidden ? <span className="snr-label-sr">, {KIND[r.kind] || 'Source'}</span> : null}
    </>
  );
  const tab = hidden ? -1 : undefined;
  if (r.href && r.external) {
    return (
      <a
        className="snr-belt-chip"
        href={r.href}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={tab}
      >
        {body}
        {!hidden ? <span className="snr-label-sr"> (opens in a new tab)</span> : null}
      </a>
    );
  }
  if (r.href) {
    return (
      <Link className="snr-belt-chip" href={r.href} tabIndex={tab}>
        {body}
      </Link>
    );
  }
  return <span className="snr-belt-chip is-static">{body}</span>;
}

export function SonarSourceBelt({ live = null, items: given = null }) {
  /* `items` (Nov 6): a research report passes its own resources (researchResources). */
  const items = useMemo(() => given || pingResources(live), [given, live]);
  const [paused, setPaused] = useState(false);
  const titleId = useId();
  if (!items.length) return null;
  const moving = items.length >= 4;
  /* About 3.5 seconds per chip, never faster than 28s a lap. */
  const dur = `${Math.max(28, Math.round(items.length * 3.5))}s`;
  const counts = items.reduce((m, r) => ({ ...m, [r.kind]: (m[r.kind] || 0) + 1 }), {});
  const summary = [
    counts.dataset ? `${counts.dataset} Ezana dataset${counts.dataset === 1 ? '' : 's'}` : null,
    counts.publisher ? `${counts.publisher} publisher${counts.publisher === 1 ? '' : 's'}` : null,
    counts.web ? `${counts.web} web page${counts.web === 1 ? '' : 's'}` : null,
    counts.news ? `${counts.news} news stor${counts.news === 1 ? 'y' : 'ies'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section
      className={`snr-belt${moving ? ' is-moving' : ''}${paused ? ' is-paused' : ''}`}
      aria-labelledby={titleId}
    >
      <div className="snr-belt-head">
        <h2 id={titleId} className="snr-belt-title">
          <i className="bi bi-broadcast" aria-hidden="true" /> Sources used for this answer
        </h2>
        <span className="snr-belt-count">{summary}</span>
        {moving ? (
          <button
            type="button"
            className="snr-belt-pause"
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
          >
            <i className={`bi ${paused ? 'bi-play-fill' : 'bi-pause-fill'}`} aria-hidden="true" />
            {paused ? 'Play' : 'Pause'}
          </button>
        ) : null}
      </div>
      <div className="snr-belt-viewport">
        <div className="snr-belt-rail" style={{ '--belt-dur': dur }}>
          <ul className="snr-belt-track" aria-labelledby={titleId}>
            {items.map((r) => (
              <li key={r.key}>
                <Chip r={r} />
              </li>
            ))}
          </ul>
          {moving ? (
            <ul className="snr-belt-track is-clone" aria-hidden="true">
              {items.map((r) => (
                <li key={`clone-${r.key}`}>
                  <Chip r={r} hidden />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default SonarSourceBelt;
