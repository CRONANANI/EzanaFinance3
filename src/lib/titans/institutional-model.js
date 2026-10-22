/**
 * Institutional Holdings (13F) page model: PURE calculation, no React, no
 * formatting, no I/O. Components render, this file calculates. Contract:
 * docs handoff 06-DATA-CONTRACT.md section 4; tested by
 * scripts/check-institutional.mjs.
 */

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Buyers minus sellers; zero-safe. */
export function netBreadth({ buyers, sellers } = {}) {
  return (num(buyers) || 0) - (num(sellers) || 0);
}

/**
 * Consensus vs Conviction quadrant. Boundaries are inclusive on the high
 * side: exactly 1,000 holders counts as widely held, exactly the weight
 * split counts as deeply held.
 */
export function quadrantOf(
  { holders, medianWeight } = {},
  { holderSplit = 1000, weightSplit = 0.01 } = {},
) {
  const wide = (num(holders) || 0) >= holderSplit;
  const deep = (num(medianWeight) || 0) >= weightSplit;
  if (wide && deep) return 'core';
  if (wide) return 'ballast';
  if (deep) return 'hidden';
  return 'tail';
}

/** Log10 x position, 0..1 over [min, max]. */
export function logX(holders, [min, max]) {
  const h = num(holders);
  if (h == null || h <= 0 || min <= 0 || max <= min) return 0;
  const t = (Math.log10(h) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
  return Math.max(0, Math.min(1, t));
}

/** Square-root y position, 0..1 over [0, max]. */
export function sqrtY(weight, [, max]) {
  const w = num(weight);
  if (w == null || w <= 0 || !max) return 0;
  return Math.max(0, Math.min(1, Math.sqrt(w / max)));
}

/** Conviction-map dot diameter in px: 7 + 30 x sqrt(value / max). */
export function dotSize(value, maxValue) {
  const v = num(value);
  const m = num(maxValue);
  if (v == null || v <= 0 || !m) return 7;
  return 7 + 30 * Math.sqrt(Math.min(1, v / m));
}

/** Effective number of positions: 1 / sum of squared weights. Empty = null. */
export function effectiveN(weights) {
  const list = (Array.isArray(weights) ? weights : []).map(num).filter((w) => w != null && w > 0);
  if (!list.length) return null;
  const ss = list.reduce((s, w) => s + w * w, 0);
  return ss > 0 ? 1 / ss : null;
}

/** The combined weight of the n largest weights (sorts internally). */
export function topNWeight(weights, n = 10) {
  const list = (Array.isArray(weights) ? weights : [])
    .map(num)
    .filter((w) => w != null && w > 0)
    .sort((a, b) => b - a);
  if (!list.length) return null;
  return list.slice(0, Math.max(1, n)).reduce((s, w) => s + w, 0);
}

/**
 * Flow-adjusted change in USD: share change at the current price. An exit
 * (sharesNow 0) uses the prior row's implied price, passed as priceNow by
 * the caller when the current one does not exist.
 */
export function flowAdjustedChange({ sharesNow, sharesPrior, priceNow } = {}) {
  const n = num(sharesNow) || 0;
  const p = num(sharesPrior) || 0;
  const price = num(priceNow);
  if (price == null) return null;
  return (n - p) * price;
}

/** Put notional / call notional; null when calls are zero. */
export function putCallRatio({ put, call } = {}) {
  const p = num(put);
  const c = num(call);
  if (p == null || c == null || c === 0) return null;
  return p / c;
}

/** Fractional price change; null when either close is missing. */
export function pctSince(priceThen, priceNow) {
  const a = num(priceThen);
  const b = num(priceNow);
  if (a == null || b == null || a === 0) return null;
  return (b - a) / a;
}

/** Weight overlap of two books: sum of min(wA, wB) over shared keys.
    a and b are maps or arrays of { key, w }. Identical books = 1. */
export function overlapByWeight(a, b) {
  const toMap = (x) => {
    if (x instanceof Map) return x;
    const m = new Map();
    for (const r of Array.isArray(x) ? x : []) {
      if (r?.key != null && num(r.w) != null) m.set(r.key, num(r.w));
    }
    return m;
  };
  const A = toMap(a);
  const B = toMap(b);
  let sum = 0;
  for (const [k, w] of A) {
    const wb = B.get(k);
    if (wb != null) sum += Math.min(w, wb);
  }
  return sum;
}

/** Whole days from a quarter end to a date (UTC). Sep 30 to Oct 22 = 22. */
export function filingDay(period, date) {
  const a = Date.parse(`${String(period).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${String(date).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

/** Cumulative count on a curve ([[day, cum], ...]) at or before a day. */
function curveAt(curve, day) {
  let out = 0;
  for (const [d, cum] of Array.isArray(curve) ? curve : []) {
    if (num(d) != null && d <= day) out = num(cum) || 0;
  }
  return out;
}

/** Open-quarter filings so far minus the prior quarter on the same day. */
export function filingCurveDiff(open, prior, day) {
  return curveAt(open, day) - curveAt(prior, day);
}

/** Share of the prior quarter's final count filed so far. */
export function pctFiled(openCount, priorFinal) {
  const n = num(openCount);
  const f = num(priorFinal);
  if (n == null || !f) return null;
  return n / f;
}

/** Sector rows for the dumbbell: ordered by current share, Unclassified
    forced last, each row carrying an `up` flag. */
export function sectorRows(sectors) {
  const rows = (Array.isArray(sectors) ? sectors : [])
    .map((s) => ({
      sector: s.sector || 'Unclassified',
      shareNow: num(s.shareNow ?? s.share_now) || 0,
      sharePrior: num(s.sharePrior ?? s.share_prior) || 0,
      flowUsd: num(s.flowUsd ?? s.flow_usd) || 0,
    }))
    .map((s) => ({ ...s, up: s.shareNow >= s.sharePrior }));
  const named = rows
    .filter((s) => s.sector !== 'Unclassified')
    .sort((a, b) => b.shareNow - a.shareNow);
  const rest = rows.filter((s) => s.sector === 'Unclassified');
  return [...named, ...rest];
}

/** Convergence rows: count the present signals, sort by count then breadth. */
export function convergenceRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((r) => ({
      ...r,
      count:
        (r.breadth ? 1 : 0) + (r.insider ? 1 : 0) + (r.congress ? 1 : 0) + (r.activist ? 1 : 0),
    }))
    .sort((a, b) => b.count - a.count || (num(b.netBreadth) || 0) - (num(a.netBreadth) || 0));
}

/** The next "nice" axis maximum above the largest |value|. */
export function divergingScale(values) {
  const max = Math.max(
    0,
    ...(Array.isArray(values) ? values : []).map((v) => Math.abs(num(v) || 0)),
  );
  if (!max) return 1;
  const mag = 10 ** Math.floor(Math.log10(max));
  const step = mag / 10;
  return Math.ceil(max / step) * step;
}
