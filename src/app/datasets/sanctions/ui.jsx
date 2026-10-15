'use client';

/**
 * Shared pieces for the Sanctions & Trade Policy page (prefix snx): number
 * and date formatting, entry types, the shared filter shape, program chips,
 * type tags and the honest-state note. Tokens only.
 */
import { useEffect, useState } from 'react';
import { programMeta, themeOf } from '@/lib/sanctions/programs';

export const fmt = (n) => Number(n || 0).toLocaleString('en-US');

export const pctOf = (n, d) => {
  if (!d) return '0%';
  const p = (n / d) * 100;
  if (p >= 10) return `${Math.round(p)}%`;
  if (p >= 0.1) return `${p.toFixed(1)}%`;
  return '<0.1%';
};

/** 'YYYY-MM-DD' (or a timestamp) -> 'Oct 14, 2026', in UTC. */
export const shortDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

/** Timestamp -> 'Oct 14, 05:40 UTC'. */
export const stampLabel = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}, ${d
    .toISOString()
    .slice(11, 16)} UTC`;
};

/** 'YYYY-MM-01' -> 'Oct 26' (short) or 'October 2026' (long). */
export const monthLabel = (m, long = false) =>
  new Date(`${String(m).slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-US', {
    month: long ? 'long' : 'short',
    year: long ? 'numeric' : '2-digit',
    timeZone: 'UTC',
  });

export const TYPES = [
  {
    key: 'entity',
    label: 'Entities',
    one: 'Entity',
    long: 'Corporations & other entities',
    color: 'var(--info)',
  },
  {
    key: 'individual',
    label: 'Individuals',
    one: 'Individual',
    long: 'Individuals',
    color: 'var(--purple)',
  },
  { key: 'vessel', label: 'Vessels', one: 'Vessel', long: 'Vessels', color: 'var(--cyan)' },
  {
    key: 'aircraft',
    label: 'Aircraft',
    one: 'Aircraft',
    long: 'Aircraft',
    color: 'var(--warning)',
  },
];
export const TYPE_BY_KEY = Object.fromEntries(TYPES.map((t) => [t.key, t]));

/** The one filter every card reads and writes. */
export const NO_FILTER = {
  type: '',
  country: '',
  program: '',
  q: '',
  ident: '',
  from: '',
  to: '',
  risk: false,
  linked: false,
  linkedTo: '',
  page: 1,
};
const KEYS = Object.keys(NO_FILTER);
export const sameFilter = (a, b) => KEYS.every((k) => a[k] === b[k]);

/** The filter as listings query params (page included). */
export function filterParams(f, { withPage = true } = {}) {
  const sp = new URLSearchParams();
  for (const k of ['type', 'country', 'program', 'q', 'ident', 'from', 'to', 'linkedTo']) {
    if (f[k]) sp.set(k, f[k]);
  }
  if (f.risk) sp.set('risk', '1');
  if (f.linked) sp.set('linked', '1');
  if (withPage && f.page > 1) sp.set('page', String(f.page));
  return sp;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

export function ProgramChip({ code, onPick, active }) {
  const meta = programMeta(code);
  const theme = themeOf(code);
  const body = (
    <>
      <span className="snx-chip-dot" style={{ background: theme.color }} aria-hidden="true" />
      {code}
    </>
  );
  if (!onPick) {
    return (
      <span className="snx-chip" title={meta.label}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`snx-chip snx-chip--btn${active ? ' is-on' : ''}`}
      title={`${meta.label}: filter listings`}
      aria-pressed={Boolean(active)}
      onClick={() => onPick(code)}
    >
      {body}
    </button>
  );
}

export function TypeTag({ type }) {
  const t = TYPE_BY_KEY[type] || TYPE_BY_KEY.entity;
  return (
    <span className="snx-type" style={{ '--snx-type': t.color }}>
      {t.one}
    </span>
  );
}

/** Stacked composition bar by entry type. */
export function TypeStrip({ counts, total, label }) {
  return (
    <div className="snx-strip" role="img" aria-label={label}>
      {TYPES.map((t) =>
        counts?.[t.key] && total ? (
          <span
            key={t.key}
            className="snx-strip-seg"
            style={{ width: `${(counts[t.key] / total) * 100}%`, background: t.color }}
          />
        ) : null,
      )}
    </div>
  );
}

/**
 * The honest state line: why a card has nothing to show. kind:
 * 'unavailable' (source not loaded), 'empty' (a real zero), 'stale', 'error'.
 */
export function StateNote({ kind = 'unavailable', children }) {
  const icon = {
    unavailable: 'bi-hourglass-split',
    empty: 'bi-dash-circle',
    stale: 'bi-clock-history',
    error: 'bi-exclamation-triangle',
  }[kind];
  return (
    <p className={`snx-state snx-state--${kind}`} role="status">
      <i className={`bi ${icon}`} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Segmented control. options: [{ key, label, icon? }] */
export function Seg({ value, onChange, options, label }) {
  return (
    <div className="snx-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`snx-seg-btn${value === o.key ? ' is-on' : ''}`}
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          disabled={o.disabled}
          title={o.title}
        >
          {o.icon ? <i className={`bi ${o.icon}`} aria-hidden="true" /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}
