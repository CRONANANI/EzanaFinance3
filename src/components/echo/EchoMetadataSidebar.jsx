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

function Group({ title, children }) {
  return (
    <div className="emeta-group">
      <div className="emeta-group-label">{title}</div>
      <div className="emeta-chiprow">{children}</div>
    </div>
  );
}

export default function EchoMetadataSidebar({ tickers = [], people = [], terms = [] }) {
  const onTicker = useCallback((t) => scrollToAnchor(`echo-anchor-ticker-${t}`), []);
  const onPerson = useCallback((id) => scrollToAnchor(`echo-anchor-person-${id}`), []);
  const onTerm = useCallback((id) => scrollToAnchor(`echo-anchor-term-${id}`), []);

  const hasAny = tickers.length || people.length || terms.length;

  return (
    <aside className="ezana-card emeta-card" aria-label="Article metadata">
      <div className="emeta-card-header">
        <MetadataExplainer />
      </div>

      {tickers.length > 0 && (
        <Group title="Tickers">
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

      {people.length > 0 && (
        <Group title="People">
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
        <Group title="Terms">
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

      {!hasAny && <p className="emeta-empty">No metadata for this article.</p>}
    </aside>
  );
}
