/**
 * Sonar adaptive research: arithmetic on price series and reported results (Nov 2026).
 *
 * Pure. Risk and return statistics from daily closes, the position of a commodity price in
 * its own range, and the record of reported results against the estimate that preceded them.
 * Every figure is descriptive: nothing here is a forecast, and a statistic that needs more
 * history than there is comes back null.
 */
import { COMMODITIES } from '@/lib/sonar/commodity-stats';

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const round = (v, d = 2) => (num(v) == null ? null : Number(v.toFixed(d)));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const stdev = (xs) => {
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};
const clean = (rows, key = 'close') =>
  (rows || []).filter((r) => r?.date && num(r[key]) != null && r[key] > 0);

/**
 * Risk and return over the last `sessions` daily closes.
 * @returns {null | object} null with fewer than 60 sessions
 */
export function riskStats(bars, benchBars = [], { sessions = 252 } = {}) {
  const rows = clean(bars).slice(-(sessions + 1));
  if (rows.length < 61) return null;
  const rets = [];
  for (let i = 1; i < rows.length; i += 1)
    rets.push({ date: rows[i].date, r: rows[i].close / rows[i - 1].close - 1 });
  const rs = rets.map((x) => x.r);
  const totalPct = (rows.at(-1).close / rows[0].close - 1) * 100;
  const volPct = stdev(rs) * Math.sqrt(252) * 100;
  let peak = rows[0].close;
  let peakDate = rows[0].date;
  let dd = { pct: 0, from: rows[0].date, to: rows[0].date };
  for (const b of rows) {
    if (b.close > peak) {
      peak = b.close;
      peakDate = b.date;
    }
    const d = (b.close / peak - 1) * 100;
    if (d < dd.pct) dd = { pct: d, from: peakDate, to: b.date };
  }
  const best = rets.reduce((a, x) => (x.r > a.r ? x : a));
  const worst = rets.reduce((a, x) => (x.r < a.r ? x : a));
  /* Beta and correlation on the sessions both series share. */
  const bench = new Map(clean(benchBars).map((b) => [b.date, b.close]));
  const pairs = [];
  for (let i = 1; i < rows.length; i += 1) {
    const b0 = bench.get(rows[i - 1].date);
    const b1 = bench.get(rows[i].date);
    if (b0 && b1) pairs.push([rs[i - 1], b1 / b0 - 1]);
  }
  let beta = null;
  let corr = null;
  let benchTotalPct = null;
  if (pairs.length >= 60) {
    const xa = pairs.map((p) => p[0]);
    const xb = pairs.map((p) => p[1]);
    const ma = mean(xa);
    const mb = mean(xb);
    const cov = pairs.reduce((s, [a, b]) => s + (a - ma) * (b - mb), 0) / (pairs.length - 1);
    const vb = stdev(xb) ** 2;
    beta = vb > 0 ? cov / vb : null;
    corr = vb > 0 && stdev(xa) > 0 ? cov / (stdev(xa) * stdev(xb)) : null;
    const b0 = bench.get(rows[0].date);
    const b1 = bench.get(rows.at(-1).date);
    benchTotalPct = b0 && b1 ? (b1 / b0 - 1) * 100 : null;
  }
  return {
    sessions: rets.length,
    from: rows[0].date,
    asOf: rows.at(-1).date,
    totalPct: round(totalPct),
    benchTotalPct: round(benchTotalPct),
    volPct: round(volPct, 1),
    /* Return per unit of volatility over the window. No risk-free rate is subtracted. */
    returnPerVol: volPct > 0 ? round(totalPct / volPct) : null,
    maxDrawdown: { pct: round(dd.pct, 1), from: dd.from, to: dd.to },
    best: { date: best.date, pct: round(best.r * 100) },
    worst: { date: worst.date, pct: round(worst.r * 100) },
    upDaysPct: round((rs.filter((r) => r > 0).length / rs.length) * 100, 0),
    beta: round(beta),
    correlation: round(corr),
  };
}

/** The commodity a question names (specific names first), or null. */
export function commodityIdOf(question) {
  const q = ` ${String(question || '').toLowerCase()} `;
  for (const c of COMMODITIES)
    if (
      c.words.some((w) =>
        new RegExp(`[^a-z]${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z]`).test(q),
      )
    )
      return c.id;
  return null;
}

/**
 * Where a price sits in its own history.
 * @param {{ date: string, value: number }[]} points  oldest first
 */
export function rangeStats(points) {
  const rows = clean(points, 'value');
  if (rows.length < 20) return null;
  const last = rows.at(-1);
  const back = (days) => {
    const cut = new Date(Date.parse(`${last.date}T00:00:00Z`) - days * 86400000)
      .toISOString()
      .slice(0, 10);
    const base = [...rows].reverse().find((r) => r.date <= cut);
    return base ? round((last.value / base.value - 1) * 100, 1) : null;
  };
  const hi = rows.reduce((a, r) => (r.value > a.value ? r : a));
  const lo = rows.reduce((a, r) => (r.value < a.value ? r : a));
  return {
    asOf: last.date,
    from: rows[0].date,
    last: last.value,
    change1mPct: back(30),
    change3mPct: back(91),
    change1yPct: back(365),
    high: { value: hi.value, date: hi.date },
    low: { value: lo.value, date: lo.date },
    /* 0 at the low of the window, 100 at the high. */
    rangePositionPct:
      hi.value > lo.value
        ? round(((last.value - lo.value) / (hi.value - lo.value)) * 100, 0)
        : null,
    observations: rows.length,
  };
}

/**
 * Reported results against the estimate that preceded them.
 * @param {{ date, epsActual, epsEstimated, revenueActual, revenueEstimated }[]} rows
 * @param {Date} now
 */
export function earningsRecord(rows, now) {
  const today = now.toISOString().slice(0, 10);
  const list = (rows || []).filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(String(r?.date || '')));
  const upcoming = list
    .filter((r) => r.date >= today && num(r.epsActual) == null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const surprise = (a, e) =>
    num(a) != null && num(e) != null && e !== 0 ? ((a - e) / Math.abs(e)) * 100 : null;
  const reported = list
    .filter((r) => r.date <= today && num(r.epsActual) != null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((r) => ({
      date: r.date,
      epsActual: r.epsActual,
      epsEstimated: num(r.epsEstimated),
      epsSurprisePct: round(surprise(r.epsActual, r.epsEstimated), 1),
      revenueActual: num(r.revenueActual),
      revenueEstimated: num(r.revenueEstimated),
      revenueSurprisePct: round(surprise(r.revenueActual, r.revenueEstimated), 1),
    }));
  const judged = reported.filter((r) => r.epsSurprisePct != null);
  return {
    next: upcoming[0]
      ? {
          date: upcoming[0].date,
          epsEstimated: num(upcoming[0].epsEstimated),
          revenueEstimated: num(upcoming[0].revenueEstimated),
        }
      : null,
    reported,
    judged: judged.length,
    epsAbove: judged.filter((r) => r.epsSurprisePct > 0).length,
    epsBelow: judged.filter((r) => r.epsSurprisePct < 0).length,
  };
}
