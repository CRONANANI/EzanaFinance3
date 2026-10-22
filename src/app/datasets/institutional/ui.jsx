'use client';

/**
 * Shared pieces for the Institutional Holdings (13F) page: the card shell,
 * skeletons, chips, the side-panel shell (Politician Tracker behaviour: one
 * history entry, Escape closes, focus returns, scrim) and the client fetch
 * hook. Components render; the maths lives in institutional-model.js.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MISSING } from '@/lib/titans/format';

export const SOURCE_LINE =
  'SEC EDGAR Form 13F-HR. Quarter-end holdings, filed up to 45 days later.';
export const ERROR_COPY = 'This data is unavailable right now. Try again in a moment.';
export const M = MISSING;

/** Fetch one JSON url; Retry refetches only this consumer. */
export function useJson(url, enabled = true) {
  const [state, setState] = useState({ status: url && enabled ? 'loading' : 'idle', data: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!url || !enabled) {
      setState({ status: 'idle', data: null });
      return undefined;
    }
    let alive = true;
    setState((s) => ({ status: 'loading', data: s.data }));
    fetch(url)
      .then((r) => r.json().then((j) => ({ ok: r.ok && j?.ok !== false, j })))
      .then(
        ({ ok, j }) => alive && setState({ status: ok ? 'ready' : 'error', data: ok ? j : null }),
      )
      .catch(() => alive && setState({ status: 'error', data: null }));
    return () => {
      alive = false;
    };
  }, [url, enabled, nonce]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

/* ── card shell ──────────────────────────────────────────────────────── */

export function QuarterChip({ label, partial = false }) {
  if (!label) return null;
  return <span className={`inst-qchip${partial ? ' is-partial' : ''}`}>{label}</span>;
}

/**
 * The standard card: icon tile, mono eyebrow, the card's question as h2,
 * quarter chip, body, then the source footer pinned at the bottom.
 */
export function Card({
  id,
  className = '',
  icon,
  eyebrow,
  title,
  chip,
  chipPartial = false,
  sourceExtra,
  empty = null,
  children,
}) {
  return (
    <section id={id} className={`inst-card ${className}`.trim()} aria-labelledby={`${id}-h`}>
      <header className="inst-card-head">
        {icon ? (
          <span className="inst-icon" aria-hidden="true">
            <i className={`bi ${icon}`} />
          </span>
        ) : null}
        <div className="inst-card-head-text">
          {eyebrow ? <p className="inst-eyebrow">{eyebrow}</p> : null}
          <h2 id={`${id}-h`} className="inst-h2">
            {title}
          </h2>
        </div>
        <QuarterChip label={chip} partial={chipPartial} />
      </header>
      <div className="inst-card-body">
        {empty ? <p className="inst-empty">{empty}</p> : children}
      </div>
      <footer className="inst-source">
        <span>{SOURCE_LINE}</span>
        {sourceExtra ? <span>{sourceExtra}</span> : null}
      </footer>
    </section>
  );
}

/* ── skeleton ────────────────────────────────────────────────────────── */

export function Skel({ w = '100%', h = 12, style }) {
  return (
    <span className="inst-skel" style={{ width: w, height: h, ...style }} aria-hidden="true" />
  );
}

/* ── chips ───────────────────────────────────────────────────────────── */

const CHANGE_WORD = {
  new: 'New',
  doubled: 'Doubled',
  added: 'Added',
  trimmed: 'Trimmed',
  exited: 'Exited',
  flat: 'Flat',
};

export function ChangeChip({ change }) {
  const word = CHANGE_WORD[change];
  if (!word) return null;
  return <span className={`inst-chg inst-chg--${change}`}>{word}</span>;
}

export function ScoreChip({ score, factors }) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  const tier = n >= 85 ? 'high' : n >= 70 ? 'mid' : 'low';
  return (
    <span className={`inst-score inst-score--${tier}`} title={factors || undefined}>
      {Math.round(n)}
    </span>
  );
}

/* ── side panel shell ────────────────────────────────────────────────── */

export function Panel({ label, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const prev = document.activeElement;
    el?.querySelector('h2, [data-panel-title]')?.focus?.();
    el?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && el) {
        const focusables = el.querySelectorAll(
          'button, [href], input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [onClose]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="inst-scrim" role="presentation" onClick={onClose}>
      <aside
        className="inst-panel"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </aside>
    </div>,
    document.body,
  );
}

export function PanelClose({ onClose }) {
  return (
    <button type="button" className="inst-panel-close" aria-label="Close panel" onClick={onClose}>
      <i className="bi bi-x-lg" aria-hidden="true" />
    </button>
  );
}

export function PanelSection({ title, children }) {
  return (
    <section className="inst-psec">
      {title ? <p className="inst-eyebrow">{title}</p> : null}
      {children}
    </section>
  );
}
