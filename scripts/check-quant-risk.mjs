/**
 * Quant Lab: risk analytics for a backtest run and for a set of holdings (Nov 2026).
 *
 * Every expected number is worked out by hand in the comment above it, not
 * copied from the code under test.
 *
 *   node --no-warnings --test scripts/check-quant-risk.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  beta,
  contributionByTicker,
  correlation,
  covariance,
  drawdownEpisodes,
  extremeDays,
  moments,
  portfolioRisk,
  rollingStats,
  runRisk,
  tailRisk,
} from '../src/lib/quants/risk.js';

const near = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

/* Consecutive calendar days from 2024-01-01. */
const day = (i) => new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10);
const curveOf = (equities, extra = () => ({})) =>
  equities.map((equity, i) => ({ date: day(i), equity, ...extra(i) }));

/* ── Building blocks ── */

test('covariance, beta and correlation', () => {
  /* x = 1, 2, 3 (mean 2) and y = 2, 4, 7 (mean 13/3).
     Sum of cross products = (-1)(-7/3) + 0 + (1)(8/3) = 5, so cov = 5 / 2 = 2.5.
     var y = (49/9 + 1/9 + 64/9) / 2 = 19/3, so beta of x on y = 2.5 / 6.33333 = 0.3947368.
     sd x = 1, sd y = 2.5166115, so correlation = 2.5 / 2.5166115 = 0.9933993. */
  near(covariance([1, 2, 3], [2, 4, 7]), 2.5);
  near(beta([1, 2, 3], [2, 4, 7]), 0.3947368);
  near(correlation([1, 2, 3], [2, 4, 7]), 0.9933993);
  assert.equal(covariance([1], [1]), null);
  assert.equal(beta([1, 2, 3], [5, 5, 5]), null, 'no variance, no beta');
  assert.equal(correlation([1, 2, 3], [5, 5, 5]), null);
});

test('skew and kurtosis', () => {
  /* [-1, 0, 0, 1]: m2 = 0.5, m3 = 0, m4 = 0.5, so skew 0 and kurtosis 2. */
  const m = moments([-1, 0, 0, 1]);
  near(m.skew, 0);
  near(m.kurtosis, 2);
  /* [0, 0, 0, 4]: mean 1; m2 = (1+1+1+9)/4 = 3; m3 = (-1-1-1+27)/4 = 6;
     skew = 6 / 3^1.5 = 1.1547005. */
  near(moments([0, 0, 0, 4]).skew, 1.1547005);
  assert.deepEqual(moments([1, 2, 3]), { skew: null, kurtosis: null });
});

test('historical VaR and expected shortfall', () => {
  /* Twenty returns from -10% to +9% in 1% steps. The 5% quantile sits at
     position 0.05 * 19 = 0.95, so -0.10 + 0.95 * 0.01 = -0.0905.
     Only -0.10 is at or below it, so the shortfall is 0.10. */
  const returns = Array.from({ length: 20 }, (_, k) => (k - 10) / 100);
  const t = tailRisk(returns);
  near(t.valueAtRisk, 0.0905);
  near(t.expectedShortfall, 0.1);
  assert.deepEqual(tailRisk(returns.slice(0, 19)), { valueAtRisk: null, expectedShortfall: null });
});

/* ── Run risk ── */

test('drawdown episodes: depth, dates, recovery, deepest first', () => {
  /* 100, 110 | 99 | 104, 121 | 96.8 | 130 | 117
     A: peak 110 (day 1), trough 99 (day 2) = -10%, recovered at 121 (day 4).
     B: peak 121 (day 4), trough 96.8 (day 5) = -20%, recovered at 130 (day 6).
     C: peak 130 (day 6), trough 117 (day 7) = -10%, not recovered. */
  const episodes = drawdownEpisodes(curveOf([100, 110, 99, 104, 121, 96.8, 130, 117]));
  assert.equal(episodes.length, 3);
  assert.deepEqual(episodes[0], {
    peakDate: day(4),
    troughDate: day(5),
    recoveryDate: day(6),
    depth: -0.2,
    daysToTrough: 1,
    daysToRecover: 1,
  });
  assert.deepEqual(episodes[1], {
    peakDate: day(1),
    troughDate: day(2),
    recoveryDate: day(4),
    depth: -0.1,
    daysToTrough: 1,
    daysToRecover: 2,
  });
  assert.equal(episodes[2].recoveryDate, null);
  assert.equal(episodes[2].daysToRecover, null);
  assert.deepEqual(drawdownEpisodes(curveOf([100, 101, 102])), []);
  assert.equal(drawdownEpisodes(curveOf([100, 110, 99, 104, 121, 96.8, 130, 117]), 1).length, 1);
});

test('extreme days', () => {
  /* Returns: +10%, -10%, +5.0505%, -50%. */
  const e = extremeDays(curveOf([100, 110, 99, 104, 52]), 2);
  assert.deepEqual(
    e.worst.map((d) => d.date),
    [day(4), day(2)],
  );
  near(e.worst[0].return, -0.5);
  assert.deepEqual(
    e.best.map((d) => d.date),
    [day(1), day(3)],
  );
  near(e.best[0].return, 0.1);
});

test('rolling volatility and beta', () => {
  /* Benchmark returns 1%, -1%, 2%, 0%, 1%; the strategy returns exactly twice
     that each day, so every window has beta 2.
     First window of strategy returns: 2%, -2%, 4% (mean 1.33333%).
     Squared deviations sum to 0.00186667, / 2 = 0.00093333, sd = 0.03055050,
     annualised = 0.03055050 * sqrt(252) = 0.4849742. */
  const b = [0.01, -0.01, 0.02, 0, 0.01];
  let eq = 100;
  let bm = 50;
  const curve = [{ date: day(0), equity: eq, benchmark: bm }];
  b.forEach((r, i) => {
    eq *= 1 + 2 * r;
    bm *= 1 + r;
    curve.push({ date: day(i + 1), equity: eq, benchmark: bm });
  });
  const rolling = rollingStats(curve, 3);
  assert.equal(rolling.length, 3, 'one point per full window');
  assert.equal(rolling[0].date, day(3));
  near(rolling[0].volatility, 0.4849742, 1e-6);
  for (const p of rolling) near(p.beta, 2, 1e-9);
  assert.deepEqual(rollingStats(curve, 10), [], 'no full window, no points');
});

test('profit contribution by ticker ignores open trades and sorts by size', () => {
  const rows = contributionByTicker(
    [
      { ticker: 'BBB', pnl: 50, holdDays: 4 },
      { ticker: 'AAA', pnl: 300, holdDays: 10 },
      { ticker: 'AAA', pnl: -100, holdDays: 20 },
      { ticker: 'CCC', pnl: 999, holdDays: 1, open: true },
    ],
    10000,
  );
  /* AAA: 2 trades, 1 win, P&L 200 = 2% of 10,000, average hold 15 days. */
  assert.deepEqual(rows, [
    { ticker: 'AAA', trades: 2, winRate: 0.5, pnl: 200, contribution: 0.02, averageHoldDays: 15 },
    { ticker: 'BBB', trades: 1, winRate: 1, pnl: 50, contribution: 0.005, averageHoldDays: 4 },
  ]);
});

test('run report: distribution, exposure and the concentration note', () => {
  /* 25 sessions: up 1% on even days, down 0.5% on odd days. Invested on the
     first 5 sessions only. */
  let eq = 100;
  const curve = [{ date: day(0), equity: eq, grossExposure: 1, positions: 2 }];
  for (let i = 1; i < 25; i += 1) {
    eq *= i % 2 === 0 ? 1.01 : 0.995;
    curve.push({
      date: day(i),
      equity: eq,
      grossExposure: i < 5 ? 1 : 0,
      positions: i < 5 ? 2 : 0,
    });
  }
  const r = runRisk({
    curve,
    trades: [
      { ticker: 'AAA', pnl: 900, holdDays: 3 },
      { ticker: 'BBB', pnl: 100, holdDays: 3 },
      { ticker: 'CCC', pnl: -200, holdDays: 3 },
    ],
  });
  /* 24 returns, 12 of them positive. */
  assert.equal(r.distribution.observations, 24);
  near(r.distribution.positiveDays, 0.5);
  /* 5 of 25 sessions invested = 20%; average positions = 10 / 25 = 0.4. */
  near(r.exposure.timeInMarket, 0.2);
  near(r.exposure.averagePositions, 0.4);
  near(r.exposure.max, 1);
  /* 99% VaR needs 100 returns. */
  assert.equal(r.distribution.valueAtRisk99, null);
  assert.ok(r.distribution.valueAtRisk95 > 0);
  /* AAA made 900 of 1,000 winning profit. */
  assert.ok(r.notes.some((n) => n.includes('AAA') && n.includes('90%')));
  assert.ok(r.notes.some((n) => n.includes('20% of sessions')));
  assert.deepEqual(r.rolling, [], 'shorter than the rolling window');
  /* Nothing to analyse is not an error. */
  const empty = runRisk({});
  assert.deepEqual(empty.contributions, []);
  assert.equal(empty.distribution.skew, null);
});

/* ── Portfolio risk ── */

/* 80 sessions of closes that alternate +2% and -1%. */
function closes(start, n = 80, up = 0.02, down = -0.01) {
  let p = start;
  const out = [{ date: day(0), close: p }];
  for (let i = 1; i < n; i += 1) {
    p *= 1 + (i % 2 ? up : down);
    out.push({ date: day(i), close: p });
  }
  return out;
}

test('portfolio: weights, cash, and two identical holdings', () => {
  const a = closes(50);
  /* B has the same daily returns at twice the price. */
  const b = a.map((c) => ({ date: c.date, close: c.close * 2 }));
  const lastA = a[a.length - 1].close;
  /* 10 A and 5 B are worth the same; cash equals the two together. */
  const r = portfolioRisk({
    holdings: [
      { ticker: 'A', quantity: 10 },
      { ticker: 'B', quantity: 5 },
    ],
    cash: 20 * lastA,
    series: { A: a, B: b },
    benchmark: a,
  });
  assert.equal(r.empty, false);
  assert.equal(r.observations, 79);
  near(r.cashWeight, 0.5, 1e-4);
  near(r.holdings[0].weight, 0.25, 1e-4);
  near(r.holdings[1].weight, 0.25, 1e-4);
  /* Two equal positions. */
  near(r.effectiveHoldings, 2, 1e-2);
  /* Half the money moves exactly with A, so half A's volatility and beta 0.5. */
  near(r.volatility, r.holdings[0].volatility / 2, 1e-4);
  near(r.beta, 0.5, 1e-4);
  near(r.correlation, 1, 1e-4);
  near(r.averageCorrelation, 1, 1e-4);
  near(r.holdings[0].riskShare, 0.5, 1e-4);
  near(r.holdings[1].riskShare, 0.5, 1e-4);
  near(r.holdings[0].beta, 1, 1e-4);
  /* Worst day: half of -1%. */
  near(r.worstDay, -0.005, 1e-6);
  near(r.valueAtRisk95Dollars, r.valueAtRisk95 * r.totalValue, 0.01);
  assert.ok(r.notes.some((n) => n.includes('move closely together')));
});

test('portfolio: risk shares sum to one for different holdings', () => {
  const r = portfolioRisk({
    holdings: [
      { ticker: 'A', quantity: 10 },
      { ticker: 'B', quantity: 3 },
      { ticker: 'C', quantity: 7 },
    ],
    series: { A: closes(50), B: closes(80, 80, -0.015, 0.03), C: closes(20, 80, 0.005, 0.001) },
  });
  const sum = r.holdings.reduce((acc, h) => acc + h.riskShare, 0);
  near(sum, 1, 1e-3);
  assert.equal(r.beta, null, 'no benchmark, no beta');
  assert.equal(r.cashWeight, 0);
  assert.ok(r.holdings[0].weight >= r.holdings[1].weight, 'largest weight first');
});

test('portfolio: series are joined on date, short histories are left out', () => {
  const a = closes(50);
  const b = closes(30).filter((c) => c.date !== day(40));
  const r = portfolioRisk({
    holdings: [
      { ticker: 'A', quantity: 1 },
      { ticker: 'B', quantity: 1 },
      { ticker: 'NEW', quantity: 1 },
    ],
    series: { A: a, B: b, NEW: closes(10, 30) },
  });
  /* 79 shared sessions give 78 returns. */
  assert.equal(r.observations, 78);
  assert.deepEqual(r.skipped, ['NEW']);
  assert.ok(r.notes.some((n) => n.includes('NEW')));
  assert.equal(r.holdings.length, 2);
});

test('portfolio: nothing usable is reported as empty, not as zero risk', () => {
  assert.deepEqual(portfolioRisk({ holdings: [], series: {} }), { empty: true, skipped: [] });
  const short = portfolioRisk({
    holdings: [{ ticker: 'A', quantity: 1 }],
    series: { A: closes(50, 20) },
  });
  assert.equal(short.empty, true);
  assert.deepEqual(short.skipped, ['A']);
});

test('portfolio: a dominant holding is called out', () => {
  const r = portfolioRisk({
    holdings: [
      { ticker: 'A', quantity: 100 },
      { ticker: 'B', quantity: 1 },
    ],
    series: { A: closes(50), B: closes(50, 80, -0.01, 0.02) },
  });
  assert.ok(r.holdings[0].weight > 0.9);
  assert.ok(r.notes.some((n) => n.startsWith('A is')));
});
