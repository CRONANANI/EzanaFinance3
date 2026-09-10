/**
 * Unit tests for the profile financial metrics (src/lib/profile-metrics.js) —
 * the 6 retail-friendly numbers on the My Profile page.
 *
 * No test runner is configured in this repo, so this is a self-contained
 * node:test file — run it directly:  node scripts/check-profile-metrics.mjs
 * (also wired as `npm run test:metrics`). Node's ESM syntax detection lets it
 * import the plain .js source without a "type":"module" package flag.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bucketMonthlyReturns,
  computeContributionStreak,
  computeAvgHoldingDays,
  sumPositions,
  computeProfileMetrics,
  __internal__,
} from '../src/lib/profile-metrics.js';

const { defaultPercentile } = __internal__;

// ── sumPositions: tolerant aggregation across feed shapes ──────────────────

test('sumPositions handles { costBasis, marketValue } rows', () => {
  const { cost, value } = sumPositions([
    { costBasis: 1000, marketValue: 1100 },
    { costBasis: 500, marketValue: 450 },
  ]);
  assert.equal(cost, 1500);
  assert.equal(value, 1550);
});

test('sumPositions handles { qty, avgCost, currentPrice } rows', () => {
  const { cost, value } = sumPositions([{ qty: 10, avgCost: 100, currentPrice: 110 }]);
  assert.equal(cost, 1000);
  assert.equal(value, 1100);
});

test('sumPositions falls back to entry price when no live price exists (no phantom P&L)', () => {
  const { cost, value } = sumPositions([{ qty: 3, avgCost: 50 }]);
  assert.equal(cost, 150);
  assert.equal(value, 150); // unknown price must not fabricate a gain or loss
});

test('sumPositions mixes shapes and ignores garbage rows', () => {
  const { cost, value } = sumPositions([
    { costBasis: 200, marketValue: 220 },
    { qty: 2, entry_price: 30, exit_price: 45 },
    { ticker: 'JUNK' }, // no numbers at all -> contributes zero
  ]);
  assert.equal(cost, 260);
  assert.equal(value, 310);
});

// ── bucketMonthlyReturns ───────────────────────────────────────────────────

test('bucketMonthlyReturns aggregates by UTC month and sorts ascending', () => {
  const rows = bucketMonthlyReturns([
    { closeDate: '2026-02-10T00:00:00Z', pnlPercent: 2 },
    { closeDate: '2026-02-20T00:00:00Z', pnlPercent: -0.5 },
    { closeDate: '2026-01-05T00:00:00Z', pnl_percent: 1.25 },
    { closeDate: 'not-a-date', pnlPercent: 99 }, // skipped
  ]);
  assert.deepEqual(rows, [
    { ym: '2026-01', ret: 1.25 },
    { ym: '2026-02', ret: 1.5 },
  ]);
});

// ── computeAvgHoldingDays ──────────────────────────────────────────────────

test('computeAvgHoldingDays averages only closed positions', () => {
  const avg = computeAvgHoldingDays([
    { status: 'closed', openDate: '2026-01-01T00:00:00Z', closeDate: '2026-01-11T00:00:00Z' }, // 10d
    { status: 'closed', openDate: '2026-01-01T00:00:00Z', closeDate: '2026-01-31T00:00:00Z' }, // 30d
    { status: 'open', openDate: '2026-01-01T00:00:00Z' }, // excluded
  ]);
  assert.equal(avg, 20);
});

test('computeAvgHoldingDays treats inverted date windows as zero, not negative', () => {
  const avg = computeAvgHoldingDays([
    { status: 'closed', openDate: '2026-03-01T00:00:00Z', closeDate: '2026-01-01T00:00:00Z' },
  ]);
  assert.equal(avg, 0);
});

// ── computeContributionStreak ──────────────────────────────────────────────

function isoMonthsAgo(n) {
  const d = new Date();
  d.setUTCDate(15); // mid-month keeps the fixture stable across timezones/day-ends
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString();
}

test('contribution streak counts consecutive months ending now', () => {
  const streak = computeContributionStreak(
    [
      { side: 'buy', openDate: isoMonthsAgo(0) },
      { side: 'buy', openDate: isoMonthsAgo(1) },
      { side: 'buy', openDate: isoMonthsAgo(2) },
    ],
    [],
  );
  assert.equal(streak, 3);
});

test('contribution streak breaks on a missing month', () => {
  const streak = computeContributionStreak(
    [
      { side: 'buy', openDate: isoMonthsAgo(0) },
      // gap at 1 month ago
      { side: 'buy', openDate: isoMonthsAgo(2) },
    ],
    [],
  );
  assert.equal(streak, 1);
});

test('contribution streak counts positive deposits but ignores zero/negative ones', () => {
  const withDeposit = computeContributionStreak([], [{ date: isoMonthsAgo(0), amount: 100 }]);
  assert.equal(withDeposit, 1);
  const withZero = computeContributionStreak([], [{ date: isoMonthsAgo(0), amount: 0 }]);
  assert.equal(withZero, 0);
});

test('sell trades do not extend the contribution streak', () => {
  const streak = computeContributionStreak([{ side: 'sell', openDate: isoMonthsAgo(0) }], []);
  assert.equal(streak, 0);
});

// ── computeProfileMetrics: the composed financial invariants ───────────────

test('totalReturn is (value - cost) / cost and vsSP500 subtracts the benchmark', () => {
  const m = computeProfileMetrics({
    positions: [{ costBasis: 10000, marketValue: 11000 }], // +10%
    benchmarkReturnPct: 4,
  });
  assert.equal(m.totalReturn.rawValue, 10);
  assert.equal(m.totalReturn.value, '10.00%');
  assert.equal(m.vsSP500.rawValue, 6);
  assert.equal(m.vsSP500.value, '+6.00%');
});

test('empty portfolio yields 0% return, never a divide-by-zero', () => {
  const m = computeProfileMetrics({ positions: [] });
  assert.equal(m.totalReturn.rawValue, 0);
  assert.equal(m.totalReturn.value, '0.00%');
});

test('diversification caps at 100 for 11+ sectors and scales linearly below', () => {
  const sectors = (n) =>
    Array.from({ length: n }, (_, i) => ({ costBasis: 1, marketValue: 1, sector: `S${i}` }));
  assert.equal(computeProfileMetrics({ positions: sectors(11) }).diversification.rawValue, 100);
  assert.equal(computeProfileMetrics({ positions: sectors(22) }).diversification.rawValue, 100);
  assert.ok(
    Math.abs(
      computeProfileMetrics({ positions: sectors(5) }).diversification.rawValue - (5 / 11) * 100,
    ) < 1e-9,
  );
});

test('percentiles are clamped to 0..100 even with a wild custom resolver', () => {
  const m = computeProfileMetrics({
    positions: [{ costBasis: 100, marketValue: 200 }],
    percentile: () => 250,
  });
  assert.equal(m.totalReturn.percentile, 100);
  const low = computeProfileMetrics({
    positions: [{ costBasis: 100, marketValue: 200 }],
    percentile: () => -40,
  });
  assert.equal(low.totalReturn.percentile, 0);
});

test('vsAverage compares against platform averages with signed formatting', () => {
  const m = computeProfileMetrics({
    positions: [{ costBasis: 100, marketValue: 110 }], // +10%
    platformAverages: { totalReturn: 6 },
  });
  assert.equal(m.totalReturn.vsAverage, 4);
  assert.equal(m.totalReturn.vsAverageFormatted, '+4.0%');
});

// ── defaultPercentile interpolation ────────────────────────────────────────

test('defaultPercentile clamps below/above the breakpoint range', () => {
  assert.equal(defaultPercentile('totalReturn', -100), 5);
  assert.equal(defaultPercentile('totalReturn', 500), 99);
});

test('defaultPercentile interpolates linearly between breakpoints', () => {
  // totalReturn: [0, 25] .. [6, 50] -> value 3 sits at 37.5 -> rounds to 38
  assert.equal(defaultPercentile('totalReturn', 3), 38);
});

test('defaultPercentile returns the median for unknown metrics', () => {
  assert.equal(defaultPercentile('nope', 42), 50);
});
