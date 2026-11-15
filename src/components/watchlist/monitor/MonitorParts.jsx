'use client';

/**
 * Watchlist Market Monitor building blocks (Nov 2026; Market Monitor 2.0):
 * asset avatar, sparkline, the day-change label and the text-only
 * asset-class tabs. Presentational: the page passes in the active list's
 * items with live quotes.
 */
import { useRef } from 'react';
import { ASSET_CLASSES, displayTicker } from '@/lib/watchlist/asset-classes';
import { fmtSignedPct, signOf } from '@/lib/watchlist/watchlist-view';

/* ------------------------------------------------------------------ */

export function AssetAvatar({ item, size = 30 }) {
  const label = item?.type === 'politician' ? item.name : displayTicker(item?.ticker || '');
  return (
    <span className={`wlm-avatar wlm-avatar--${size >= 48 ? 'lg' : 'sm'}`} aria-hidden="true">
      {(label || '?').charAt(0).toUpperCase()}
    </span>
  );
}

/** A small line from closes; colour follows its own direction. */
export function Sparkline({ points, width = 56, height = 22 }) {
  if (!points || points.length < 2)
    return (
      <span className="wlm-spark wlm-spark--empty" style={{ width, height }} aria-hidden="true" />
    );
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${((i / (points.length - 1)) * 100).toFixed(1)} ${(28 - ((v - min) / span) * 26).toFixed(1)}`,
    )
    .join(' ');
  const dir = points[points.length - 1] >= points[0] ? 'up' : 'down';
  return (
    <svg
      className={`wlm-spark is-${dir}`}
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      style={{ width, height }}
      aria-hidden="true"
    >
      <path d={d} fill="none" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Change({ value, className = '' }) {
  return (
    <span className={`wlm-num wlm-tone is-${signOf(value)} ${className}`.trim()}>
      {fmtSignedPct(value)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export function ClassTabs({ value, counts, onChange }) {
  const ref = useRef(null);
  const onKeyDown = (e) => {
    const tabs = [...(ref.current?.querySelectorAll('[role="tab"]') || [])];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (next) {
      e.preventDefault();
      next.focus();
      next.click();
    }
  };
  return (
    <div
      ref={ref}
      className="wlm-tabs"
      role="tablist"
      aria-label="Asset class"
      onKeyDown={onKeyDown}
    >
      {ASSET_CLASSES.map((c) => {
        const on = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={`wlm-tab${on ? ' is-on' : ''}`}
            onClick={() => onChange(c.id)}
          >
            {c.label}
            {counts?.[c.id] ? <span className="wlm-tab__count wlm-num">{counts[c.id]}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
