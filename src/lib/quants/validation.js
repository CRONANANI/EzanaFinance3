// src/lib/quants/validation.js
// Quant Lab validation: does a backtest result survive data it was not fitted
// to? Pure and deterministic. No fetch, no clock, no randomness: the same
// inputs always give the same report. Unit-tested by
// scripts/check-quant-validation.mjs.
//
// One validation report holds four independent checks:
//
//   split            The strategy as saved, measured separately on the first
//                    part of the window (in sample) and the rest (out of
//                    sample).
//   costSensitivity  The same strategy re-run with trading costs scaled, to
//                    show how much of the result depends on cheap fills.
//   sweep            Optional. A grid of parameter values, each fitted on the
//                    in-sample part only, then scored on the out-of-sample
//                    part. Reports how well the in-sample ranking carried over
//                    and a deflated Sharpe ratio for the winner.
//   walkForward      The window cut into consecutive train/test folds. With a
//                    grid, parameters are re-chosen on each train fold and
//                    applied to the next test fold, which is the only honest
//                    way to score a tuned strategy. Without a grid, it shows
//                    how stable the fixed strategy is across periods.
//
// Leakage rules, enforced here and by the engine:
//   - A parameter choice never sees the data it is scored on.
//   - Every test-period run starts flat with fresh capital. Earlier bars are
//     used for indicator warm-up only, which is information that was public
//     before the test period began.

import { runBacktest } from './backtest-engine.js';
import { TRADING_DAYS, computeRunMetrics, mean, simpleReturns, stdev } from './metrics.js';
import { CONDITIONS, validateSpec } from './strategy-spec.js';

export const VALIDATION_VERSION = 'ql-validation-1.0.0';

export const MAX_AXES = 2;
export const MAX_AXIS_VALUES = 8;
export const MAX_COMBOS = 40;
export const MIN_FOLDS = 2;
export const MAX_FOLDS = 8;
/** Sessions a walk-forward block needs before its statistics mean anything. */
export const MIN_BLOCK_SESSIONS = 40;
/** In-sample closed trades a parameter set needs before it can be chosen. */
export const MIN_SELECTION_TRADES = 5;
/**
 * Ceiling on total simulated work, in ticker-sessions (tickers times trading
 * days, summed over every engine run). Keeps one validation inside a single
 * request.
 */
export const MAX_WORK = 4_000_000;

export const OBJECTIVES = {
  sharpe: 'Sharpe ratio',
  cagr: 'Annualised return',
  calmar: 'Calmar ratio',
};

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round = (x, d = 6) => (isNum(x) ? Number(x.toFixed(d)) : null);

/* ── Statistics ───────────────────────────────────────────── */

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, |error| < 1.5e-7). */
export function normCdf(x) {
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2);
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(x * x) / 2);
  return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** Inverse standard normal CDF (Acklam's rational approximation). */
export function normInv(p) {
  if (!(p > 0 && p < 1)) return p <= 0 ? -Infinity : Infinity;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p > 1 - lo) return -normInv(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

/** Sample skewness and (non-excess) kurtosis. Null under 4 observations or zero variance. */
export function shapeStats(xs) {
  const n = xs.length;
  if (n < 4) return { skew: null, kurtosis: null };
  const mu = mean(xs);
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const x of xs) {
    const d = x - mu;
    m2 += d * d;
    m3 += d * d * d;
    m4 += d * d * d * d;
  }
  m2 /= n;
  m3 /= n;
  m4 /= n;
  if (!(m2 > 0)) return { skew: null, kurtosis: null };
  return { skew: m3 / m2 ** 1.5, kurtosis: m4 / (m2 * m2) };
}

/** Average ranks, ties shared. */
function ranks(xs) {
  const order = xs.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
  const out = new Array(xs.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j += 1;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) out[order[k][1]] = r;
    i = j + 1;
  }
  return out;
}

/** Spearman rank correlation of paired values. Null under 3 pairs or a constant side. */
export function spearman(xs, ys) {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => isNum(x) && isNum(y));
  if (pairs.length < 3) return null;
  const rx = ranks(pairs.map((p) => p[0]));
  const ry = ranks(pairs.map((p) => p[1]));
  const mx = mean(rx);
  const my = mean(ry);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < rx.length; i += 1) {
    cov += (rx[i] - mx) * (ry[i] - my);
    vx += (rx[i] - mx) ** 2;
    vy += (ry[i] - my) ** 2;
  }
  return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : null;
}

const EULER_GAMMA = 0.5772156649015329;

/**
 * Sharpe ratio (per period, not annualised) that the best of `trials`
 * unskilled strategies is expected to reach by luck, given the variance of the
 * Sharpe ratios across those trials (Bailey and Lopez de Prado, 2014).
 */
export function expectedMaxSharpe(trials, sharpeVariance) {
  if (!(trials >= 2) || !(sharpeVariance > 0)) return 0;
  return (
    Math.sqrt(sharpeVariance) *
    ((1 - EULER_GAMMA) * normInv(1 - 1 / trials) + EULER_GAMMA * normInv(1 - 1 / (trials * Math.E)))
  );
}

/**
 * Probability that the true Sharpe ratio is above `benchmarkSharpe`, allowing
 * for sample length, skew and fat tails (the probabilistic Sharpe ratio).
 * With `benchmarkSharpe` set to expectedMaxSharpe(...) this is the deflated
 * Sharpe ratio. All Sharpe inputs are per period, not annualised.
 */
export function probabilisticSharpe({ sharpe, observations, skew, kurtosis, benchmarkSharpe = 0 }) {
  if (!isNum(sharpe) || !(observations > 2)) return null;
  const g3 = isNum(skew) ? skew : 0;
  const g4 = isNum(kurtosis) ? kurtosis : 3;
  const denom = 1 - g3 * sharpe + ((g4 - 1) / 4) * sharpe * sharpe;
  if (!(denom > 0)) return null;
  return normCdf(((sharpe - benchmarkSharpe) * Math.sqrt(observations - 1)) / Math.sqrt(denom));
}

/* ── Tunable parameters ───────────────────────────────────── */

const EXIT_PARAMS = {
  stopLossPct: { label: 'Stop loss %', kind: 'num', min: 0.5, max: 90 },
  trailingStopPct: { label: 'Trailing stop %', kind: 'num', min: 0.5, max: 90 },
  takeProfitPct: { label: 'Take profit %', kind: 'num', min: 0.5, max: 1000 },
  maxHoldDays: { label: 'Max hold days', kind: 'int', min: 1, max: 3650 },
};

/**
 * Every numeric setting of a validated spec that a sweep may vary:
 * [{ path, label, kind: 'int'|'num', min, max, current }].
 * `path` is a dotted path into the validated spec, e.g. "entry.params.period"
 * or "entry.args.1.params.period" when the rule has several conditions.
 */
export function tunableParams(spec) {
  const out = [];
  const walk = (node, path, where) => {
    if (!node) return;
    if (node.op === 'cond') {
      const def = CONDITIONS[node.id];
      if (!def) return;
      for (const [key, p] of Object.entries(def.params)) {
        if (p.kind !== 'int' && p.kind !== 'num') continue;
        out.push({
          path: `${path}.params.${key}`,
          label: `${where}: ${def.label}, ${key}`,
          kind: p.kind,
          min: p.min,
          max: p.max,
          current: node.params?.[key] ?? p.def,
        });
      }
    } else if (node.op === 'not') {
      walk(node.arg, `${path}.arg`, where);
    } else {
      (node.args || []).forEach((a, i) => walk(a, `${path}.args.${i}`, where));
    }
  };
  walk(spec.entry, 'entry', 'Entry');
  walk(spec.exit?.rule, 'exit.rule', 'Exit');
  for (const [key, p] of Object.entries(EXIT_PARAMS)) {
    if (isNum(spec.exit?.[key])) {
      out.push({ path: `exit.${key}`, label: `Exit: ${p.label}`, ...p, current: spec.exit[key] });
    }
  }
  return out;
}

/** A copy of `spec` with each { path: value } applied, re-validated. */
export function applyParamSet(spec, set) {
  const next = JSON.parse(JSON.stringify(spec));
  for (const [path, value] of Object.entries(set)) {
    const keys = path.split('.');
    let node = next;
    for (let i = 0; i < keys.length - 1; i += 1) {
      node = node?.[keys[i]];
      if (node === null || typeof node !== 'object')
        return { ok: false, errors: ['Unknown parameter'] };
    }
    node[keys[keys.length - 1]] = value;
  }
  const checked = validateSpec(next);
  return checked.ok && !checked.unsupported.length
    ? { ok: true, spec: checked.spec }
    : { ok: false, errors: checked.errors };
}

/**
 * Clean the sweep axes a client sent against the spec's real tunable
 * parameters. Returns { axes: [{ path, label, values }], errors }.
 */
export function normalizeAxes(spec, rawAxes) {
  const errors = [];
  const known = new Map(tunableParams(spec).map((p) => [p.path, p]));
  const axes = [];
  const list = Array.isArray(rawAxes) ? rawAxes : [];
  if (list.length > MAX_AXES) errors.push(`A sweep can vary at most ${MAX_AXES} parameters`);
  for (const raw of list.slice(0, MAX_AXES)) {
    const def = known.get(String(raw?.path || ''));
    if (!def) {
      errors.push('A sweep parameter does not exist on this strategy version');
      continue;
    }
    if (axes.some((a) => a.path === def.path)) {
      errors.push(`${def.label} is listed twice`);
      continue;
    }
    const values = [];
    for (const v of Array.isArray(raw.values) ? raw.values : []) {
      const n = def.kind === 'int' ? Math.round(Number(v)) : Number(v);
      if (!isNum(n)) continue;
      if (n < def.min || n > def.max) {
        errors.push(`${def.label}: ${n} is outside ${def.min} to ${def.max}`);
        continue;
      }
      if (!values.includes(n)) values.push(n);
    }
    values.sort((p, q) => p - q);
    if (values.length < 2) errors.push(`${def.label}: give at least 2 different values`);
    if (values.length > MAX_AXIS_VALUES) {
      errors.push(`${def.label}: at most ${MAX_AXIS_VALUES} values`);
    }
    axes.push({ path: def.path, label: def.label, values: values.slice(0, MAX_AXIS_VALUES) });
  }
  const combos = axes.reduce((acc, a) => acc * a.values.length, 1);
  if (axes.length && combos > MAX_COMBOS) {
    errors.push(`${combos} combinations is over the limit of ${MAX_COMBOS}. Use fewer values.`);
  }
  return { axes, errors };
}

/** Cartesian product of the axes as [{ path: value, ... }]. Empty axes give []. */
export function buildGrid(axes) {
  if (!axes.length) return [];
  let grid = [{}];
  for (const axis of axes) {
    const next = [];
    for (const set of grid) for (const v of axis.values) next.push({ ...set, [axis.path]: v });
    grid = next;
  }
  return grid;
}

/** Clean the options a client sent. Returns { options, errors }. */
export function normalizeValidationOptions(spec, raw = {}) {
  const errors = [];
  const { axes, errors: axisErrors } = normalizeAxes(spec, raw.axes);
  errors.push(...axisErrors);
  const splitPct = Math.min(Math.max(Number(raw.splitPct) || 70, 50), 90);
  const folds = Math.min(Math.max(Math.round(Number(raw.folds) || 4), MIN_FOLDS), MAX_FOLDS);
  const mode = raw.mode === 'anchored' ? 'anchored' : 'rolling';
  const objective = OBJECTIVES[raw.objective] ? raw.objective : 'sharpe';
  return { options: { axes, splitPct, folds, mode, objective }, errors };
}

/* ── Building blocks ──────────────────────────────────────── */

/**
 * Walk-forward folds over an ordered list of session dates. The window is cut
 * into `folds + 2` equal blocks. Rolling: each fold trains on two blocks and
 * tests on the next. Anchored: each fold trains from the first session.
 * Returns [{ trainStart, trainEnd, testStart, testEnd }] or throws when the
 * window is too short.
 */
export function walkForwardFolds(dates, folds, mode = 'rolling') {
  const block = Math.floor(dates.length / (folds + 2));
  if (block < MIN_BLOCK_SESSIONS) {
    throw new Error(
      `The window is too short for ${folds} walk-forward folds. Use fewer folds or a longer window.`,
    );
  }
  const out = [];
  for (let i = 0; i < folds; i += 1) {
    const trainFrom = mode === 'anchored' ? 0 : i * block;
    const testFrom = (i + 2) * block;
    const testTo = i === folds - 1 ? dates.length - 1 : (i + 3) * block - 1;
    out.push({
      trainStart: dates[trainFrom],
      trainEnd: dates[testFrom - 1],
      testStart: dates[testFrom],
      testEnd: dates[testTo],
    });
  }
  return out;
}

/** The headline figures of one run or slice, rounded for storage. */
function summary(m) {
  return {
    observations: m.observations,
    startDate: m.startDate,
    endDate: m.endDate,
    totalReturn: round(m.totalReturn),
    cagr: round(m.cagr),
    volatility: round(m.volatility),
    sharpe: round(m.sharpe, 4),
    sortino: round(m.sortino, 4),
    calmar: round(m.calmar, 4),
    maxDrawdown: round(m.maxDrawdown),
    benchmarkReturn: round(m.benchmarkReturn),
    closedTrades: m.closedTrades,
    winRate: round(m.winRate, 4),
    profitFactor: round(m.profitFactor, 4),
  };
}

/**
 * Metrics of the part of a finished run between two dates (inclusive). Trades
 * are assigned to the slice their exit falls in.
 */
export function sliceSummary(result, from, to, riskFreeRate = 0, exclusiveFrom = false) {
  const curve = result.curve.filter((p) => p.date >= from && p.date <= to);
  /* The curve shares its boundary session with the previous slice; a trade
     that exits on that session belongs to the previous slice only. */
  const trades = result.trades.filter(
    (t) => !t.open && (exclusiveFrom ? t.exitDate > from : t.exitDate >= from) && t.exitDate <= to,
  );
  return summary(computeRunMetrics({ curve, trades, riskFreeRate }));
}

const objectiveOf = (s, objective) => (isNum(s?.[objective]) ? s[objective] : null);

/* ── The report ───────────────────────────────────────────── */

/**
 * Engine runs a validation will make, as ticker-sessions. Used to refuse a
 * request that would not finish in time, before any work is done.
 */
export function estimateWork({ tickers, sessions, options }) {
  const combos = Math.max(buildGrid(options.axes).length, 0);
  const full = tickers * sessions;
  const inSample = full * (options.splitPct / 100);
  const outSample = full - inSample;
  const block = full / (options.folds + 2);
  const trainBlocks =
    options.mode === 'anchored'
      ? Array.from({ length: options.folds }, (_, i) => i + 2).reduce((a, b) => a + b, 0)
      : options.folds * 2;
  const perTrainRun = Math.max(combos, 1);
  return Math.round(
    full + // base
      4 * full + // cost sensitivity
      combos * (inSample + outSample) + // sweep
      trainBlocks * block * perTrainRun + // walk-forward training
      options.folds * block, // walk-forward testing
  );
}

/**
 * @param {object} input
 * @param {object} input.spec      validated strategy spec
 * @param {object} input.config    normalized run config
 * @param {object} input.bars      { TICKER: bars[] } including warm-up history
 * @param {object[]} input.benchmarkBars
 * @param {object} input.options   from normalizeValidationOptions
 * @param {() => boolean} [input.shouldStop]  polled between engine runs; when
 *        it returns true the validation aborts with a clear error. The caller
 *        owns the clock so this module stays deterministic.
 */
export function runValidation({ spec, config, bars, benchmarkBars = [], options, shouldStop }) {
  const warnings = [];
  let engineRuns = 0;
  const run = (s, cfg) => {
    if (shouldStop?.()) {
      throw new Error(
        'This validation is too large to finish in one request. Use fewer parameter values, fewer folds or a shorter window.',
      );
    }
    engineRuns += 1;
    return runBacktest({ spec: s, config: cfg, bars, benchmarkBars });
  };
  /** A run that may legitimately have no data or no trades in a short window. */
  const tryRun = (s, cfg) => {
    try {
      return run(s, cfg);
    } catch (err) {
      if (/too large to finish/.test(err.message)) throw err;
      return null;
    }
  };
  const rf = config.riskFreeRate;
  const { objective } = options;

  /* 1. Base run and the in-sample / out-of-sample split. */
  const base = run(spec, config);
  const dates = base.curve.map((p) => p.date);
  if (dates.length < 2 * MIN_BLOCK_SESSIONS) {
    throw new Error('The window has too few trading days to validate. Use a longer window.');
  }
  const splitIndex = Math.min(
    Math.max(Math.round((dates.length * options.splitPct) / 100), MIN_BLOCK_SESSIONS),
    dates.length - MIN_BLOCK_SESSIONS,
  );
  const splitDate = dates[splitIndex - 1];
  const oosStart = dates[splitIndex];
  const split = {
    splitDate,
    splitPct: options.splitPct,
    full: summary(base.metrics),
    /* The boundary session is shared so the two slices chain exactly. */
    inSample: sliceSummary(base, dates[0], splitDate, rf),
    outOfSample: sliceSummary(base, splitDate, dates[dates.length - 1], rf, true),
  };
  if (isNum(split.inSample.sharpe) && isNum(split.outOfSample.sharpe)) {
    if (split.inSample.sharpe > 0 && split.outOfSample.sharpe < split.inSample.sharpe / 2) {
      warnings.push(
        'Out of sample, the Sharpe ratio is less than half its in-sample value. The earlier result may not hold up.',
      );
    }
  }
  if (split.outOfSample.closedTrades < 30) {
    warnings.push(
      `Only ${split.outOfSample.closedTrades} trades closed out of sample. That is too few to confirm or reject the strategy.`,
    );
  }

  /* 2. Cost sensitivity on the full window. */
  const costSensitivity = [0, 1, 2, 3].map((multiple) => {
    const r =
      multiple === 1
        ? base
        : run(spec, {
            ...config,
            slippageBps: config.slippageBps * multiple,
            commissionPerShare: config.commissionPerShare * multiple,
            commissionBps: config.commissionBps * multiple,
          });
    return {
      multiple,
      totalReturn: round(r.metrics.totalReturn),
      cagr: round(r.metrics.cagr),
      sharpe: round(r.metrics.sharpe, 4),
      maxDrawdown: round(r.metrics.maxDrawdown),
      totalCosts: round(r.metrics.totalCosts, 2),
    };
  });
  const free = costSensitivity[0];
  const charged = costSensitivity[1];
  if (isNum(free.totalReturn) && isNum(charged.totalReturn)) {
    if (free.totalReturn > 0 && charged.totalReturn <= 0) {
      warnings.push('The strategy only makes money before trading costs.');
    } else if (charged.totalReturn > 0 && costSensitivity[2].totalReturn <= 0) {
      warnings.push('Doubling trading costs erases the profit. The edge is thin.');
    }
  }

  /* 3. Parameter sweep: fit in sample, score out of sample. */
  const grid = buildGrid(options.axes);
  const candidates = grid
    .map((params) => ({ params, applied: applyParamSet(spec, params) }))
    .map((c) => ({ params: c.params, spec: c.applied.ok ? c.applied.spec : null }));
  const invalid = candidates.filter((c) => !c.spec).length;
  let sweep = null;
  if (grid.length) {
    const isConfig = { ...config, endDate: splitDate };
    const oosConfig = { ...config, startDate: oosStart };
    let bestIndex = -1;
    let bestScore = -Infinity;
    let bestReturns = [];
    const rows = candidates.map((c, i) => {
      if (!c.spec) return { params: c.params, valid: false, eligible: false, is: null, oos: null };
      const isRun = tryRun(c.spec, isConfig);
      const oosRun = tryRun(c.spec, oosConfig);
      const is = isRun ? summary(isRun.metrics) : null;
      const oos = oosRun ? summary(oosRun.metrics) : null;
      const score = objectiveOf(is, objective);
      const eligible = score !== null && is.closedTrades >= MIN_SELECTION_TRADES;
      if (eligible && score > bestScore) {
        bestScore = score;
        bestIndex = i;
        bestReturns = simpleReturns(isRun.curve.map((p) => p.equity)).filter(isNum);
      }
      return { params: c.params, valid: true, eligible, is, oos };
    });

    const eligibleRows = rows.filter((r) => r.eligible);
    const dailySharpes = eligibleRows
      .map((r) => r.is.sharpe)
      .filter(isNum)
      .map((s) => s / Math.sqrt(TRADING_DAYS));
    const sharpeSd = stdev(dailySharpes);
    const hurdleDaily = expectedMaxSharpe(dailySharpes.length, sharpeSd ? sharpeSd * sharpeSd : 0);
    const best = bestIndex >= 0 ? rows[bestIndex] : null;
    let deflatedSharpe = null;
    if (best && isNum(best.is.sharpe) && bestReturns.length > 2) {
      const shape = shapeStats(bestReturns);
      deflatedSharpe = probabilisticSharpe({
        sharpe: best.is.sharpe / Math.sqrt(TRADING_DAYS),
        observations: bestReturns.length,
        skew: shape.skew,
        kurtosis: shape.kurtosis,
        benchmarkSharpe: hurdleDaily,
      });
    }
    const rankCorrelation = spearman(
      eligibleRows.map((r) => objectiveOf(r.is, objective)),
      eligibleRows.map((r) => objectiveOf(r.oos, objective)),
    );
    const scored = rows.filter((r) => isNum(r.oos?.totalReturn));
    sweep = {
      axes: options.axes,
      objective,
      combinations: grid.length,
      invalid,
      eligible: eligibleRows.length,
      rows,
      bestIndex,
      /* Annualised Sharpe the luckiest of this many unskilled tries would show. */
      luckHurdleSharpe: round(hurdleDaily * Math.sqrt(TRADING_DAYS), 4),
      deflatedSharpe: round(deflatedSharpe, 4),
      rankCorrelation: round(rankCorrelation, 4),
      profitableOutOfSample: scored.length
        ? round(scored.filter((r) => r.oos.totalReturn > 0).length / scored.length, 4)
        : null,
    };
    warnings.push(
      `${grid.length} parameter combinations were tried. The best of many tries looks good partly by luck, so judge it by its out-of-sample and walk-forward figures, not its in-sample ones.`,
    );
    if (!best) {
      warnings.push(
        `No combination closed at least ${MIN_SELECTION_TRADES} trades in sample, so none could be selected.`,
      );
    }
    if (best && (best.oos?.closedTrades ?? 0) < MIN_SELECTION_TRADES) {
      warnings.push(
        `The selected combination closed only ${best.oos?.closedTrades ?? 0} trades out of sample, so its out-of-sample score says very little.`,
      );
    }
    if (isNum(deflatedSharpe) && deflatedSharpe < 0.95) {
      warnings.push(
        `After allowing for the number of combinations tried, there is a ${(deflatedSharpe * 100).toFixed(0)}% probability that the best in-sample Sharpe reflects skill. 95% is the usual bar.`,
      );
    }
    if (isNum(rankCorrelation) && rankCorrelation < 0.3) {
      warnings.push(
        'Parameter sets that ranked well in sample did not rank well out of sample. The differences between them look like noise.',
      );
    }
    if (invalid) {
      warnings.push(
        `${invalid} combination(s) were skipped because the values contradict each other.`,
      );
    }
  }

  /* 4. Walk-forward. */
  const folds = walkForwardFolds(dates, options.folds, options.mode);
  const stitched = [];
  const stitchedTrades = [];
  let equity = 1;
  /* The benchmark comes from the base run, whose series is on one scale for
     the whole window, so the gap between two folds is not lost. */
  const baseBench = new Map(base.curve.map((p) => [p.date, p.benchmark]));
  const benchAt = (date, origin) => {
    const v = baseBench.get(date);
    const o = baseBench.get(origin);
    return isNum(v) && isNum(o) && o > 0 ? v / o : null;
  };
  const foldRows = folds.map((f) => {
    let chosen = { params: null, spec };
    let train = null;
    if (grid.length) {
      let score = -Infinity;
      for (const c of candidates) {
        if (!c.spec) continue;
        const r = tryRun(c.spec, { ...config, startDate: f.trainStart, endDate: f.trainEnd });
        if (!r) continue;
        const s = summary(r.metrics);
        const v = objectiveOf(s, objective);
        if (v !== null && s.closedTrades >= MIN_SELECTION_TRADES && v > score) {
          score = v;
          chosen = c;
          train = s;
        }
      }
    }
    if (!train) {
      const r = tryRun(spec, { ...config, startDate: f.trainStart, endDate: f.trainEnd });
      train = r ? summary(r.metrics) : null;
      chosen = { params: null, spec };
    }
    const testRun = tryRun(chosen.spec, { ...config, startDate: f.testStart, endDate: f.testEnd });
    if (testRun) {
      /* Chain this fold's daily returns onto the stitched out-of-sample curve. */
      const c = testRun.curve;
      const origin = stitched.length ? stitched[0].date : c[0].date;
      if (!stitched.length) {
        stitched.push({ date: c[0].date, equity: 1, benchmark: benchAt(c[0].date, origin) });
      } else {
        /* The strategy is flat between folds; the benchmark still moves. */
        stitched.push({ date: c[0].date, equity, benchmark: benchAt(c[0].date, origin) });
      }
      for (let i = 1; i < c.length; i += 1) {
        equity *= c[i].equity / c[i - 1].equity;
        stitched.push({
          date: c[i].date,
          equity,
          benchmark: benchAt(c[i].date, origin),
          grossExposure: c[i].grossExposure,
        });
      }
      stitchedTrades.push(...testRun.trades.filter((t) => !t.open));
    }
    return {
      ...f,
      params: chosen.params,
      train,
      test: testRun ? summary(testRun.metrics) : null,
    };
  });

  const tested = foldRows.filter((f) => isNum(f.test?.totalReturn));
  const combined =
    stitched.length > 1
      ? summary(computeRunMetrics({ curve: stitched, trades: stitchedTrades, riskFreeRate: rf }))
      : null;
  const trainCagrs = foldRows.map((f) => f.train?.cagr).filter(isNum);
  const meanTrainCagr = trainCagrs.length ? mean(trainCagrs) : null;
  const walkForward = {
    mode: options.mode,
    folds: foldRows,
    reselected: grid.length > 0,
    combined,
    profitableFolds: tested.filter((f) => f.test.totalReturn > 0).length,
    testedFolds: tested.length,
    /* Out-of-sample annual return as a share of the in-sample one. Only
       defined when the training periods made money. */
    efficiency:
      combined && isNum(combined.cagr) && isNum(meanTrainCagr) && meanTrainCagr > 0
        ? round(combined.cagr / meanTrainCagr, 4)
        : null,
    curve: stitched.map((p) => ({
      date: p.date,
      equity: round(p.equity),
      benchmark: round(p.benchmark),
    })),
  };
  if (tested.length && walkForward.profitableFolds * 2 < tested.length) {
    warnings.push(
      `The strategy lost money in ${tested.length - walkForward.profitableFolds} of ${tested.length} walk-forward test periods.`,
    );
  }
  if (isNum(walkForward.efficiency) && walkForward.efficiency < 0.5) {
    warnings.push(
      'Walk-forward returns are less than half of what the training periods showed. Expect live results well below the backtest.',
    );
  }

  warnings.push(
    'Out-of-sample data stops being out of sample once you tune against it. Every change made after reading this report weakens the next one.',
  );

  return {
    validationVersion: VALIDATION_VERSION,
    engineVersion: base.engineVersion,
    engineRuns,
    options,
    split,
    costSensitivity,
    sweep,
    walkForward,
    coverage: base.coverage,
    warnings,
  };
}
