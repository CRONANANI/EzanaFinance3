#!/usr/bin/env node
/* Institutional Holdings (13F) page model
   (src/lib/titans/institutional-model.js). Contract: the handoff's
   06-DATA-CONTRACT.md section 4.
   Usage: node --no-warnings --test scripts/check-institutional.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convergenceRows,
  divergingScale,
  dotSize,
  effectiveN,
  filingCurveDiff,
  filingDay,
  flowAdjustedChange,
  logX,
  netBreadth,
  overlapByWeight,
  pctFiled,
  pctSince,
  putCallRatio,
  quadrantOf,
  sectorRows,
  sqrtY,
  topNWeight,
} from '../src/lib/titans/institutional-model.js';

test('netBreadth: zero and negative', () => {
  assert.equal(netBreadth({ buyers: 862, sellers: 541 }), 321);
  assert.equal(netBreadth({ buyers: 0, sellers: 0 }), 0);
  assert.equal(netBreadth({ buyers: 10, sellers: 40 }), -30);
  assert.equal(netBreadth({}), 0);
});

test('quadrantOf: each quadrant, boundaries inclusive on the high side', () => {
  assert.equal(quadrantOf({ holders: 2000, medianWeight: 0.02 }), 'core');
  assert.equal(quadrantOf({ holders: 2000, medianWeight: 0.002 }), 'ballast');
  assert.equal(quadrantOf({ holders: 200, medianWeight: 0.02 }), 'hidden');
  assert.equal(quadrantOf({ holders: 200, medianWeight: 0.002 }), 'tail');
  // boundaries: exactly at the split counts as the high side
  assert.equal(quadrantOf({ holders: 1000, medianWeight: 0.01 }), 'core');
  assert.equal(quadrantOf({ holders: 999, medianWeight: 0.0099 }), 'tail');
});

test('conviction scales: known points', () => {
  // 1,000 holders on [100, 7943] -> 0.5263
  assert.ok(Math.abs(logX(1000, [100, 7943]) - 0.5263) < 0.001);
  assert.equal(logX(100, [100, 7943]), 0);
  assert.equal(logX(7943, [100, 7943]), 1);
  // 1% on [0, 5%] -> sqrt(0.2) = 0.4472
  assert.ok(Math.abs(sqrtY(0.01, [0, 0.05]) - 0.4472) < 0.001);
  assert.equal(sqrtY(0, [0, 0.05]), 0);
  assert.equal(sqrtY(0.05, [0, 0.05]), 1);
});

test('dotSize: 7 at zero, 37 at max', () => {
  assert.equal(dotSize(0, 100), 7);
  assert.equal(dotSize(100, 100), 37);
  assert.ok(dotSize(25, 100) === 7 + 30 * 0.5);
});

test('effectiveN: equal weights n -> n, single -> 1, empty -> null', () => {
  const eq = Array.from({ length: 8 }, () => 1 / 8);
  assert.ok(Math.abs(effectiveN(eq) - 8) < 1e-9);
  assert.equal(effectiveN([1]), 1);
  assert.equal(effectiveN([]), null);
  assert.equal(effectiveN(null), null);
});

test('topNWeight sorts internally', () => {
  assert.ok(Math.abs(topNWeight([0.01, 0.4, 0.05, 0.3], 2) - 0.7) < 1e-9);
  assert.equal(topNWeight([], 10), null);
});

test('flowAdjustedChange: exit uses the prior implied price', () => {
  assert.equal(flowAdjustedChange({ sharesNow: 150, sharesPrior: 100, priceNow: 10 }), 500);
  // exit: caller passes the prior row's implied price as priceNow
  assert.equal(flowAdjustedChange({ sharesNow: 0, sharesPrior: 200, priceNow: 5 }), -1000);
  assert.equal(flowAdjustedChange({ sharesNow: 10, sharesPrior: 0, priceNow: null }), null);
});

test('putCallRatio: call 0 -> null', () => {
  assert.equal(putCallRatio({ put: 50, call: 100 }), 0.5);
  assert.equal(putCallRatio({ put: 50, call: 0 }), null);
  assert.equal(putCallRatio({}), null);
});

test('pctSince: missing -> null', () => {
  assert.ok(Math.abs(pctSince(100, 92.2) - -0.078) < 1e-9);
  assert.equal(pctSince(null, 100), null);
  assert.equal(pctSince(100, null), null);
  assert.equal(pctSince(0, 100), null);
});

test('overlapByWeight: identical -> 1, disjoint -> 0', () => {
  const a = [
    { key: 'AAPL', w: 0.6 },
    { key: 'MSFT', w: 0.4 },
  ];
  assert.ok(Math.abs(overlapByWeight(a, a) - 1) < 1e-9);
  assert.equal(overlapByWeight(a, [{ key: 'XOM', w: 1 }]), 0);
  assert.ok(
    Math.abs(
      overlapByWeight(a, [
        { key: 'AAPL', w: 0.2 },
        { key: 'MSFT', w: 0.9 },
      ]) - 0.6,
    ) < 1e-9,
  );
});

test('filingDay: Sep 30 -> Oct 22 = 22', () => {
  assert.equal(filingDay('2026-09-30', '2026-10-22'), 22);
  assert.equal(filingDay('2026-09-30', '2026-09-30'), 0);
  assert.equal(filingDay('bad', '2026-10-22'), null);
});

test('filingCurveDiff and pctFiled', () => {
  const open = [
    [0, 0],
    [10, 900],
    [22, 2318],
  ];
  const prior = [
    [0, 0],
    [22, 2075],
    [45, 9412],
  ];
  assert.equal(filingCurveDiff(open, prior, 22), 243);
  assert.ok(Math.abs(pctFiled(2318, 9412) - 0.2463) < 0.001);
  assert.equal(pctFiled(100, 0), null);
});

test('sectorRows: ordered by current share, Unclassified last, up flag', () => {
  const rows = sectorRows([
    { sector: 'Unclassified', shareNow: 0.3, sharePrior: 0.3 },
    { sector: 'Tech', shareNow: 0.29, sharePrior: 0.27 },
    { sector: 'Energy', shareNow: 0.04, sharePrior: 0.05 },
  ]);
  assert.deepEqual(
    rows.map((r) => r.sector),
    ['Tech', 'Energy', 'Unclassified'],
  );
  assert.equal(rows[0].up, true);
  assert.equal(rows[1].up, false);
});

test('convergenceRows: sorts by signal count then breadth', () => {
  const rows = convergenceRows([
    { ticker: 'A', breadth: true, insider: false, congress: false, activist: false, netBreadth: 5 },
    { ticker: 'B', breadth: true, insider: true, congress: true, activist: false, netBreadth: 2 },
    { ticker: 'C', breadth: true, insider: true, congress: true, activist: false, netBreadth: 9 },
  ]);
  assert.deepEqual(
    rows.map((r) => r.ticker),
    ['C', 'B', 'A'],
  );
  assert.equal(rows[0].count, 3);
});

test('divergingScale: next nice step up', () => {
  assert.equal(divergingScale([1842, -300]), 1900);
  assert.equal(divergingScale([311]), 320);
  assert.equal(divergingScale([]), 1);
});

/* ── Security X-ray: Largest holders ──────────────────────────────────── */

const { groupSharesByCik, holderFlag, largestHolders } =
  await import('../src/lib/titans/institutional-model.js');

test('largest holders: a filer reporting several lines is summed by CIK', () => {
  const by = groupSharesByCik([
    { cik: '1', shares: 100, valueUsd: 10 },
    { cik: '1', shares: 50, valueUsd: 5 },
    { cik: '2', shares: 120, valueUsd: 12 },
  ]);
  assert.equal(by.get('1').shares, 150);
  assert.equal(by.get('1').valueUsd, 15);
  const out = largestHolders({ rows: [...by.values()] });
  assert.deepEqual(
    out.holders.map((h) => [h.cik, h.shares]),
    [
      ['1', 150],
      ['2', 120],
    ],
  );
  assert.equal(out.filers, 2);
  assert.equal(out.totalShares13F, 270);
});

test('largest holders: QoQ flags new / added / trimmed / exited / unchanged', () => {
  assert.equal(holderFlag(10, 0), 'new');
  assert.equal(holderFlag(0, 10), 'exited');
  assert.equal(holderFlag(12, 10), 'added');
  assert.equal(holderFlag(8, 10), 'trimmed');
  assert.equal(holderFlag(10, 10), 'unchanged');
  assert.equal(holderFlag(10, null), null);
});

test('largest holders: no prior 13F means no flag and no change, never "new"', () => {
  const out = largestHolders({
    rows: [
      { cik: 'A', shares: 300 },
      { cik: 'B', shares: 200 },
      { cik: 'C', shares: 100 },
    ],
    priorRows: [{ cik: 'A', shares: 250 }],
    priorFilers: ['A', 'B'],
  });
  const by = Object.fromEntries(out.holders.map((h) => [h.cik, h]));
  assert.equal(by.A.flag, 'added');
  assert.equal(by.A.changeShares, 50);
  assert.equal(by.B.flag, 'new'); // filed last quarter without this security
  assert.equal(by.C.flag, null); // no 13F last quarter at all
  assert.equal(by.C.priorShares, null);
});

test('largest holders: pctOf13F sums to <= 100% across all holders, top 15 only', () => {
  const rows = Array.from({ length: 40 }, (_, i) => ({ cik: String(i), shares: 1000 - i * 7 }));
  const out = largestHolders({ rows, limit: 15 });
  assert.equal(out.holders.length, 15);
  const sum = out.holders.reduce((s, h) => s + h.pctOf13F, 0);
  assert.ok(sum > 0 && sum <= 1 + 1e-9);
  const full = largestHolders({ rows, limit: 100 });
  const all = full.holders.reduce((s, h) => s + h.pctOf13F, 0);
  assert.ok(Math.abs(all - 1) < 1e-9);
  assert.ok(out.holders.every((h, i, a) => i === 0 || a[i - 1].shares >= h.shares));
});

test('largest holders: % of outstanding only when shares outstanding is known', () => {
  const rows = [{ cik: '1', shares: 50 }];
  assert.equal(largestHolders({ rows }).holders[0].pctOfOutstanding, null);
  assert.equal(largestHolders({ rows, sharesOutstanding: 1000 }).holders[0].pctOfOutstanding, 0.05);
});
