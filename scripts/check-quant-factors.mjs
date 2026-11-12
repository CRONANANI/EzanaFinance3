/**
 * Quant Lab: factor research (Nov 2026).
 *
 * Every expected number is worked out by hand in the comment above it, not
 * copied from the code under test.
 *
 *   node --no-warnings --test scripts/check-quant-factors.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FACTORS, bucket, buildPanel, factorStudy } from '../src/lib/quants/factors.js';

const near = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

/* Month-end rows from January 2020: [['2020-01-31', close], ...]. */
const monthRows = (closes, startYear = 2020) =>
  closes.map((close, k) => {
    const y = startYear + Math.floor(k / 12);
    const m = String((k % 12) + 1).padStart(2, '0');
    return [`${y}-${m}-28`, close];
  });
/* Closes from a list of monthly returns, starting at 100. */
const fromReturns = (rets) => {
  const out = [100];
  for (const r of rets) out.push(out[out.length - 1] * (1 + r));
  return out;
};

/* ── Panel ── */

test('panel: months are continuous, gaps are null, the unfinished month is left out', () => {
  const panel = buildPanel(
    {
      AAA: [
        ['2020-01-31', 10],
        ['2020-02-28', 11],
        ['2020-04-30', 12],
        ['2020-05-15', 99],
      ],
      BBB: [
        ['2020-02-28', 20],
        ['2020-03-31', 21],
      ],
      EMPTY: [],
    },
    '2020-05',
  );
  assert.deepEqual(panel.months, ['2020-01', '2020-02', '2020-03', '2020-04']);
  assert.deepEqual(panel.closes.AAA, [10, 11, null, 12]);
  assert.deepEqual(panel.closes.BBB, [null, 20, 21, null]);
  assert.equal(panel.closes.EMPTY, undefined);
  assert.deepEqual(panel.faults, []);
});

test('panel: an impossible one-month jump drops the history before it', () => {
  /* 10 -> 50 is +400% in a month: an unadjusted split, not a return. */
  const panel = buildPanel(
    { AAA: monthRows([10, 10, 50, 51]), BBB: monthRows([10, 11, 12, 13]) },
    '2021-01',
  );
  assert.deepEqual(panel.closes.AAA, [null, null, 50, 51]);
  assert.deepEqual(panel.closes.BBB, [10, 11, 12, 13]);
  assert.deepEqual(panel.faults, ['AAA']);
});

/* ── Scores ── */

test('factor scores use month-end closes up to the scoring month only', () => {
  /* 10% growth every month: c[k] = 100 * 1.1^k. */
  const c = Array.from({ length: 14 }, (_, k) => 100 * 1.1 ** k);
  /* Momentum 12-1 at t = 12: c[11] / c[0] - 1 = 1.1^11 - 1 = 1.8531167. */
  near(FACTORS.momentum_12_1.score(c, 12), 1.8531167, 1e-6);
  /* Momentum 6-1 at t = 6: c[5] / c[0] - 1 = 1.1^5 - 1 = 0.61051. */
  near(FACTORS.momentum_6_1.score(c, 6), 0.61051, 1e-9);
  /* Reversal at t = 1: minus the last month's +10%. */
  near(FACTORS.reversal_1.score(c, 1), -0.1, 1e-12);
  /* Not enough history. */
  assert.equal(FACTORS.momentum_12_1.score(c.slice(0, 5), 4), null);
  /* The latest month is skipped: changing c[12] does not move the score at t = 12. */
  const bumped = [...c];
  bumped[12] *= 3;
  near(FACTORS.momentum_12_1.score(bumped, 12), 1.8531167, 1e-6);
  /* And nothing after t is read. */
  bumped[13] *= 3;
  near(FACTORS.momentum_12_1.score(bumped, 12), 1.8531167, 1e-6);
});

test('low volatility scores the calmer stock higher', () => {
  /* Twelve returns alternating +10% and -10%: mean 0, sample sd =
     sqrt(12 * 0.01 / 11) = 0.1044466, so the score is -0.1044466. */
  const wild = fromReturns(Array.from({ length: 12 }, (_, k) => (k % 2 ? -0.1 : 0.1)));
  near(FACTORS.low_volatility_12.score(wild, 12), -0.1044466, 1e-6);
  const calm = fromReturns(Array.from({ length: 12 }, (_, k) => (k % 2 ? -0.01 : 0.01)));
  assert.ok(FACTORS.low_volatility_12.score(calm, 12) > FACTORS.low_volatility_12.score(wild, 12));
  assert.equal(FACTORS.low_volatility_12.score(wild, 11), null, 'needs 12 returns');
});

test('buckets are near-equal and ordered bottom first', () => {
  assert.deepEqual(bucket([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5), [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
    [9, 10],
  ]);
  /* 7 into 3: positions 0-2, 3-4, 5-6. */
  assert.deepEqual(
    bucket([1, 2, 3, 4, 5, 6, 7], 3).map((b) => b.length),
    [3, 2, 2],
  );
});

/* ── A study with a known answer ── */

/* Fifteen stocks. Stock i (1 to 15) gains i% in odd months and loses i% in
   even months, for 7 months (8 closes, January to August 2020). Reversal
   ranks last month's biggest losers highest, and here they always bounce, so
   the factor is perfectly predictive. */
const SERIES = {};
for (let i = 1; i <= 15; i += 1) {
  const rets = Array.from({ length: 7 }, (_, k) => ((k + 1) % 2 ? i / 100 : -i / 100));
  SERIES[`S${String(i).padStart(2, '0')}`] = monthRows(fromReturns(rets));
}
const PANEL = buildPanel(SERIES, '2020-09');

test('a perfectly predictive factor: spread, IC, groups, turnover', () => {
  const r = factorStudy({ panel: PANEL, factor: 'reversal_1', groups: 3 });
  assert.equal(r.empty, false);
  /* Scoring months February to July: 6 months, each with a next-month return. */
  assert.equal(r.months, 6);
  assert.equal(r.from, '2020-02');
  assert.deepEqual(r.stocks, { average: 15, min: 15, max: 15 });
  /* After an up month the top group is stocks 1-5 (next month -3% on
     average) and the bottom is stocks 11-15 (-13%): spread 10%.
     After a down month the top is stocks 11-15 (+13%) and the bottom 1-5
     (+3%): spread 10%. So the spread is 10% every month. */
  near(r.spread.meanMonthly, 0.1);
  near(r.spread.annualised, 1.2);
  near(r.spread.hitRate, 1);
  near(r.spread.worstMonth, 0.1);
  /* A constant spread has no deviation, so no t-statistic or Sharpe. */
  assert.equal(r.spread.tStat, null);
  assert.equal(r.spread.sharpe, null);
  /* Score order equals return order every month. */
  near(r.ic.mean, 1);
  near(r.ic.hitRate, 1);
  /* Top group: -3%, +13% alternating, three of each: mean 5%. Bottom: -5%. Middle: 0. */
  near(r.groupStats[2].meanMonthly, 0.05);
  near(r.groupStats[1].meanMonthly, 0);
  near(r.groupStats[0].meanMonthly, -0.05);
  near(r.monotonicity, 1);
  /* The top group is entirely different every month. */
  near(r.turnover, 1);
  /* Six months of a 10% spread compound to 1.1^6 = 1.771561. */
  assert.equal(r.curve.length, 7);
  near(r.curve[6].spread, 1.771561);
  assert.equal(r.curve[0].month, '2020-02');
  assert.equal(r.curve[6].month, '2020-08');
  assert.ok(r.notes.some((n) => n.includes('Only 6 months')));
  assert.ok(r.notes.some((n) => n.includes('survivorship')));
  assert.ok(r.notes.some((n) => n.includes('100% of the top group')));
});

test('decay: the same scores against returns further ahead', () => {
  const r = factorStudy({ panel: PANEL, factor: 'reversal_1', groups: 3 });
  const byH = Object.fromEntries(r.decay.map((d) => [d.months, d]));
  /* One month ahead is the study itself. */
  near(byH[1].meanIc, 1);
  assert.equal(byH[1].observations, 6);
  /* Three months ahead: (1+i)(1-i)(1+i) - 1 keeps the sign and order of the
     first step, so the ranking still holds. Scoring months February to May
     have a close three months later: 4 observations. */
  near(byH[3].meanIc, 1);
  assert.equal(byH[3].observations, 4);
  /* No close 12 months ahead in an 8 month panel. */
  assert.equal(byH[12].meanIc, null);
  assert.equal(byH[12].observations, 0);
});

test('no look-ahead: later prices never change an earlier month', () => {
  const altered = {};
  for (const [t, rows] of Object.entries(SERIES)) {
    /* Change the last two closes (July and August) of every stock. */
    altered[t] = rows.map(([d, c], k) => [d, k >= 6 ? c * (1 + (t.charCodeAt(2) % 5) / 10) : c]);
  }
  const a = factorStudy({ panel: PANEL, factor: 'reversal_1', groups: 3 });
  const b = factorStudy({ panel: buildPanel(altered, '2020-09'), factor: 'reversal_1', groups: 3 });
  /* Scoring months February to May use closes through June only. */
  assert.deepEqual(b.monthly.slice(0, 4), a.monthly.slice(0, 4));
  assert.deepEqual(b.curve.slice(0, 5), a.curve.slice(0, 5));
  assert.notDeepEqual(b.monthly.slice(4), a.monthly.slice(4));
});

test('a window limits the study to the most recent months', () => {
  const r = factorStudy({ panel: PANEL, factor: 'reversal_1', groups: 3, months: 2 });
  assert.equal(r.months, 2);
  assert.equal(r.from, '2020-06');
});

test('too few stocks is reported as empty, not as a result', () => {
  const few = {};
  for (const t of Object.keys(SERIES).slice(0, 9)) few[t] = SERIES[t];
  /* 3 groups need 15 stocks; there are 9. */
  const r = factorStudy({ panel: buildPanel(few, '2020-09'), factor: 'reversal_1', groups: 3 });
  assert.equal(r.empty, true);
  assert.equal(r.skipped, 6);
  /* Momentum needs 12 months of history; the panel has 8. */
  assert.equal(factorStudy({ panel: PANEL, factor: 'momentum_12_1', groups: 3 }).empty, true);
});

test('deterministic, and an unknown factor is refused', () => {
  assert.deepEqual(
    factorStudy({ panel: PANEL, factor: 'reversal_1', groups: 3 }),
    factorStudy({ panel: PANEL, factor: 'reversal_1', groups: 3 }),
  );
  assert.throws(() => factorStudy({ panel: PANEL, factor: 'astrology' }), /Unknown factor/);
});
