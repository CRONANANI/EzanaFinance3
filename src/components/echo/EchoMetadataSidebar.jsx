'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const META_EXPLAINER =
  'Ezana uses the people, terms, and tickers in each article as signals to tailor your experience — the news, alerts, and articles we surface next. Your affinity to a topic strengthens the more you engage: reading the full article, rating it Signal over Noise at the end, and interacting with its charts and interactive components all increase your ties to that metadata. The goal is a feed that reflects what you actually follow, not what is loudest.';

// Smooth-scroll to an anchor id and apply a brief highlight pulse.
function scrollToAnchor(anchorId) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(anchorId);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  if (!reduce) {
    el.classList.remove('echo-anchor-pulse');
    // force reflow so the animation can re-trigger
    void el.offsetWidth;
    el.classList.add('echo-anchor-pulse');
    window.setTimeout(() => el.classList.remove('echo-anchor-pulse'), 1300);
  }
}

function MetadataExplainer() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      className="emeta-explainer-wrap"
      ref={wrapRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="emeta-title"
        aria-expanded={open}
        aria-describedby="emeta-popover"
        onClick={() => setOpen((v) => !v)}
      >
        Metadata
        <i className="bi bi-info-circle emeta-title-icon" aria-hidden="true" />
      </button>
      {open && (
        <div className="emeta-popover" id="emeta-popover" role="tooltip">
          <div className="emeta-popover-head">Why metadata?</div>
          <p className="emeta-popover-body">{META_EXPLAINER}</p>
        </div>
      )}
    </div>
  );
}

/* Collapsed-by-default disclosure per metadata category: only the category
   name shows until opened (keeps the header card compact — the expanded
   taxonomy was inflating the header row and leaving a white gulf under the
   subheading). Native details/summary: keyboard + screen-reader support for
   free, no state. Chips inside are unchanged (tracking included).

   An empty core group renders an honest em-dash instead of chips (and no count
   badge) — the seven core categories always show, so gaps are visible rather
   than silently hidden. */
function Group({ title, children, count }) {
  const empty = count === 0;
  return (
    <details className="emeta-group">
      <summary className="emeta-group-summary">
        <span className="emeta-group-label">{title}</span>
        {!empty && typeof count === 'number' && <span className="emeta-group-count">{count}</span>}
        <i className="bi bi-chevron-down emeta-group-chevron" aria-hidden="true" />
      </summary>
      {empty ? (
        <span className="emeta-empty">—</span>
      ) : (
        <div className="emeta-chiprow">{children}</div>
      )}
    </details>
  );
}

/* Every article renders the SAME 10 groups — Tickers, the eight taxonomy
   dimensions below, and Built with — a uniform scaffold so readers learn one
   card layout (and the 2×5 grid holds on every article). Empty dimensions
   show a muted em-dash: honest, and it makes taxonomy gaps visible instead
   of silently hiding the category. */

/* Taxonomy dimensions rendered as chip groups after Tickers, in this order.
   `dimension` is the value sent with the article_meta_click breadcrumb. */
const META_GROUPS = [
  { dimension: 'sectors', title: 'Sectors' },
  { dimension: 'industries', title: 'Industries' },
  { dimension: 'investors', title: 'Investors' },
  { dimension: 'institutions', title: 'Institutions' },
  { dimension: 'government', title: 'Government' },
  { dimension: 'geos', title: 'Geographies' },
  { dimension: 'assetClasses', title: 'Asset Classes' },
  { dimension: 'themes', title: 'Themes' },
];

export default function EchoMetadataSidebar({ tickers = [], meta = {}, onMetaClick }) {
  const onTicker = useCallback((t) => scrollToAnchor(`echo-anchor-ticker-${t}`), []);
  const fireMeta = useCallback(
    (dimension, value) => {
      if (typeof onMetaClick === 'function') onMetaClick(dimension, value);
    },
    [onMetaClick],
  );

  const m = meta || {};
  const datasets = Array.isArray(m.datasets) ? m.datasets : [];

  // Metadata is universal now, so the card renders whenever the article exists.
  return (
    <aside className="ezana-card emeta-card" aria-label="Article metadata">
      <div className="emeta-card-header">
        <MetadataExplainer />
      </div>

      {/* Tickers — a core category, always shown (empty → em-dash via Group). */}
      <Group title="Tickers" count={tickers.length}>
        {tickers.map((t) => (
          <button
            key={t}
            type="button"
            className="emeta-chip emeta-chip--ticker"
            onClick={() => onTicker(t)}
            title={`Jump to ${t} in the article`}
          >
            <i className="bi bi-graph-up emeta-chip-icon" aria-hidden="true" />
            {t}
          </button>
        ))}
      </Group>

      {META_GROUPS.map((g) => {
        const values = Array.isArray(m[g.dimension]) ? m[g.dimension] : [];
        // All taxonomy dimensions render on every article (em-dash when
        // empty) — the card's group set is identical everywhere.
        return (
          <Group key={g.dimension} title={g.title} count={values.length}>
            {values.map((value) => (
              <button
                key={value}
                type="button"
                className="emeta-chip emeta-chip--meta"
                onClick={() => fireMeta(g.dimension, value)}
                title={`${g.title}: ${value}`}
              >
                {value}
              </button>
            ))}
          </Group>
        );
      })}

      {/* Built with — always shown (em-dash when the article lists no
          datasets) so the card's 10-group set is identical on every article. */}
      <Group title="Built with" count={datasets.length}>
        {datasets.map((ds) => (
          <button
            key={ds}
            type="button"
            className="emeta-chip emeta-chip--dataset"
            onClick={() => fireMeta('datasets', ds)}
            title={`Draws on Ezana ${ds}`}
          >
            {ds}
          </button>
        ))}
      </Group>
    </aside>
  );
}
