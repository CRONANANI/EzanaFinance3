/**
 * Aggregates for user_trades rows (social trading).
 */

export const PERIODS = ['all_time', 'year', 'month', 'week'];

export function getPeriodStartIso(period) {
  if (period === 'all_time') return null;
  const now = Date.now();
  const day = 86400000;
  if (period === 'week') return new Date(now - 7 * day).toISOString();
  if (period === 'month') return new Date(now - 30 * day).toISOString();
  if (period === 'year') return new Date(now - 365 * day).toISOString();
  return null;
}

/** Trades that count toward period stats (opened on or after period start). */
export function filterTradesForPeriod(trades, period) {
  const start = getPeriodStartIso(period);
  if (!start) return trades;
  const t0 = new Date(start).getTime();
  return (trades || []).filter((t) => {
    const o = t.opened_at ? new Date(t.opened_at).getTime() : 0;
    return o >= t0;
  });
}

function num(x) {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * @returns {object} stats used by profile + leaderboard
 */
export function computeUserStats(trades) {
  const list = trades || [];
  const closed = list.filter((t) => t.status === 'closed' || t.status === 'partial_exit');
  const withPnl = closed.filter((t) => num(t.pnl_percent) !== null);
  const wins = withPnl.filter((t) => num(t.pnl_percent) > 0);
  const losses = withPnl.filter((t) => num(t.pnl_percent) < 0);
  const flat = withPnl.filter((t) => num(t.pnl_percent) === 0);

  const avgWin =
    wins.length > 0 ? wins.reduce((s, t) => s + num(t.pnl_percent), 0) / wins.length : 0;
  const avgLossMag =
    losses.length > 0
      ? losses.reduce((s, t) => s + Math.abs(num(t.pnl_percent)), 0) / losses.length
      : 0;
  const avgReturn =
    withPnl.length > 0
      ? withPnl.reduce((s, t) => s + num(t.pnl_percent), 0) / withPnl.length
      : 0;
  const winRate = withPnl.length > 0 ? (wins.length / withPnl.length) * 100 : 0;
  const breakEvenRate = withPnl.length > 0 ? (flat.length / withPnl.length) * 100 : 0;
  const sumGain = withPnl.reduce((s, t) => s + num(t.pnl_percent), 0);
  const active = list.filter((t) => t.status === 'open').length;
  const totalTrades = list.length;

  /** Proxy for "avg max drawdown": average loss magnitude on losing trades */
  const avgMaxDrawdownProxy = avgLossMag;

  /** Risk/reward: avg win / avg loss magnitude */
  const riskReward = avgLossMag > 0 ? avgWin / avgLossMag : avgWin > 0 ? 99 : 0;

  const score =
    winRate * 200 +
    avgReturn * 100 +
    totalTrades * 50 +
    active * 25 -
    avgMaxDrawdownProxy * 50;

  return {
    totalTrades,
    activeTrades: active,
    closedCount: closed.length,
    winRate,
    avgGain: avgWin,
    avgLoss: avgLossMag,
    avgReturn,
    breakEvenRate,
    sumGain,
    avgMax: avgMaxDrawdownProxy,
    riskReward,
    score: Number.isFinite(score) ? score : 0,
    winsCount: wins.length,
    lossesCount: losses.length,
  };
}

/** Radar axes 0–100 for chart (normalized vs optional benchmark averages). */
export function buildRadarPayload(userStats, benchmarkStats) {
  const b = benchmarkStats || {
    totalTrades: 40,
    winRate: 55,
    avgReturn: 8,
    riskReward: 1,
    avgMax: 12,
  };
  const scale = (v, max) => Math.min(100, Math.max(0, (v / max) * 100));

  const u = userStats;
  return [
    { key: 'TOTAL TRADES', user: scale(u.totalTrades, Math.max(b.totalTrades * 1.5, 80)), bench: scale(b.totalTrades, Math.max(b.totalTrades * 1.5, 80)) },
    { key: 'AVG RETURN', user: scale(Math.max(0, u.avgReturn + 20), 50), bench: scale(Math.max(0, b.avgReturn + 20), 50) },
    { key: 'RISK REWARD', user: scale(u.riskReward, 3) * 33.33, bench: scale(b.riskReward, 3) * 33.33 },
    { key: 'WIN RATE', user: u.winRate, bench: b.winRate },
    { key: 'AVG DRAWDOWN', user: 100 - scale(u.avgMax, 40), bench: 100 - scale(b.avgMax, 40) },
  ];
}

export function scoreTooltipText() {
  return 'Score = (Win Rate × 200) + (Avg Return × 100) + (Total Trades × 0.5) + (Active Trades × 25) − (Avg Loss Magnitude × 50). Weights tuned for balance.';
}
