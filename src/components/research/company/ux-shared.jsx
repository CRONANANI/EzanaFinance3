'use client';

/**
 * Small shared pieces for the US Equities selected-stock tabs (Nov 19th, 2026):
 * section states and number formats. Status is always stated in text, never
 * by colour alone.
 */
import { isNum } from '@/lib/research/company-research';

export function UxState({ status, error, onRetry, empty = 'No data available.', rows = 3 }) {
  if (status === 'loading' || status === 'idle') {
    return (
      <div className="rc-skel-stack" aria-busy="true" aria-label="Loading">
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className="rc-skel rc-skel--line" />
        ))}
      </div>
    );
  }
  if (status === 'error') {
    return (
      <p className="ux-state ux-state--error" role="alert">
        <i className="bi bi-exclamation-triangle" aria-hidden="true" />{' '}
        {error || 'This section could not load.'}{' '}
        {onRetry ? (
          <button type="button" className="rc-link-btn" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </p>
    );
  }
  return <p className="ux-state">{empty}</p>;
}

/** $1.52T / $684.3B / $12.4M, sign kept, accounting brackets optional. */
export function fmtBig(v, { brackets = false, prefix = '$' } = {}) {
  if (!isNum(v)) return 'N/A';
  const a = Math.abs(v);
  const s =
    a >= 1e12
      ? `${(a / 1e12).toFixed(2)}T`
      : a >= 1e9
        ? `${(a / 1e9).toFixed(1)}B`
        : a >= 1e6
          ? `${(a / 1e6).toFixed(1)}M`
          : a >= 1e3
            ? `${(a / 1e3).toFixed(1)}K`
            : a.toFixed(0);
  if (v < 0) return brackets ? `(${prefix}${s})` : `-${prefix}${s}`;
  return `${prefix}${s}`;
}

/** Share counts: 3.21B, 140K. */
export const fmtCount = (v) => fmtBig(v, { prefix: '' });

/** 0.193 -> 19.3% */
export const fmtRatioPct = (r, digits = 1) => (isNum(r) ? `${(r * 100).toFixed(digits)}%` : 'N/A');

const dayFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
/** '2026-11-19' -> 'Nov 19, 2026' */
export function fmtDay(iso) {
  if (!iso) return 'N/A';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? 'N/A' : dayFmt.format(d);
}

/** Section card with a title row and an optional action on the right line. */
export function UxCard({ title, icon, info, action, children, className = '', id }) {
  return (
    <section className={`rc-card ux-card ${className}`} aria-labelledby={id}>
      <header className="rc-card__head ux-card__head">
        <h3 id={id} className="rc-card__title ux-card__title">
          {icon ? <i className={`bi ${icon} ux-card__icon`} aria-hidden="true" /> : null}
          {title}
        </h3>
        {info ? <span className="ux-card__info">{info}</span> : null}
        {action ? <div className="ux-card__action">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}
