/**
 * Profile metrics: the 6 retail-friendly numbers we show on the My Profile
 * page in place of drawdown / win-rate / risk-reward etc.
 *
 * Each metric is designed to be:
 *   - easy to compute from data we already collect (mock portfolio, live
 *     brokerage holdings, or `user_trades` rows),
 *   - comparable across users regardless of portfolio size,
 *   - meaningful to an everyday investor (no Sharpe, no Sortino).
 *
 * Callers pass the raw portfolio / trade / deposit arrays plus
 * platform-wide averages (from `/api/platform/aggregates`) and a percentile
 * resolver; the lib handles the math and formatting.
 */

const SECTOR_CAP = 11; // S&P 500 sector count — caps Diversification at 100.

/** Safe number parse — returns `fallback` for nullish/NaN. */
const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Bucket a series of closed trades (or deposits) into {year, month, return%}
 * rows. Used by Consistency Score.
 *
 * @param {Array<{openDate?: string, closeDate?: string, pnlPercent?: number, created_at?: string, updated_at?: string, pnl_percent?: number}>} trades
 * @returns {Array<{ym: string, ret: number}>}
 */
export function bucketMonthlyReturns(trades) {
  const byMonth = new Map();
  for (const t of trades || []) {
    const iso = t.closeDate || t.updated_at || t.openDate || t.created_at;
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const ret = num(t.pnlPercent ?? t.pnl_percent, 0);
    byMonth.set(ym, (byMonth.get(ym) || 0) + ret);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([ym, ret]) => ({ ym, ret }));
}

/**
 * Count consecutive months (ending at the most recent) with at least one
 * buy trade or deposit. Missing month = streak ends.
 *
 * @param {Array<{openDate?: string, side?: string, created_at?: string, type?: string}>} trades
 * @param {Array<{date?: string, amount?: number}>} deposits
 */
export function computeContributionStreak(trades = [], deposits = []) {
  const months = new Set();
  for (const t of trades) {
    const side = (t.side || t.type || '').toLowerCase();
    const iso = t.openDate || t.created_at;
    if (!iso) continue;
    if (side && side !== 'buy' && side !== 'deposit') continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    months.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  for (const dep of deposits) {
    const iso = dep.date || dep.created_at;
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    if (num(dep.amount, 0) <= 0) continue;
    months.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  let streak = 0;
  const cursor = new Date();
  cursor.setUTCDate(1);
  for (;;) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!months.has(key)) break;
    streak += 1;
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
    if (streak > 120) break; // safety
  }
  return streak;
}

/**
 * Average holding period in days across closed positions.
 *
 * @param {Array<{openDate?: string, closeDate?: string, created_at?: string, updated_at?: string, status?: string}>} trades
 */
export function computeAvgHoldingDays(trades = []) {
  const closed = trades.filter((t) => {
    if (t.status && t.status !== 'closed' && t.status !== 'partial_exit') return false;
    return Boolean(t.closeDate || t.updated_at);
  });
  if (!closed.length) return 0;
  const sumDays = closed.reduce((s, t) => {
    const close = new Date(t.closeDate || t.updated_at);
    const open = new Date(t.openDate || t.created_at || t.updated_at);
    const days = (close.getTime() - open.getTime()) / 86400000;
    return s + (Number.isFinite(days) && days > 0 ? days : 0);
  }, 0);
  return sumDays / closed.length;
}

/**
 * Reduce a set of positions to aggregate cost basis & current value.
 * Tolerates the half-dozen different shapes we see across mock/live feeds:
 *   - { costBasis, marketValue }
 *   - { avgCost, qty, currentPrice }
 *   - { entry_price, exit_price, size }
 *
 * @param {Array<object>} positions
 */
export function sumPositions(positions = []) {
  let cost = 0;
  let value = 0;
  for (const p of positions) {
    const cb = num(p.costBasis ?? p.totalCostBasis, NaN);
    const mv = num(p.marketValue ?? p.totalValue ?? p.posValue, NaN);
    if (Number.isFinite(cb) && Number.isFinite(mv)) {
      cost += cb;
      value += mv;
      continue;
    }
    const qty = num(p.qty ?? p.totalQuantity ?? p.size, 0);
    const avg = num(p.avgCost ?? p.entry_price, 0);
    const last = num(p.currentPrice ?? p.lastPrice ?? p.exit_price, avg);
    cost += qty * avg;
    value += qty * last;
  }
  return { cost, value };
}

/** Collect unique, non-empty sector names from positions. */
function uniqueSectors(positions = []) {
  const s = new Set();
  for (const p of positions) {
    const v = (p.sector || p.industry || '').trim();
    if (v) s.add(v);
  }
  return s;
}

function formatDelta(n, unit) {
  if (!Number.isFinite(n)) return `—`;
  const sign = n >= 0 ? '+' : '';
  const digits = unit === '%' ? 1 : 0;
  return `${sign}${n.toFixed(digits)}${unit}`;
}

/**
 * Default percentile resolver — linear interpolation between a few known
 * breakpoints. Callers may pass a better resolver from the aggregates API.
 */
function defaultPercentile(metricKey, rawValue) {
  const breakpoints = {
    totalReturn: [[-30, 5], [0, 25], [6, 50], [15, 75], [30, 90], [60, 99]],
    vsSP500: [[-20, 5], [-5, 25], [0, 50], [5, 75], [15, 90], [30, 99]],
    consistency: [[0, 5], [40, 25], [55, 50], [70, 75], [85, 90], [100, 99]],
    diversification: [[0, 5], [30, 25], [55, 50], [75, 75], [90, 90], [100, 99]],
    holdingDiscipline: [[0, 5], [15, 25], [60, 50], [150, 75], [365, 90], [1000, 99]],
    contributionStreak: [[0, 10], [1, 30], [3, 50], [6, 75], [12, 90], [24, 99]],
  };
  const pts = breakpoints[metricKey];
  if (!pts) return 50;
  if (rawValue <= pts[0][0]) return pts[0][1];
  if (rawValue >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    if (rawValue >= x1 && rawValue <= x2) {
      const t = (rawValue - x1) / (x2 - x1 || 1);
      return Math.round(y1 + t * (y2 - y1));
    }
  }
  return 50;
}

/**
 * Main entry point.
 *
 * @param {object} args
 * @param {Array<object>} args.positions
 * @param {Array<object>} args.trades
 * @param {Array<object>} [args.deposits]
 * @param {number} args.benchmarkReturnPct - SPY cumulative return over the same window.
 * @param {Record<string, number>} [args.platformAverages]
 * @param {(metricKey: string, rawValue: number) => number} [args.percentile]
 */
export function computeProfileMetrics({
  positions = [],
  trades = [],
  deposits = [],
  benchmarkReturnPct = 0,
  platformAverages = {},
  percentile,
} = {}) {
  const { cost, value } = sumPositions(positions);
  const totalReturn = cost > 0 ? ((value - cost) / cost) * 100 : 0;

  const holdingDays = computeAvgHoldingDays(trades);

  const monthly = bucketMonthlyReturns(trades);
  const positiveMonths = monthly.filter((m) => m.ret > 0).length;
  const consistency = monthly.length > 0 ? (positiveMonths / monthly.length) * 100 : 0;

  const sectors = uniqueSectors(positions);
  const diversification = (Math.min(sectors.size, SECTOR_CAP) / SECTOR_CAP) * 100;

  const contributionStreak = computeContributionStreak(trades, deposits);

  const vsSP500 = totalReturn - num(benchmarkReturnPct, 0);

  const pctFn = typeof percentile === 'function' ? percentile : defaultPercentile;

  /** Small factory keeps card shapes identical. */
  const mk = (key, label, formatted, rawValue, unit, higherIsBetter = true) => {
    const avg = num(platformAverages[key], 0);
    const delta = rawValue - avg;
    return {
      key,
      label,
      value: formatted,
      rawValue,
      vsAverage: delta,
      vsAverageFormatted: formatDelta(delta, unit),
      percentile: Math.max(0, Math.min(100, Math.round(pctFn(key, rawValue)))),
      higherIsBetter,
    };
  };

  return {
    totalReturn: mk(
      'totalReturn',
      'Total Return',
      `${totalReturn.toFixed(2)}%`,
      totalReturn,
      '%',
    ),
    vsSP500: mk(
      'vsSP500',
      'vs. S&P 500',
      `${vsSP500 >= 0 ? '+' : ''}${vsSP500.toFixed(2)}%`,
      vsSP500,
      '%',
    ),
    consistency: mk(
      'consistency',
      'Consistency',
      `${Math.round(consistency)}%`,
      consistency,
      '%',
    ),
    diversification: mk(
      'diversification',
      'Diversification',
      `${Math.round(diversification)}/100`,
      diversification,
      '',
    ),
    holdingDiscipline: mk(
      'holdingDiscipline',
      'Avg Hold Time',
      holdingDays >= 1 ? `${Math.round(holdingDays)}d` : '—',
      holdingDays,
      'd',
    ),
    contributionStreak: mk(
      'contributionStreak',
      'Contribution Streak',
      `${contributionStreak} mo`,
      contributionStreak,
      'mo',
    ),
  };
}

export const METRIC_KEYS = [
  'totalReturn',
  'vsSP500',
  'consistency',
  'diversification',
  'holdingDiscipline',
  'contributionStreak',
];

export const __internal__ = { defaultPercentile };
