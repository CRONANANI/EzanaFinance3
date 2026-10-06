/**
 * Display formatters for the Titans Shadow pages (pure, client-safe).
 */

/** 1.234e9 -> '$1.23B'; null/NaN -> null (render as unavailable, not $0). */
export function usd(v) {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return null;
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

/** 1234567 -> '1,234,567'. */
export function int(v) {
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? null : Math.round(n).toLocaleString('en-US');
}

/** 8.456 -> '8.5%'. */
export function pct(v, digits = 1) {
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? null : `${n.toFixed(digits)}%`;
}

/** '2026-06-30' -> 'Jun 30, 2026'. */
export function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** '2026-06-30' -> 'Q2 2026'. */
export function quarterShort(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  return m ? `Q${Math.ceil(Number(m[2]) / 3)} ${m[1]}` : null;
}

export const DASH = '–';
export const OPENFIGI_NOTE =
  'Tickers mapped from CUSIP via OpenFIGI; unmapped securities show the issuer name.';

/** Sample data renders only in local development with the explicit flag. */
export const ALLOW_SAMPLE =
  process.env.NEXT_PUBLIC_ALLOW_SAMPLE_DATA === 'true' && process.env.NODE_ENV !== 'production';

/** Shown wherever the SEC filing did not report a figure. */
export const NOT_REPORTED = 'Not reported';

/** 12.345 -> '+12.3%'. */
export function signedPct(v, digits = 1) {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return null;
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

/** 2.5 -> '$2.50' (per-share amounts). */
export function money2(v) {
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? null : `$${n.toFixed(2)}`;
}
