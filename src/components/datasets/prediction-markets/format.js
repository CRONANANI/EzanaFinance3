/**
 * Display formatting for the Prediction Markets page. Strings only; every
 * number arrives already calculated by page-model.js. Times are shown in ET,
 * the venues' own clock.
 */
const ET = 'America/New_York';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** 0.285 -> '28.5%'. Whole numbers drop the decimal: 0.1 -> '10%'. */
export function pct(p, digits = 1) {
  if (!isNum(p)) return 'n/a';
  const v = p * 100;
  const s = v.toFixed(digits);
  return `${s.endsWith('.0') ? s.slice(0, -2) : s}%`;
}

/** Probability as a bare number for big readouts: 0.285 -> '28.5'. */
export function pctNumber(p) {
  if (!isNum(p)) return 'n/a';
  const s = (p * 100).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/** Signed points from a 0..1 change: -0.03 -> '-3.0 pts'. */
export function pts(change, digits = 1) {
  if (!isNum(change)) return 'n/a';
  const v = change * 100;
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}${Math.abs(v).toFixed(digits)} pts`;
}

/** Points already in points: 3.2 -> '+3.2 pts'. */
export function ptsRaw(v, digits = 1) {
  if (!isNum(v)) return 'n/a';
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}${Math.abs(v).toFixed(digits)} pts`;
}

function compact(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(Math.round(v));
}

/** Dollars, compact: 552555 -> '$553K'. */
export function usd(v) {
  if (!isNum(v)) return 'n/a';
  return `${v < 0 ? '-' : ''}$${compact(Math.abs(v))}`;
}

/** Kalshi contracts, compact: 1240000 -> '1.2M ct'. */
export function contracts(v) {
  if (!isNum(v)) return 'n/a';
  return `${compact(v)} ct`;
}

/** Volume in the venue's own unit. */
export function venueVolume(v, venue) {
  return venue === 'kalshi' ? contracts(v) : usd(v);
}

/** Signed dollars: 202394 -> '+$202K'. */
export function signedUsd(v) {
  if (!isNum(v)) return 'n/a';
  return `${v > 0 ? '+' : v < 0 ? '-' : ''}$${compact(Math.abs(v))}`;
}

/** A plain number with one decimal and grouping, no currency: 1058643.5 -> '1,058,643.5'. */
export function plain1(v) {
  if (!isNum(v)) return 'n/a';
  return v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function int(v) {
  if (!isNum(v)) return 'n/a';
  return v.toLocaleString('en-US');
}

const fmt = (opts) => new Intl.DateTimeFormat('en-US', { timeZone: ET, ...opts });
const F_DATE = fmt({ month: 'short', day: 'numeric', year: 'numeric' });
const F_MD = fmt({ month: 'short', day: 'numeric' });
const F_TIME = fmt({ hour: '2-digit', minute: '2-digit', hour12: false });
const F_TIME_S = fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const F_WD = fmt({ weekday: 'short' });
const F_D = fmt({ day: 'numeric' });
const F_MON = fmt({ month: 'short' });

const toDate = (v) => {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** 'Oct 27, 2026' */
export function date(v) {
  const d = toDate(v);
  return d ? F_DATE.format(d) : 'n/a';
}

/** 'Oct 27' */
export function monthDay(v) {
  const d = toDate(v);
  return d ? F_MD.format(d) : 'n/a';
}

/** '14:05 ET' */
export function timeEt(v) {
  const d = toDate(v);
  return d ? `${F_TIME.format(d)} ET` : 'n/a';
}

/** '14:05:12 ET' */
export function timeEtSeconds(v) {
  const d = toDate(v);
  return d ? `${F_TIME_S.format(d)} ET` : 'n/a';
}

/** 'Oct 18, 2026 · 14:05 ET' */
export function dateTimeEt(v) {
  const d = toDate(v);
  return d ? `${F_DATE.format(d)} · ${F_TIME.format(d)} ET` : 'n/a';
}

/** Day key 'YYYY-MM-DD' (already ET) -> 'MON 19'. */
export function dayLabel(key) {
  const d = new Date(`${key}T12:00:00Z`);
  return `${F_WD.format(d).toUpperCase()} ${F_D.format(d)}`;
}

/** Day key -> 'Thu'. */
export function weekday(key) {
  return F_WD.format(new Date(`${key}T12:00:00Z`));
}

/** Chart x-axis tick by range. */
export function axisTick(t, range) {
  const d = toDate(t);
  if (!d) return '';
  if (range === '1d') return F_TIME.format(d);
  if (range === 'all') return `${F_MON.format(d)} ${String(d.getUTCFullYear()).slice(2)}`;
  return F_MD.format(d);
}

/** '0x60a9…5a71' */
export function shortWallet(w) {
  const s = String(w || '');
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

export const VENUE_LABEL = { polymarket: 'Polymarket', kalshi: 'Kalshi' };
export const VENUE_SHORT = { polymarket: 'POLY', kalshi: 'KALSHI' };
