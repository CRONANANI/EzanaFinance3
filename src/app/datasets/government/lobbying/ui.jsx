'use client';

/**
 * Lobbying Activity: shared UI pieces. The card shell owns the five states
 * every card ships (loading shimmer, populated, filtered-to-empty, partial
 * period, error with Retry), so the cards only describe their content.
 * Bootstrap Icons only; decorative icons are aria-hidden.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mappingBadge } from '@/lib/lobbying/page-model';
import { fmtSignedPct } from '@/lib/lobbying/page-format';

/* ── data ──────────────────────────────────────────────────────────────── */

/**
 * Fetch one /api/lobbying/page view. `query` is the full query string; a
 * change refetches. Retry refetches only this view.
 * @returns {{ status:'loading'|'ready'|'error', data:any, retry:()=>void }}
 */
export function useView(query, enabled = true) {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const ctrl = new AbortController();
    setState((s) => ({ status: 'loading', data: s.data }));
    fetch(`/api/lobbying/page?${query}`, { signal: ctrl.signal })
      .then((r) => r.json().then((j) => ({ ok: r.ok && j?.ok !== false, j })))
      .then(({ ok, j }) =>
        setState(ok ? { status: 'ready', data: j.data } : { status: 'error', data: null }),
      )
      .catch((e) => {
        if (e?.name !== 'AbortError') setState({ status: 'error', data: null });
      });
    return () => ctrl.abort();
  }, [query, enabled, nonce]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

/** Plain JSON fetch for the existing routes (ingest-status, ratio, quotes). */
export function useJson(url) {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!url) {
      setState({ status: 'ready', data: null });
      return undefined;
    }
    const ctrl = new AbortController();
    setState({ status: 'loading', data: null });
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setState({ status: 'ready', data: d }))
      .catch((e) => {
        if (e?.name !== 'AbortError') setState({ status: 'error', data: null });
      });
    return () => ctrl.abort();
  }, [url, nonce]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

/* ── card shell ────────────────────────────────────────────────────────── */

export const ERROR_COPY = 'This data is unavailable right now. Try again in a moment.';

/**
 * @param {object} props
 * @param {'loading'|'ready'|'error'} props.status
 * @param {string|null} props.empty  the empty-state sentence, or null when populated
 * @param {string|null} props.partial  the amber partial-period chip text
 * @param {React.ReactNode} props.skeleton  shimmer in the card's own shape
 * @param {React.ReactNode} props.footer  pinned to the bottom (margin-top: auto)
 */
export function Card({
  id,
  title,
  sub,
  right,
  status = 'ready',
  empty = null,
  partial = null,
  onRetry,
  onReset,
  skeleton,
  footer,
  className = '',
  children,
}) {
  const headId = `${id}-title`;
  return (
    <section
      className={`lbx-card ${className}`}
      aria-labelledby={headId}
      aria-busy={status === 'loading'}
    >
      <header className="lbx-head">
        <div className="lbx-head-text">
          <h2 className="lbx-title" id={headId}>
            {title}
          </h2>
          {sub ? <p className="lbx-sub">{sub}</p> : null}
        </div>
        {right ? <div className="lbx-head-right">{right}</div> : null}
      </header>
      {partial && status === 'ready' && !empty ? <PartialChip text={partial} /> : null}
      <div className="lbx-card-body">
        {status === 'loading' ? (
          <div className="lbx-skel-wrap" aria-hidden="true">
            {skeleton}
          </div>
        ) : status === 'error' ? (
          <div className="lbx-statebox" role="status">
            <p className="lbx-state">{ERROR_COPY}</p>
            {onRetry ? (
              <button
                type="button"
                className="lbx-btn lbx-btn--ghost lbx-btn--sm"
                onClick={onRetry}
              >
                <i className="bi bi-arrow-repeat" aria-hidden="true" /> Retry
              </button>
            ) : null}
          </div>
        ) : empty ? (
          <div className="lbx-statebox" role="status">
            <p className="lbx-state">{empty}</p>
            {onReset ? (
              <button type="button" className="lbx-chip" onClick={onReset}>
                Reset filters
              </button>
            ) : null}
          </div>
        ) : (
          children
        )}
      </div>
      {footer && status === 'ready' && !empty ? (
        <footer className="lbx-card-foot">{footer}</footer>
      ) : null}
    </section>
  );
}

export function PartialChip({ text }) {
  return (
    <p className="lbx-note-row">
      <span className="lbx-note">
        <i className="bi bi-hourglass-split" aria-hidden="true" />
        {text}
      </span>
    </p>
  );
}

/** Shimmer block. */
export function Skel({ w = '100%', h = 12, r, style }) {
  return (
    <span
      className="lbx-skel"
      style={{ width: w, height: h, borderRadius: r, display: 'block', ...style }}
    />
  );
}

/** N shimmer rows of a given height (lists and tables). */
export function SkelRows({ n = 6, h = 37, gap = 6 }) {
  return (
    <div className="lbx-skel-rows" style={{ gap }}>
      {Array.from({ length: n }, (_, i) => (
        <Skel key={i} h={h - gap} />
      ))}
    </div>
  );
}

/* ── controls ──────────────────────────────────────────────────────────── */

/**
 * Radio-group segmented control. Arrow keys move the selection; only the
 * checked option is in the tab order.
 * @param {{ value:string, options:{value:string,label:string}[], onChange:(v:string)=>void, label:string, mono?:boolean }} props
 */
export function Segmented({ value, options, onChange, label, mono = false, size }) {
  const refs = useRef([]);
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const move = (d) => {
    const n = (idx + d + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div
      className={`lbx-seg${mono ? ' lbx-seg--mono' : ''}${size === 'lg' ? ' lbx-seg--lg' : ''}`}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={i === idx ? 0 : -1}
          className={o.value === value ? 'is-on' : undefined}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              move(1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              move(-1);
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tablist with arrow keys; panels are rendered by the caller. */
export function Tabs({ value, options, onChange, label, idBase }) {
  const refs = useRef([]);
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const move = (d) => {
    const n = (idx + d + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div className="lbx-tabs" role="tablist" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`${idBase}-tab-${o.value}`}
          aria-controls={`${idBase}-panel`}
          aria-selected={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className={o.value === value ? 'is-on' : undefined}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              move(1);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              move(-1);
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── ticker identity ───────────────────────────────────────────────────── */

const NAME_MATCH_TIP = 'Matched on exact client name, not hand-verified';

/**
 * Ticker chip plus the mapping badge: a solid patch-check for the
 * hand-verified set, a dashed "Name match" chip otherwise. Always both
 * visually and textually distinct.
 */
export function Tick({ ticker, verified, showBadge = true }) {
  if (!ticker) return null;
  const badge = mappingBadge({ ticker, verified });
  return (
    <span className="lbx-tickwrap">
      <span className={`lbx-tick${badge === 'name_match' ? ' lbx-tick--name' : ''}`}>{ticker}</span>
      {showBadge ? <MappingBadge kind={badge} /> : null}
    </span>
  );
}

export function MappingBadge({ kind }) {
  if (kind === 'verified')
    return (
      <span className="lbx-ver" title="Hand-verified ticker mapping">
        <i className="bi bi-patch-check-fill" aria-hidden="true" />
        <span className="lbx-sr">Verified mapping</span>
      </span>
    );
  if (kind === 'name_match')
    return (
      <span className="lbx-nm" title={NAME_MATCH_TIP}>
        Name match<span className="lbx-sr">: {NAME_MATCH_TIP}</span>
      </span>
    );
  return null;
}

/** YoY pill: sign and arrow always, colour never alone. */
export function YoyPill({ value, reason, prior }) {
  if (value == null) {
    const why =
      reason === 'coverage'
        ? 'Shown once both periods are fully loaded'
        : 'No filings in the prior period';
    return (
      <span className="lbx-pill lbx-pill--na" title={why}>
        ·<span className="lbx-sr">{why}</span>
      </span>
    );
  }
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className={`lbx-pill ${flat ? 'lbx-pill--na' : up ? 'lbx-pill--pos' : 'lbx-pill--neg'}`}>
      {!flat ? (
        <i
          className={`bi ${up ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`}
          aria-hidden="true"
        />
      ) : null}
      {fmtSignedPct(value)}
      {prior ? <span className="lbx-sr"> {prior}</span> : null}
    </span>
  );
}

/* ── overlay: modal or drawer ──────────────────────────────────────────── */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog or right-side drawer. Traps focus, closes on Escape and on
 * the scrim, and returns focus to the element that opened it.
 */
export function Overlay({ kind = 'modal', label, onClose, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  /* Portalled to <body> so no sticky or clipped ancestor can stack above it;
     rendered only after mount, since a ?filing= link opens it on load. */
  const [host, setHost] = useState(null);
  useEffect(() => setHost(document.body), []);
  useEffect(() => {
    if (!host) return undefined;
    const opener = document.activeElement;
    const el = ref.current;
    const first = el?.querySelector(FOCUSABLE);
    (first || el)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const items = [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [onClose, host]);
  if (!host) return null;
  return createPortal(
    <div className={`lbx-scrim lbx-scrim--${kind}`} onMouseDown={onClose}>
      <div
        ref={ref}
        className={`lbx-${kind}${wide ? ` lbx-${kind}--wide` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-describedby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span id={titleId} className="lbx-sr">
          {label}
        </span>
        {children}
      </div>
    </div>,
    host,
  );
}

export function CloseButton({ onClose, label = 'Close' }) {
  return (
    <button type="button" className="lbx-x" onClick={onClose} aria-label={label}>
      <i className="bi bi-x-lg" aria-hidden="true" />
    </button>
  );
}
