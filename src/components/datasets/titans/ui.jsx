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

/**
 * The side-panel shell: one open at a time, Politician Tracker behaviour.
 *
 * The panel is portalled to <body>, outside the page's `.dsc .<prefix>`
 * wrapper, so it is mounted inside its own `dsc <prefix>` scope wrapper
 * (display: contents, see disclosures.css). Without it every page token the
 * panel reads (--dsc-bg, --<prefix>-scrim, --<prefix>-card-bg ...) was
 * undefined and the surface and scrim painted transparent: the page showed
 * through the Security X-ray, Manager Fingerprint, Investor Dossier, Target
 * File and Filing Reader alike.
 *
 * Focus moves to the panel heading (h2, or [data-panel-title]) as soon as it
 * renders, including a heading that only appears once the panel's data has
 * loaded; Escape closes and focus returns to the opener.
 */
export function Panel({ label, onClose, prefix = 'inst', className = '', children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const prev = document.activeElement;
    const focusHeading = () => {
      const h = el?.querySelector('h2, [data-panel-title]');
      if (!h) return false;
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
      return true;
    };
    let observer = null;
    if (!focusHeading()) {
      el?.focus();
      observer = new MutationObserver(() => {
        /* Only take focus while it is still on the panel itself. */
        if (document.activeElement === el && focusHeading()) observer.disconnect();
      });
      if (el) observer.observe(el, { childList: true, subtree: true });
    }
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
      observer?.disconnect();
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [onClose]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`dsc ${prefix} dsc-portal`}>
      <div className={`${prefix}-scrim`} role="presentation" onClick={onClose}>
        <aside
          className={`${prefix}-panel${className ? ` ${className}` : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          ref={ref}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </aside>
      </div>
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
