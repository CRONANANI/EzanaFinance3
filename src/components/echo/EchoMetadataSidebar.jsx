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
   free, no state. Chips inside are unchanged (tracking included). */
function Group({ title, children, count }) {
  return (
    <details className="emeta-group">
      <summary className="emeta-group-summary">
        <span className="emeta-group-label">{title}</span>
        {typeof count === 'number' && <span className="emeta-group-count">{count}</span>}
        <i className="bi bi-chevron-down emeta-group-chevron" aria-hidden="true" />
      </summary>
      <div className="emeta-chiprow">{children}</div>
    </details>
  );
}

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

export default function EchoMetadataSidebar({
  tickers = [],
  people = [],
  terms = [],
  meta = {},
  onMetaClick,
}) {
  const onTicker = useCallback((t) => scrollToAnchor(`echo-anchor-ticker-${t}`), []);
  const onPerson = useCallback((id) => scrollToAnchor(`echo-anchor-person-${id}`), []);
  const onTerm = useCallback((id) => scrollToAnchor(`echo-anchor-term-${id}`), []);
  const fireMeta = useCallback(
    (dimension, value) => {
      if (typeof onMetaClick === 'function') onMetaClick(dimension, value);
    },
    [onMetaClick],
  );

  const m = meta || {};
  const markets = Array.isArray(m.markets) ? m.markets : [];
  const datasets = Array.isArray(m.datasets) ? m.datasets : [];
  const metaGroupCount = META_GROUPS.reduce(
    (n, g) => n + (Array.isArray(m[g.dimension]) ? m[g.dimension].length : 0),
    0,
  );
  const hasAny =
    tickers.length ||
    people.length ||
    terms.length ||
    metaGroupCount ||
    markets.length ||
    datasets.length;

  return (
    <aside className="ezana-card emeta-card" aria-label="Article metadata">
      <div className="emeta-card-header">
        <MetadataExplainer />
      </div>

      {tickers.length > 0 && (
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
      )}

      {META_GROUPS.map((g) => {
        const values = Array.isArray(m[g.dimension]) ? m[g.dimension] : [];
        if (values.length === 0) return null;
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

      {people.length > 0 && (
        <Group title="People" count={people.length}>
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              className="emeta-chip emeta-chip--person"
              onClick={() => onPerson(p.id)}
              title={p.role ? `${p.label} — ${p.role}` : `Jump to ${p.label}`}
            >
              {p.label}
            </button>
          ))}
        </Group>
      )}

      {terms.length > 0 && (
        <Group title="Terms" count={terms.length}>
          {terms.map((t) => (
            <button
              key={t.id}
              type="button"
              className="emeta-chip emeta-chip--term"
              onClick={() => onTerm(t.id)}
              title={`Jump to "${t.label}" in the article`}
            >
              {t.label}
            </button>
          ))}
        </Group>
      )}

      {markets.length > 0 && (
        <Group title="Related Markets" count={markets.length}>
          {markets.map((mk) => (
            <button
              key={mk.label}
              type="button"
              className="emeta-chip emeta-chip--market"
              onClick={() => fireMeta('markets', mk.label)}
              title={mk.source ? `${mk.label} — ${mk.source}` : mk.label}
            >
              {mk.label}
              {mk.source && <span className="emeta-chip-source">{mk.source}</span>}
            </button>
          ))}
        </Group>
      )}

      {datasets.length > 0 && (
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
      )}

      {!hasAny && <p className="emeta-empty">No metadata for this article.</p>}
    </aside>
  );
}
