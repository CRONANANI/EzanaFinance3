/**
 * Mock Trading risk snapshot (Nov 2026): range return, drawdown, volatility
 * and beta from the daily portfolio value series and its benchmark.
 * Pure: no React, no DOM, no fetch, no imports. Tested by
 * scripts/check-mock-thesis.mjs.
 *
 * Series points are { at, value } (what /api/portfolio/mock-value-series
 * returns) or { t, v }. A mock account has no deposits or withdrawals, so a
 * day's change in value is that day's return.
 *
 *   range return   last value / first value - 1
 *   max drawdown   largest fall from a running peak, as a negative percent
 *   volatility     sample standard deviation of daily returns x sqrt(252)
 *   beta           covariance(portfolio, benchmark) / variance(benchmark),
 *                  on the days both series have a return
 */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Fewer daily points than this and the statistics read "N/A". */
export const MIN_RISK_POINTS = 20;
export const TRADING_DAYS = 252;

const stampOf = (p) => p?.at ?? p?.t ?? null;
const valueOf = (p) => Number(p?.value ?? p?.v);
const dayOf = (p) => {
  const s = stampOf(p);
  if (s == null) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/** One point per calendar day (the last one that day), oldest first, value > 0. */
export function dailySeries(points) {
  const byDay = new Map();
  for (const p of Array.isArray(points) ? points : []) {
    const day = dayOf(p);
    const value = valueOf(p);
    if (day && isNum(value) && value > 0) byDay.set(day, value);
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, value]) => ({ day, value }));
}

/** Percent change from the first to the last point; null with under two points. */
export function rangeReturn(points) {
  const s = dailySeries(points);
  if (s.length < 2) return null;
  return (s[s.length - 1].value / s[0].value - 1) * 100;
}

/** [{ day, r }] for each day after the first. */
export function dailyReturns(points) {
  const s = dailySeries(points);
  const out = [];
  for (let i = 1; i < s.length; i += 1)
    out.push({ day: s[i].day, r: s[i].value / s[i - 1].value - 1 });
  return out;
}

/** Largest peak-to-trough fall as a percent at or below zero; null with no data. */
export function maxDrawdown(points) {
  const s = dailySeries(points);
  if (s.length < 2) return null;
  let peak = s[0].value;
  let worst = 0;
  for (const { value } of s) {
    if (value > peak) peak = value;
    const dd = value / peak - 1;
    if (dd < worst) worst = dd;
  }
  return worst * 100;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Annualised volatility as a percent; null with under two returns. */
export function annualisedVolatility(points) {
  const rs = dailyReturns(points).map((x) => x.r);
  if (rs.length < 2) return null;
  const m = mean(rs);
  const variance = rs.reduce((a, r) => a + (r - m) ** 2, 0) / (rs.length - 1);
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS) * 100;
}

/** Beta of the portfolio against the benchmark; null when it cannot be measured. */
export function beta(points, benchmark) {
  const bench = new Map(dailyReturns(benchmark).map((x) => [x.day, x.r]));
  const pairs = dailyReturns(points)
    .filter((x) => bench.has(x.day))
    .map((x) => [x.r, bench.get(x.day)]);
  if (pairs.length < 2) return null;
  const mp = mean(pairs.map((p) => p[0]));
  const mb = mean(pairs.map((p) => p[1]));
  let cov = 0;
  let varB = 0;
  for (const [p, b] of pairs) {
    cov += (p - mp) * (b - mb);
    varB += (b - mb) ** 2;
  }
  return varB > 0 ? cov / varB : null;
}

/**
 * Rebase a benchmark so its first point equals the portfolio's first value,
 * keeping only days from the portfolio's first day on. Used by the series
 * route for the S&P 500 line. Returns [{ at, value }].
 */
export function rebaseBenchmark(points, benchmark) {
  const port = dailySeries(points);
  if (!port.length) return [];
  const bench = dailySeries(benchmark).filter((b) => b.day >= port[0].day);
  if (!bench.length) return [];
  const k = port[0].value / bench[0].value;
  return bench.map((b) => ({ at: `${b.day}T16:00:00.000Z`, value: b.value * k }));
}

/**
 * The Risk snapshot card's four rows.
 *
 * @param {{ points: Array, benchmark?: Array,
 *   positions?: Array<{ symbol: string, value: number }>, totalValue?: number }} p
 * @returns {{ enough: boolean,
 *   concentration: { symbol: string, weight: number } | null,
 *   maxDrawdownPct: number|null, volatilityPct: number|null, beta: number|null }}
 *   The three series statistics are null (shown as "N/A") until there are
 *   MIN_RISK_POINTS daily points. Concentration is live and needs no history.
 */
export function riskSnapshot({ points, benchmark = [], positions = [], totalValue = 0 }) {
  const total = Number(totalValue) || 0;
  let top = null;
  for (const p of Array.isArray(positions) ? positions : []) {
    const v = Number(p.value) || 0;
    if (v > 0 && (!top || v > top.value)) top = { symbol: p.symbol, value: v };
  }
  const concentration =
    top && total > 0 ? { symbol: top.symbol, weight: (top.value / total) * 100 } : null;
  const enough = dailySeries(points).length >= MIN_RISK_POINTS;
  return {
    enough,
    concentration,
    maxDrawdownPct: enough ? maxDrawdown(points) : null,
    volatilityPct: enough ? annualisedVolatility(points) : null,
    beta: enough ? beta(points, benchmark) : null,
  };
}
