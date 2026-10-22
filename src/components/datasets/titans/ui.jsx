'use client';

/**
 * Class-agnostic pieces shared by the Titans Shadow pages (Institutional
 * 13F, Activist 13D/13G): the fetch hook, skeleton, score chip and the side
 * panel shell (480px, scrim, Escape, focus trap, focus returned on close).
 * Each component takes a `prefix` ('inst' | 'act'), defaulting to 'inst' so
 * the 13F page renders exactly the markup it shipped with; the page CSS
 * files define the matching class sets.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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

export function Skel({ w = '100%', h = 12, style, prefix = 'inst' }) {
  return (
    <span
      className={`${prefix}-skel`}
      style={{ width: w, height: h, ...style }}
      aria-hidden="true"
    />
  );
}

/** Whale Score chip: tiers at 85 and 70, factors in the title. */
export function ScoreChip({ score, factors, prefix = 'inst' }) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  const tier = n >= 85 ? 'high' : n >= 70 ? 'mid' : 'low';
  return (
    <span className={`${prefix}-score ${prefix}-score--${tier}`} title={factors || undefined}>
      {Math.round(n)}
    </span>
  );
}

/** The side-panel shell: one open at a time, Politician Tracker behaviour. */
export function Panel({ label, onClose, prefix = 'inst', children }) {
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
    <div className={`${prefix}-scrim`} role="presentation" onClick={onClose}>
      <aside
        className={`${prefix}-panel`}
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

export function PanelClose({ onClose, prefix = 'inst' }) {
  return (
    <button
      type="button"
      className={`${prefix}-panel-close`}
      aria-label="Close panel"
      onClick={onClose}
    >
      <i className="bi bi-x-lg" aria-hidden="true" />
    </button>
  );
}

export function PanelSection({ title, prefix = 'inst', children }) {
  return (
    <section className={`${prefix}-psec`}>
      {title ? <p className={`${prefix}-eyebrow`}>{title}</p> : null}
      {children}
    </section>
  );
}
