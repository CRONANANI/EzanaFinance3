'use client';

/**
 * Shared pieces for the Committee Assignments page: the fetch hook, the
 * card shell that owns the four states, and the small chips and tags from
 * 04-SPEC.md section 3. Components render; every calculation lives in
 * src/lib/congress/committees-page-model.js.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const ERROR_COPY = 'This data is unavailable right now. Try again in a moment.';
const PARTY_WORD = { D: 'Democrat', R: 'Republican', I: 'Independent' };

/* ── display strings (presentation only; the model never formats) ────── */

function shortUSD(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1e6) return `$${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

/** The disclosure range, as filed: "$1K-$15K". Never a point value. */
export function fmtRange(min, max) {
  const a = shortUSD(min);
  const b = shortUSD(max);
  if (a && b) return `${a}-${b}`;
  return a ? `${a}+` : b || 'Undisclosed';
}

export function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
}

export const fmtCount = (v) =>
  Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-US') : '0';

export const CHAMBER_WORD = { house: 'House', senate: 'Senate', joint: 'Joint' };

/** Fetch one JSON url; Retry refetches only this card. `enabled` defers. */
export function useJson(url, enabled = true) {
  const [state, setState] = useState({ status: url && enabled ? 'loading' : 'idle', data: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!url || !enabled) return undefined;
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

/**
 * The standard card: header with title and mono subtitle, then exactly one
 * of skeleton / error / empty / children by `status`. Sized by the caller's
 * skeleton so filter changes never move the layout.
 */
export function Card({
  id,
  className = '',
  title,
  sub,
  right,
  status,
  onRetry,
  empty,
  skeleton,
  footer,
  children,
}) {
  let body = children;
  if (status === 'loading') body = skeleton || <Skel h={120} />;
  else if (status === 'error') {
    body = (
      <div className="cmx-state" role="status">
        <p>{ERROR_COPY}</p>
        {onRetry ? (
          <button type="button" className="cmx-btn cmx-btn--ghost" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    );
  } else if (empty) {
    body = (
      <div className="cmx-state" role="status">
        <p>{empty}</p>
      </div>
    );
  }
  return (
    <section id={id} className={`cmx-card ${className}`.trim()} aria-busy={status === 'loading'}>
      <header className="cmx-head">
        <div className="cmx-head-main">
          <h2 className="cmx-title">{title}</h2>
          {sub ? <p className="cmx-sub cmx-mono">{sub}</p> : null}
        </div>
        {right ? <div className="cmx-head-right">{right}</div> : null}
      </header>
      <div className="cmx-body">{body}</div>
      {footer ? <footer className="cmx-foot-row">{footer}</footer> : null}
    </section>
  );
}

/* ── skeletons ───────────────────────────────────────────────────────── */

export function Skel({ w = '100%', h = 12, style }) {
  return <span className="cmx-skel" style={{ width: w, height: h, ...style }} aria-hidden="true" />;
}

export function SkelRows({ n = 6, h = 40 }) {
  return (
    <div className="cmx-skel-rows">
      {Array.from({ length: n }, (_, i) => (
        <Skel key={i} h={h} />
      ))}
    </div>
  );
}

/* ── controls ────────────────────────────────────────────────────────── */

/** Segmented radiogroup; `mono` for the party control. */
export function Segmented({ label, value, options, onChange, mono = false, size }) {
  return (
    <div
      className={`cmx-seg${mono ? ' cmx-seg--mono' : ''}${size === 'lg' ? ' cmx-seg--lg' : ''}`}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`cmx-seg-btn${value === o.value ? ' is-on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── people ──────────────────────────────────────────────────────────── */

/** The neutral bordered letter tag: identical for D, R and I, never a colour. */
export function PartyTag({ party }) {
  if (!party) return null;
  return (
    <span className="cmx-party" title={PARTY_WORD[party] || party}>
      {party}
    </span>
  );
}

/** Headshot with shimmer circle and initials fallback, as Politician Tracker. */
export function Headshot({ src, name, size = 26 }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.36)) };
  if (!src || failed) {
    return (
      <span className="cmx-face cmx-face--blank" style={style} aria-hidden="true">
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="cmx-face"
      style={style}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

const seatOf = (m) =>
  m?.chamber === 'Senate' || m?.chamber === 'senate'
    ? m?.state || null
    : m?.state
      ? `${m.state}-${m.district != null ? (m.district === 0 ? 'AL' : m.district) : ''}`.replace(
          /-$/,
          '',
        )
      : null;

/** `P-ST` style mono seat label beside a name. */
export function SeatLabel({ member }) {
  const seat = seatOf(member);
  if (!seat) return null;
  return <span className="cmx-seatlabel cmx-mono">{seat}</span>;
}

/* ── chips ───────────────────────────────────────────────────────────── */

export function CodeChip({ code, selected = false }) {
  if (!code) return null;
  return <span className={`cmx-code cmx-mono${selected ? ' is-on' : ''}`}>{code}</span>;
}

export function LeadBadge({ title }) {
  const t = String(title || '').toLowerCase();
  if (!t) return null;
  const word = t.includes('rank')
    ? 'Ranking'
    : t.includes('chair') || t.includes('cochair')
      ? 'Chair'
      : null;
  if (!word) return null;
  return <span className="cmx-lead">{word}</span>;
}

export function SidePill({ side }) {
  if (side !== 'buy' && side !== 'sell') return null;
  return (
    <span className={`cmx-side cmx-mono cmx-side--${side}`}>{side === 'buy' ? 'BUY' : 'SELL'}</span>
  );
}

export function SectorChips({ sectors, max = 0 }) {
  if (!sectors?.length) return null;
  const shown = max ? sectors.slice(0, max) : sectors;
  const more = sectors.length - shown.length;
  return (
    <span className="cmx-sectors" aria-label="Overseen sectors">
      {shown.map((s) => (
        <span key={s.key} className="cmx-sector">
          {s.label}
        </span>
      ))}
      {more > 0 ? <span className="cmx-sector cmx-sector--more cmx-mono">+{more}</span> : null}
    </span>
  );
}

/** The 6px majority/minority bar, always rendered beside its text labels. */
export function SplitBar({ split, tall = false }) {
  if (!split?.total) return null;
  return (
    <span
      className={`cmx-splitbar${tall ? ' cmx-splitbar--tall' : ''}`}
      role="img"
      aria-label={`${split.majority} majority seats, ${split.minority} minority seats`}
    >
      <span className="cmx-splitbar-maj" style={{ width: `${split.majorityPct}%` }} />
      <span className="cmx-splitbar-min" style={{ width: `${split.minorityPct}%` }} />
    </span>
  );
}

/* ── overlay (phone filter sheet) ────────────────────────────────────── */

export function Overlay({ label, onClose, children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const prev = document.activeElement;
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
    <div className="cmx-overlay" role="presentation" onClick={onClose}>
      <div
        className={`cmx-sheet${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
