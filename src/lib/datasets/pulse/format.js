/**
 * Pure formatting helpers for the /datasets pulse (the top-bar belt and the
 * brief it opens). No I/O, no randomness, UTC everywhere so the server render
 * and the client agree. Every helper returns null for a value it cannot
 * format, and callers drop the line rather than print a placeholder.
 */

export const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/* $1.2B, $340M, $85K. */
export function compactUsd(n) {
  const v = num(n);
  if (v == null || v <= 0) return null;
  const fmt = (x) => (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10);
  if (v >= 1e12) return `$${fmt(v / 1e12)}T`;
  if (v >= 1e9) return `$${fmt(v / 1e9)}B`;
  if (v >= 1e6) return `$${fmt(v / 1e6)}M`;
  if (v >= 1e3) return `$${fmt(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

export function compactInt(n) {
  const v = num(n);
  if (v == null) return null;
  if (Math.abs(v) >= 1e6) return `${Math.round((v / 1e6) * 10) / 10}M`;
  if (Math.abs(v) >= 1e4) return `${Math.round(v / 1e3)}K`;
  return Math.round(v).toLocaleString('en-US');
}

/* "+12.4%" / "-3.1%"; unsigned when signed is false. */
export function pctStr(n, digits = 1, signed = true) {
  const v = num(n);
  if (v == null) return null;
  const s = v.toFixed(digits);
  return signed && v > 0 ? `+${s}%` : `${s}%`;
}

export function signedNum(n, digits = 2) {
  const v = num(n);
  if (v == null) return null;
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
}

/* "Oct 9". */
export function shortDate(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/* "Oct 9, 2026". */
export function longDate(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/* "Sep 2026". */
export function monthLabel(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/* Whole days from a to b (ISO dates); null when either is missing. */
export function daysBetween(a, b) {
  if (!a || !b) return null;
  const x = Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`);
  const y = Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return Math.round((y - x) / 86400000);
}

const SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/i;
export function lastName(full) {
  const parts = String(full || '')
    .replace(/,.*$/, '')
    .trim()
    .split(/\s+/)
    .filter((p) => !SUFFIX.test(p));
  return parts.length ? parts[parts.length - 1] : null;
}

const SMALL = new Set(['of', 'and', 'the', 'for', 'to', 'in', 'on', 'a', 'an']);
const ENTITY_TAIL =
  /[,.]?\s+(incorporated|inc|corporation|corp|company|co|llc|l\.l\.c|ltd|lp|l\.p|plc|holdings|group|trust)\.?$/i;

/* "LOCKHEED MARTIN CORPORATION" -> "Lockheed Martin". Feeds arrive ALL CAPS,
   so only short tokens survive as acronyms (BAE, IBM, AT&T). */
export function entityName(raw) {
  let s = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < 3 && ENTITY_TAIL.test(s); i += 1) s = s.replace(ENTITY_TAIL, '');
  if (!s) return null;
  const allCaps = s === s.toUpperCase();
  if (!allCaps) return s;
  return s
    .split(' ')
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (/^[A-Z0-9&.]{2,4}$/.test(w) && (w.length <= 3 || /[&.\d]/.test(w)) && !SMALL.has(lower)) {
        return w;
      }
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/* "Department of Defense" -> "Defense". */
export function agencyName(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  return s.replace(/^(u\.?s\.?\s+)?department of (the )?/i, '').trim() || s;
}

/* Belt headlines are one line: cut long text on a word boundary. */
export function clip(text, max = 46) {
  const s = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,.;:]$/, '')}…`;
}

/* "$1M - $5M", "$50K +". */
export function bandShort(band) {
  if (!band) return null;
  const lo = compactUsd(band.min);
  const hi = compactUsd(band.max);
  if (lo && hi && lo !== hi) return `${lo} - ${hi}`;
  if (lo && !hi) return `${lo} +`;
  return hi || lo || null;
}

/* Sum of `get(row)` grouped by `key(row)`, largest first, top `n`. */
export function rankBy(rows, key, get, n = 8) {
  const m = new Map();
  for (const r of rows || []) {
    const k = key(r);
    const v = num(get(r));
    if (!k || v == null) continue;
    m.set(k, (m.get(k) || 0) + v);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
}

/* Drops null stats and findings so a missing field never prints a dash. */
export const stats = (...list) => list.filter((s) => s && s.value != null && s.value !== '');
export const lines = (...list) => list.filter(Boolean);

export function maxIso(...ds) {
  return ds.filter(Boolean).reduce((m, d) => (!m || String(d) > String(m) ? d : m), null);
}
