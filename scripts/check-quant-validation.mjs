/**
 * Quant Lab: validation statistics, parameter sweeps and walk-forward (Nov 2026).
 *
 * Reference values in the statistics tests come from an independent normal
 * distribution implementation, not from the code under test. The structural
 * tests prove the leakage rules: a parameter choice never depends on the data
 * it is later scored on.
 *
 *   node --no-warnings --test scripts/check-quant-validation.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_COMBOS,
  applyParamSet,
  buildGrid,
  estimateWork,
  expectedMaxSharpe,
  normCdf,
  normInv,
  normalizeAxes,
  normalizeValidationOptions,
  probabilisticSharpe,
  runValidation,
  shapeStats,
  spearman,
  tunableParams,
  walkForwardFolds,
} from '../src/lib/quants/validation.js';
import { normalizeConfig, validateSpec } from '../src/lib/quants/strategy-spec.js';
import {
  parseValues,
  suggestValues,
  toApiConfig,
} from '../src/components/quants/lab/lab-format.js';

const near = (a, b, tol = 1e-4) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

function sessions(n, start = '2019-01-01') {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  while (out.length < n) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/* Deterministic price path: a linear congruential generator, so the fixture
   has realistic variety without Math.random(). */
function path(dates, seed, drift = 0.0004, vol = 0.014) {
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  let p = 100;
  return dates.map((date) => {
    const open = p * (1 + (next() - 0.5) * 0.004);
    /* Sum of three uniforms: roughly bell shaped, mean zero. */
    const shock = (next() + next() + next() - 1.5) * vol * 2;
    p = Math.max(1, p * (1 + drift + shock));
    return {
      date,
      open,
      high: Math.max(open, p) * 1.002,
      low: Math.min(open, p) * 0.998,
      close: p,
      volume: 1e6,
    };
  });
}

const cond = (id, params) => ({ op: 'cond', id, params });
const SPEC = validateSpec({
  universe: ['AAA', 'BBB', 'CCC'],
  benchmark: 'MKT',
  side: 'long',
  entry: { op: 'and', args: [cond('rsi_below', { threshold: 35, period: 14 })] },
  exit: {
    rule: { op: 'or', args: [cond('rsi_above', { threshold: 55, period: 14 })] },
    stopLossPct: 10,
  },
  sizing: { type: 'equal_weight', maxPositions: 3 },
}).spec;

const DATES = sessions(1100);
const fixture = () => ({
  bars: { AAA: path(DATES, 11), BBB: path(DATES, 22), CCC: path(DATES, 33) },
  benchmarkBars: path(DATES, 99, 0.0003, 0.009),
});
const CONFIG = normalizeConfig(
  { startDate: DATES[100], endDate: DATES[DATES.length - 1] },
  '2026-11-11',
).config;
const THRESHOLD = 'entry.params.threshold';
const optionsFor = (raw) => {
  const { options, errors } = normalizeValidationOptions(SPEC, raw);
  assert.deepEqual(errors, []);
  return options;
};
const SWEEP = { axes: [{ path: THRESHOLD, values: [25, 30, 35, 40] }], folds: 4 };

/* ── Statistics ── */

test('normal CDF and its inverse match reference values', () => {
  near(normCdf(0), 0.5, 1e-7);
  near(normCdf(1.96), 0.9750021, 1e-6);
  near(normCdf(-1.96), 1 - 0.9750021, 1e-6);
  near(normInv(0.975), 1.959964, 1e-6);
  near(normInv(0.01), -2.3263479, 1e-6);
  near(normInv(0.5), 0, 1e-9);
});

test('Spearman: perfect, reversed, and ties share their rank', () => {
  near(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1, 1e-12);
  near(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1, 1e-12);
  /* x ranks 1, 2.5, 2.5, 4 and y ranks 1, 2, 3, 4:
     cov 4.5, var x 4.5, var y 5, so r = 4.5 / sqrt(22.5) = 0.9486833. */
  near(spearman([1, 2, 2, 3], [1, 2, 3, 4]), 0.9486833, 1e-6);
  assert.equal(spearman([1, 2], [1, 2]), null);
  assert.equal(spearman([1, 1, 1], [1, 2, 3]), null);
});

test('skew and kurtosis of a small symmetric sample', () => {
  /* [-1, 0, 0, 1]: m2 = 0.5, m3 = 0, m4 = 0.5, so skew 0 and kurtosis 0.5 / 0.25 = 2. */
  const s = shapeStats([-1, 0, 0, 1]);
  near(s.skew, 0, 1e-12);
  near(s.kurtosis, 2, 1e-12);
  assert.deepEqual(shapeStats([1, 2, 3]), { skew: null, kurtosis: null });
  assert.deepEqual(shapeStats([2, 2, 2, 2]), { skew: null, kurtosis: null });
});

test('expected maximum Sharpe of unskilled trials', () => {
  /* One trial is not a search: no luck hurdle. */
  assert.equal(expectedMaxSharpe(1, 1), 0);
  assert.equal(expectedMaxSharpe(10, 0), 0);
  /* 10 trials, unit variance:
     (1 - g) * inv(0.9) + g * inv(1 - 1 / (10e)) = 1.5745983. */
  near(expectedMaxSharpe(10, 1), 1.5745983, 1e-5);
  /* Scales with the standard deviation of the trial Sharpes. */
  near(expectedMaxSharpe(10, 0.04), 1.5745983 * 0.2, 1e-5);
  assert.ok(expectedMaxSharpe(40, 1) > expectedMaxSharpe(10, 1));
});

test('probabilistic and deflated Sharpe ratio', () => {
  /* Daily Sharpe 0.1 over 253 returns, normal shape, against zero:
     z = 0.1 * sqrt(252) / sqrt(1 + 0.5 * 0.01) = 1.58350, so 0.9433459. */
  near(
    probabilisticSharpe({ sharpe: 0.1, observations: 253, skew: 0, kurtosis: 3 }),
    0.9433459,
    1e-5,
  );
  /* Same Sharpe against a 0.05 luck hurdle, skew -0.5, kurtosis 5:
     z = 0.05 * sqrt(252) / sqrt(1 + 0.05 + 0.01) = 0.77094, so 0.7796270. */
  near(
    probabilisticSharpe({
      sharpe: 0.1,
      observations: 253,
      skew: -0.5,
      kurtosis: 5,
      benchmarkSharpe: 0.05,
    }),
    0.779627,
    1e-5,
  );
  assert.equal(probabilisticSharpe({ sharpe: null, observations: 253 }), null);
  assert.equal(probabilisticSharpe({ sharpe: 0.1, observations: 2 }), null);
});

/* ── Parameters and grids ── */

test('tunable parameters are read from the spec with their bounds', () => {
  const params = tunableParams(SPEC);
  assert.deepEqual(
    params.map((p) => p.path),
    [
      'entry.params.threshold',
      'entry.params.period',
      'exit.rule.params.threshold',
      'exit.rule.params.period',
      'exit.stopLossPct',
    ],
  );
  const t = params[0];
  assert.equal(t.current, 35);
  assert.equal(t.kind, 'num');
  assert.ok(t.min < t.max);
});

test('applying a parameter set changes only that value and re-validates', () => {
  const next = applyParamSet(SPEC, { [THRESHOLD]: 25 });
  assert.equal(next.ok, true);
  assert.equal(next.spec.entry.params.threshold, 25);
  assert.equal(SPEC.entry.params.threshold, 35, 'the original spec is untouched');
  assert.equal(next.spec.exit.stopLossPct, 10);
  assert.equal(applyParamSet(SPEC, { 'entry.args.9.params.threshold': 25 }).ok, false);
  /* A crossover whose fast period is not below its slow period is rejected. */
  const cross = validateSpec({
    ...SPEC,
    entry: { op: 'and', args: [cond('sma_cross_up', { fast: 20, slow: 50 })] },
  }).spec;
  assert.equal(applyParamSet(cross, { 'entry.params.fast': 60 }).ok, false);
});

test('axes are cleaned, bounded and capped', () => {
  const ok = normalizeAxes(SPEC, [{ path: THRESHOLD, values: [40, '25', 25, 30.5, 'x'] }]);
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.axes[0].values, [25, 30.5, 40]);
  const period = normalizeAxes(SPEC, [{ path: 'entry.params.period', values: [7.4, 14, 21] }]);
  assert.deepEqual(period.axes[0].values, [7, 14, 21], 'integer parameters are rounded');
  assert.ok(normalizeAxes(SPEC, [{ path: 'nope', values: [1, 2] }]).errors.length);
  assert.ok(normalizeAxes(SPEC, [{ path: THRESHOLD, values: [30] }]).errors.length);
  assert.ok(normalizeAxes(SPEC, [{ path: THRESHOLD, values: [30, 500] }]).errors.length);
  const big = normalizeAxes(SPEC, [
    { path: THRESHOLD, values: [20, 22, 24, 26, 28, 30, 32] },
    { path: 'exit.rule.params.threshold', values: [50, 55, 60, 65, 70, 75, 80] },
  ]);
  assert.ok(
    big.errors.some((e) => e.includes(String(MAX_COMBOS))),
    '49 combinations is over the cap',
  );
});

test('the grid is the cartesian product of the axes', () => {
  assert.deepEqual(buildGrid([]), []);
  const grid = buildGrid([
    { path: 'a', values: [1, 2] },
    { path: 'b', values: [10, 20, 30] },
  ]);
  assert.equal(grid.length, 6);
  assert.deepEqual(grid[0], { a: 1, b: 10 });
  assert.deepEqual(grid[5], { a: 2, b: 30 });
});

/* ── Walk-forward folds ── */

test('rolling folds train on two blocks and test on the next, with no overlap', () => {
  const dates = sessions(240);
  const folds = walkForwardFolds(dates, 4, 'rolling');
  assert.equal(folds.length, 4);
  /* 240 sessions / (4 + 2) = blocks of 40. */
  assert.deepEqual(folds[0], {
    trainStart: dates[0],
    trainEnd: dates[79],
    testStart: dates[80],
    testEnd: dates[119],
  });
  assert.equal(folds[1].trainStart, dates[40]);
  assert.equal(folds[3].testEnd, dates[239], 'the last fold runs to the end of the window');
  for (let i = 0; i < folds.length; i += 1) {
    assert.ok(folds[i].trainEnd < folds[i].testStart, 'training ends before testing starts');
    if (i) assert.ok(folds[i - 1].testEnd < folds[i].testStart, 'test periods do not overlap');
  }
});

test('anchored folds always train from the first session', () => {
  const dates = sessions(240);
  const folds = walkForwardFolds(dates, 4, 'anchored');
  assert.ok(folds.every((f) => f.trainStart === dates[0]));
  assert.equal(folds[2].trainEnd, dates[159]);
});

test('a window too short for the folds is refused', () => {
  assert.throws(() => walkForwardFolds(sessions(200), 8), /too short/);
});

/* ── The full report ── */

test('split: in-sample and out-of-sample chain exactly to the full result', () => {
  const r = runValidation({ spec: SPEC, config: CONFIG, ...fixture(), options: optionsFor({}) });
  const { full, inSample, outOfSample, splitDate } = r.split;
  near((1 + inSample.totalReturn) * (1 + outOfSample.totalReturn), 1 + full.totalReturn, 1e-5);
  assert.equal(inSample.endDate, splitDate);
  assert.equal(outOfSample.startDate, splitDate);
  assert.equal(inSample.closedTrades + outOfSample.closedTrades, full.closedTrades);
  /* 70% of the sessions are in sample (default). */
  near(inSample.observations / full.observations, 0.7, 0.01);
  assert.equal(r.sweep, null, 'no axes, no sweep');
});

test('cost sensitivity: free at 0x, and never better when costs rise', () => {
  const r = runValidation({ spec: SPEC, config: CONFIG, ...fixture(), options: optionsFor({}) });
  const rows = r.costSensitivity;
  assert.deepEqual(
    rows.map((x) => x.multiple),
    [0, 1, 2, 3],
  );
  assert.equal(rows[0].totalCosts, 0);
  assert.equal(rows[1].totalReturn, r.split.full.totalReturn, '1x is the base run');
  for (let i = 1; i < rows.length; i += 1) {
    assert.ok(rows[i].totalCosts > rows[i - 1].totalCosts);
  }
  assert.ok(rows[3].totalReturn < rows[0].totalReturn);
});

test('sweep: every combination is scored, and the winner is the best eligible in-sample row', () => {
  const r = runValidation({ spec: SPEC, config: CONFIG, ...fixture(), options: optionsFor(SWEEP) });
  const s = r.sweep;
  assert.equal(s.combinations, 4);
  assert.equal(s.rows.length, 4);
  assert.deepEqual(
    s.rows.map((x) => x.params[THRESHOLD]),
    [25, 30, 35, 40],
  );
  assert.ok(s.bestIndex >= 0);
  const eligible = s.rows.filter((x) => x.eligible);
  const top = Math.max(...eligible.map((x) => x.is.sharpe));
  assert.equal(s.rows[s.bestIndex].is.sharpe, top);
  for (const row of s.rows) {
    assert.ok(row.is.endDate <= r.split.splitDate, 'fitted on in-sample data only');
    assert.ok(row.oos.startDate > r.split.splitDate, 'scored on later data only');
  }
  assert.ok(s.deflatedSharpe === null || (s.deflatedSharpe >= 0 && s.deflatedSharpe <= 1));
  assert.ok(s.luckHurdleSharpe >= 0);
  assert.ok(r.warnings.some((w) => w.includes('4 parameter combinations')));
});

test('no leakage: changing prices after the split changes no in-sample result or selection', () => {
  const a = runValidation({ spec: SPEC, config: CONFIG, ...fixture(), options: optionsFor(SWEEP) });
  const altered = fixture();
  for (const t of Object.keys(altered.bars)) {
    altered.bars[t] = altered.bars[t].map((b) =>
      b.date > a.split.splitDate
        ? { ...b, open: b.open * 0.5, high: b.high * 0.5, low: b.low * 0.5, close: b.close * 0.5 }
        : b,
    );
  }
  const b = runValidation({ spec: SPEC, config: CONFIG, ...altered, options: optionsFor(SWEEP) });
  assert.equal(b.split.splitDate, a.split.splitDate);
  assert.deepEqual(
    b.sweep.rows.map((x) => x.is),
    a.sweep.rows.map((x) => x.is),
  );
  assert.equal(b.sweep.bestIndex, a.sweep.bestIndex);
  assert.notDeepEqual(
    b.sweep.rows.map((x) => x.oos),
    a.sweep.rows.map((x) => x.oos),
    'the out-of-sample scores do see the change',
  );
});

test('walk-forward: each fold chooses on its training data alone', () => {
  const a = runValidation({ spec: SPEC, config: CONFIG, ...fixture(), options: optionsFor(SWEEP) });
  assert.equal(a.walkForward.folds.length, 4);
  assert.equal(a.walkForward.reselected, true);
  const first = a.walkForward.folds[0];
  const altered = fixture();
  for (const t of Object.keys(altered.bars)) {
    altered.bars[t] = altered.bars[t].map((b) =>
      b.date > first.trainEnd
        ? { ...b, open: b.open * 2, high: b.high * 2, low: b.low * 2, close: b.close * 2 }
        : b,
    );
  }
  const b = runValidation({ spec: SPEC, config: CONFIG, ...altered, options: optionsFor(SWEEP) });
  assert.deepEqual(b.walkForward.folds[0].params, first.params);
  assert.deepEqual(b.walkForward.folds[0].train, first.train);
});

test('walk-forward: the stitched curve covers the test periods in order and matches its folds', () => {
  const r = runValidation({ spec: SPEC, config: CONFIG, ...fixture(), options: optionsFor(SWEEP) });
  const wf = r.walkForward;
  const curve = wf.curve;
  assert.equal(curve[0].date, wf.folds[0].testStart);
  assert.equal(curve[curve.length - 1].date, wf.folds[wf.folds.length - 1].testEnd);
  for (let i = 1; i < curve.length; i += 1) assert.ok(curve[i].date > curve[i - 1].date);
  assert.equal(curve[0].equity, 1);
  /* Chained fold returns equal the combined return. */
  const chained = wf.folds.reduce((acc, f) => acc * (1 + f.test.totalReturn), 1) - 1;
  near(wf.combined.totalReturn, chained, 1e-4);
  assert.equal(
    wf.combined.closedTrades,
    wf.folds.reduce((acc, f) => acc + f.test.closedTrades, 0),
  );
  assert.ok(wf.profitableFolds <= wf.testedFolds);
  /* Every session of every test period appears once. */
  assert.equal(
    curve.length,
    wf.folds.reduce((acc, f) => acc + f.test.observations, 0),
  );
  assert.equal(curve[0].benchmark, 1);
});

test('walk-forward without a grid keeps the saved parameters in every fold', () => {
  const r = runValidation({
    spec: SPEC,
    config: CONFIG,
    ...fixture(),
    options: optionsFor({ folds: 3, mode: 'anchored' }),
  });
  assert.equal(r.walkForward.reselected, false);
  assert.ok(r.walkForward.folds.every((f) => f.params === null));
  assert.equal(r.walkForward.mode, 'anchored');
});

test('the report is deterministic', () => {
  const a = runValidation({ spec: SPEC, config: CONFIG, ...fixture(), options: optionsFor(SWEEP) });
  const b = runValidation({ spec: SPEC, config: CONFIG, ...fixture(), options: optionsFor(SWEEP) });
  assert.deepEqual(a, b);
});

test('a validation that runs out of time stops with a clear message', () => {
  let calls = 0;
  assert.throws(
    () =>
      runValidation({
        spec: SPEC,
        config: CONFIG,
        ...fixture(),
        options: optionsFor(SWEEP),
        shouldStop: () => (calls += 1) > 3,
      }),
    /too large to finish/,
  );
});

test('the work estimate grows with combinations and folds', () => {
  const base = estimateWork({ tickers: 3, sessions: 1000, options: optionsFor({}) });
  const swept = estimateWork({ tickers: 3, sessions: 1000, options: optionsFor(SWEEP) });
  const more = estimateWork({
    tickers: 3,
    sessions: 1000,
    options: optionsFor({ ...SWEEP, folds: 8 }),
  });
  assert.ok(base > 0);
  assert.ok(swept > base);
  assert.ok(more > swept);
});

test('options are clamped to their limits', () => {
  const { options } = normalizeValidationOptions(SPEC, {
    splitPct: 99,
    folds: 50,
    mode: 'sideways',
    objective: 'luck',
  });
  assert.deepEqual(
    {
      splitPct: options.splitPct,
      folds: options.folds,
      mode: options.mode,
      objective: options.objective,
    },
    { splitPct: 90, folds: 8, mode: 'rolling', objective: 'sharpe' },
  );
});

/* ── Form helpers ── */

test('form helpers: value lists, suggestions and the API config', () => {
  assert.deepEqual(parseValues('20, 50;100  x 7.5'), [20, 50, 100, 7.5]);
  assert.deepEqual(parseValues(''), []);
  /* Five points around the current value, rounded for integers. */
  assert.deepEqual(
    suggestValues({ kind: 'int', current: 14, min: 2, max: 100 }),
    [7, 11, 14, 18, 21],
  );
  /* Clamped to the bounds, duplicates removed. */
  assert.deepEqual(
    suggestValues({ kind: 'num', current: 90, min: 1, max: 99 }),
    [45, 67.5, 90, 99],
  );
  const cfg = toApiConfig({
    startDate: '2022-01-03',
    endDate: '2025-01-03',
    initialCapital: '50000',
    slippageBps: '5',
    commissionPerShare: '0.005',
    riskFreeRate: '4',
  });
  assert.equal(cfg.initialCapital, 50000);
  assert.equal(cfg.riskFreeRate, 0.04);
  assert.equal(cfg.startDate, '2022-01-03');
});
