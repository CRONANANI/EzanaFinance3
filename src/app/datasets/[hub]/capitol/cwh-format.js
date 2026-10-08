/**
 * Capitol Watch hub display formatters. Pure, client-safe. Null renders as
 * the en dash, never as zero.
 */
import { usd, int, signedPct, shortDate } from '@/lib/titans/format';

export const DASH = '–';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** '2026-09-12' -> 'SEP 12' (mono labels and ticks). */
export function monthDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${MONTHS[+m[2] - 1]} ${m[3]}` : DASH;
}

/** '2026-09-12' -> 'Sep 12, 2026'. */
export const longDate = (iso) => shortDate(iso) || DASH;

/** Compact dollars: $1.24B, $860.0M, $15K. */
export function money(v) {
  const s = usd(v);
  if (!s) return DASH;
  return s.replace(/\.0M$/, 'M');
}

/** A disclosed range: '$15K to $50K'; one bound alone reads as 'over'. */
export function range(lo, hi) {
  const a = lo == null ? null : money(lo);
  const b = hi == null ? null : money(hi);
  if (a && b && a !== DASH && b !== DASH) return `${a} to ${b}`;
  if (a && a !== DASH) return `over ${a}`;
  return DASH;
}

export const count = (v) => int(v) ?? DASH;
export const signed = (v) => signedPct(v) ?? DASH;
export const pct1 = (v) =>
  v == null || !Number.isFinite(Number(v)) ? DASH : `${Number(v).toFixed(1)}%`;
export const pct0 = (v) =>
  v == null || !Number.isFinite(Number(v)) ? DASH : `${Math.round(Number(v))}%`;

/** One fact value by kind. */
export function factValue(f) {
  if (f.value == null) return DASH;
  switch (f.kind) {
    case 'signed-pct':
      return signed(f.value);
    case 'usd':
      return money(f.value);
    case 'int':
      return count(f.value);
    case 'pct':
      return `${pct1(f.value)}${f.of ? ` ${f.of}` : ''}`;
    case 'date':
      return monthDay(f.value);
    case 'range':
      return range(f.value[0], f.value[1]);
    default:
      return String(f.value);
  }
}

export const isMonoFact = (f) => f.kind !== 'text';

/** 'buy' | 'sell' from a disclosure's transaction type. */
export const side = (t) => (/^(s|sale|sell)/i.test(String(t || '')) ? 'sell' : 'buy');

export const partyClass = (p) => (p === 'D' ? 'is-dem' : p === 'R' ? 'is-rep' : 'is-ind');
