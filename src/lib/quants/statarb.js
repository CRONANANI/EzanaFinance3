// src/lib/quants/statarb.js
// Quant Lab statistical arbitrage: cointegration testing and pair backtests.
// Pure and deterministic: no fetch, no clock, no randomness. Unit-tested by
// scripts/check-quant-statarb.mjs against an independent statistics library.
//
// Why cointegration and not correlation: two stocks can be highly correlated
// day to day and still drift apart for good. A pairs trade bets that the GAP
// between them comes back, which is only reasonable when some combination of
// the two prices is stationary. The Engle-Granger test checks exactly that.
//
// Engle-Granger, two steps:
//   1. Regress log(Y) on log(X) with a constant. The slope is the hedge ratio.
//   2. Run an augmented Dickey-Fuller test on the residual (the spread). The
//      statistic is compared with MacKinnon (2010) critical values for two
//      series, which are stricter than ordinary ADF values because the hedge
//      ratio was fitted to make the residual look as stationary as possible.
//
// Pair backtest, with no look-ahead:
//   - The window is split. The FORMATION part fixes the hedge ratio and runs
//     the test. The TRADING part is never used to choose anything.
//   - On each trading session the z-score compares today's spread with the
//     mean and deviation of the previous `lookback` spreads (today excluded).
//   - Signals are read on the close and filled at the next session's open.

import { computeRunMetrics, mean, stdev } from './metrics.js';

export const STATARB_VERSION = 'ql-statarb-1.0.0';

/** Aligned sessions the test needs before its result means anything. */
export const MIN_TEST_SESSIONS = 120;
export const MIN_LOOKBACK = 20;
export const MAX_LOOKBACK = 250;

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round = (x, d = 6) => (isNum(x) ? Number(x.toFixed(d)) : null);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/* ── Regression ───────────────────────────────────────────── */

/**
 * Ordinary least squares, y = X b, by the normal equations.
 * @param {number[]} y
 * @param {number[][]} columns  regressors, one array per column
 * @returns {{ coef: number[], se: number[], ssr: number, nobs: number } | null}
 */
export function ols(y, columns) {
  const n = y.length;
  const k = columns.length;
  if (!k || n <= k) return null;
  const xtx = Array.from({ length: k }, () => new Array(k).fill(0));
  const xty = new Array(k).fill(0);
  for (let i = 0; i < k; i += 1) {
    for (let j = i; j < k; j += 1) {
      let s = 0;
      for (let t = 0; t < n; t += 1) s += columns[i][t] * columns[j][t];
      xtx[i][j] = s;
      xtx[j][i] = s;
    }
    let s = 0;
    for (let t = 0; t < n; t += 1) s += columns[i][t] * y[t];
    xty[i] = s;
  }
  /* Invert X'X by Gauss-Jordan with partial pivoting. */
  const a = xtx.map((row, i) => [...row, ...row.map((_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < k; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < k; r += 1)
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const p = a[col][col];
    for (let j = 0; j < 2 * k; j += 1) a[col][j] /= p;
    for (let r = 0; r < k; r += 1) {
      if (r === col) continue;
      const f = a[r][col];
      if (f !== 0) for (let j = 0; j < 2 * k; j += 1) a[r][j] -= f * a[col][j];
    }
  }
  const inv = a.map((row) => row.slice(k));
  const coef = inv.map((row) => row.reduce((acc, v, j) => acc + v * xty[j], 0));
  let ssr = 0;
  for (let t = 0; t < n; t += 1) {
    let fit = 0;
    for (let i = 0; i < k; i += 1) fit += coef[i] * columns[i][t];
    ssr += (y[t] - fit) ** 2;
  }
  const sigma2 = ssr / (n - k);
  const se = inv.map((row, i) => Math.sqrt(Math.max(sigma2 * row[i], 0)));
  return { coef, se, ssr, nobs: n };
}

/** Akaike information criterion of a Gaussian regression. */
const aic = (fit, k) =>
  fit.nobs * (Math.log(2 * Math.PI) + Math.log(fit.ssr / fit.nobs) + 1) + 2 * k;

/* ── Augmented Dickey-Fuller, no constant ─────────────────── */

/** Largest lag considered: ceil(12 * (n / 100)^(1/4)), the usual rule, capped for short series. */
export const defaultMaxLag = (n) =>
  Math.max(0, Math.min(Math.ceil(12 * (n / 100) ** 0.25), Math.floor(n / 2) - 1));

/**
 * ADF regression  d(e_t) = rho * e_(t-1) + sum_i g_i * d(e_(t-i)) + u_t
 * on rows `from`..end, with `lags` lagged differences. Returns the OLS fit.
 */
function adfFit(series, lags, from) {
  const d = [];
  for (let t = 1; t < series.length; t += 1) d.push(series[t] - series[t - 1]);
  /* d[i] = series[i + 1] - series[i]. Row t uses d[t] on the left. */
  const y = [];
  const cols = Array.from({ length: lags + 1 }, () => []);
  for (let t = Math.max(from, lags); t < d.length; t += 1) {
    y.push(d[t]);
    cols[0].push(series[t]);
    for (let i = 1; i <= lags; i += 1) cols[i].push(d[t - i]);
  }
  return ols(y, cols);
}

/**
 * ADF test without a constant or trend (the right form for a regression
 * residual, which already has mean zero). The lag length is chosen by AIC over
 * a common sample, then the test is re-run on the full sample.
 * @returns {{ statistic: number, lags: number, nobs: number } | null}
 */
export function adfNoConstant(series, maxLag = defaultMaxLag(series.length)) {
  if (series.length < 12) return null;
  let best = 0;
  let bestAic = Infinity;
  for (let p = 0; p <= maxLag; p += 1) {
    const fit = adfFit(series, p, maxLag);
    if (!fit) continue;
    const v = aic(fit, p + 1);
    if (v < bestAic) {
      bestAic = v;
      best = p;
    }
  }
  const fit = adfFit(series, best, 0);
  if (!fit || !(fit.se[0] > 0)) return null;
  return { statistic: fit.coef[0] / fit.se[0], lags: best, nobs: fit.nobs };
}

/* MacKinnon (2010) response surface for the Engle-Granger test with two
   series and a constant: critical value = b0 + b1 / T + b2 / T^2. */
const EG_SURFACE = {
  1: [-3.89644, -10.9519, -33.527],
  5: [-3.33613, -6.1101, -6.823],
  10: [-3.04445, -4.2412, -2.72],
};

/** Engle-Granger critical values at 1%, 5% and 10% for `nobs` observations. */
export function engleGrangerCriticalValues(nobs) {
  const out = {};
  for (const [level, [b0, b1, b2]] of Object.entries(EG_SURFACE)) {
    out[level] = Number.isFinite(nobs) ? b0 + b1 / nobs + b2 / (nobs * nobs) : b0;
  }
  return out;
}

/**
 * Engle-Granger test of y on x (both already in logs).
 * `confidence` is the strictest level passed: 99, 95, 90 or null.
 */
export function engleGranger(y, x) {
  const n = Math.min(y.length, x.length);
  if (n < 30) return null;
  const ys = y.slice(0, n);
  const xs = x.slice(0, n);
  const fit = ols(ys, [new Array(n).fill(1), xs]);
  if (!fit) return null;
  const [alpha, hedgeRatio] = fit.coef;
  const residual = ys.map((v, i) => v - alpha - hedgeRatio * xs[i]);
  const adf = adfNoConstant(residual);
  if (!adf) return null;
  const critical = engleGrangerCriticalValues(n - 1);
  const confidence =
    adf.statistic < critical[1]
      ? 99
      : adf.statistic < critical[5]
        ? 95
        : adf.statistic < critical[10]
          ? 90
          : null;
  return {
    alpha,
    hedgeRatio,
    residual,
    statistic: adf.statistic,
    lags: adf.lags,
    critical,
    confidence,
    nobs: n,
  };
}

/**
 * Half-life of mean reversion from an AR(1) fit of the spread:
 * s_t - m = phi * (s_(t-1) - m). Null when the spread does not revert
 * (phi outside 0..1).
 */
export function halfLife(spread) {
  if (spread.length < 3) return null;
  const m = mean(spread);
  let num = 0;
  let den = 0;
  for (let t = 1; t < spread.length; t += 1) {
    num += (spread[t - 1] - m) * (spread[t] - m);
    den += (spread[t - 1] - m) ** 2;
  }
  const phi = den > 0 ? num / den : null;
  return phi !== null && phi > 0 && phi < 1 ? -Math.log(2) / Math.log(phi) : null;
}

/* ── Alignment ────────────────────────────────────────────── */

/**
 * Join two bar series on date. Only sessions both traded are kept.
 * @returns {{ dates: string[], a: object[], b: object[] }}
 */
export function alignPair(barsA, barsB) {
  const ok = (bar) => isNum(bar.close) && bar.close > 0;
  const mapB = new Map(barsB.filter(ok).map((bar) => [bar.date, bar]));
  const rows = barsA
    .filter((bar) => ok(bar) && mapB.has(bar.date))
    .sort((p, q) => (p.date < q.date ? -1 : 1));
  return { dates: rows.map((r) => r.date), a: rows, b: rows.map((r) => mapB.get(r.date)) };
}

const logs = (bars) => bars.map((bar) => Math.log(bar.close));

function returnCorrelation(a, b) {
  const ra = [];
  const rb = [];
  for (let i = 1; i < a.length; i += 1) {
    ra.push(a[i].close / a[i - 1].close - 1);
    rb.push(b[i].close / b[i - 1].close - 1);
  }
  const sa = stdev(ra);
  const sb = stdev(rb);
  if (!(sa > 0) || !(sb > 0)) return null;
  const ma = mean(ra);
  const mb = mean(rb);
  let cov = 0;
  for (let i = 0; i < ra.length; i += 1) cov += (ra[i] - ma) * (rb[i] - mb);
  return cov / (ra.length - 1) / (sa * sb);
}

/**
 * Test both orderings (A on B, and B on A) and keep the one with the more
 * negative statistic. The dependent leg is called Y, the other X.
 */
function bestOrdering(a, b, tickerA, tickerB) {
  const ab = engleGranger(logs(a), logs(b));
  const ba = engleGranger(logs(b), logs(a));
  if (!ab && !ba) return null;
  const useAb = ab && (!ba || ab.statistic <= ba.statistic);
  return useAb
    ? { test: ab, y: tickerA, x: tickerB, yBars: a, xBars: b }
    : { test: ba, y: tickerB, x: tickerA, yBars: b, xBars: a };
}

/* ── Screening one pair ───────────────────────────────────── */

/**
 * Is this pair cointegrated over the window, and where is the spread now?
 * Everything here is measured on the whole window, so it describes the past;
 * the backtest below is what tests whether it could have been traded.
 */
export function analyzePair({ tickerA, tickerB, barsA, barsB }) {
  const { dates, a, b } = alignPair(barsA, barsB);
  if (dates.length < MIN_TEST_SESSIONS) {
    return { ok: false, reason: 'too_short', observations: dates.length };
  }
  const best = bestOrdering(a, b, tickerA, tickerB);
  if (!best) return { ok: false, reason: 'no_fit', observations: dates.length };
  const { test } = best;
  const sd = stdev(test.residual);
  const last = test.residual[test.residual.length - 1];
  const z = sd > 0 ? last / sd : null;
  const hl = halfLife(test.residual);
  const notes = [];
  if (!(test.hedgeRatio > 0)) {
    notes.push(
      'The fitted hedge ratio is not positive: these two do not move together, so there is no spread to trade.',
    );
  }
  if (test.confidence === null) {
    notes.push(
      'The gap between these two has not reliably closed in this window. A wide spread here is not a signal.',
    );
  }
  if (hl !== null && hl > 60) {
    notes.push(
      `The spread takes about ${Math.round(hl)} sessions to close half its gap. That is slow for a pairs trade.`,
    );
  }
  const tradable = test.confidence !== null && test.hedgeRatio > 0;
  let signal = 'none';
  if (tradable && isNum(z)) {
    if (z > 2) signal = 'short_spread';
    else if (z < -2) signal = 'long_spread';
    else if (Math.abs(z) > 1.5) signal = 'watch';
    else signal = 'inside';
  }
  return {
    ok: true,
    observations: dates.length,
    from: dates[0],
    to: dates[dates.length - 1],
    y: best.y,
    x: best.x,
    hedgeRatio: round(test.hedgeRatio, 4),
    statistic: round(test.statistic, 4),
    lags: test.lags,
    critical: {
      1: round(test.critical[1], 4),
      5: round(test.critical[5], 4),
      10: round(test.critical[10], 4),
    },
    confidence: test.confidence,
    halfLife: round(hl, 1),
    zScore: round(z, 3),
    correlation: round(returnCorrelation(a, b), 4),
    tradable,
    signal,
    notes,
  };
}

/* ── Pair backtest ────────────────────────────────────────── */

const bounded = (v, def, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : def;
};

/** Clean the settings a client sent. Returns { params, errors }. */
export function normalizePairParams(raw = {}) {
  const errors = [];
  const params = {
    formationPct: bounded(raw.formationPct, 50, 30, 70),
    lookback: Math.round(bounded(raw.lookback, 60, MIN_LOOKBACK, MAX_LOOKBACK)),
    entryZ: bounded(raw.entryZ, 2, 0.5, 5),
    exitZ: bounded(raw.exitZ, 0.5, 0, 3),
    stopZ: bounded(raw.stopZ, 4, 1, 10),
    initialCapital: bounded(raw.initialCapital, 100000, 1000, 1e9),
    slippageBps: bounded(raw.slippageBps, 5, 0, 200),
    commissionPerShare: bounded(raw.commissionPerShare, 0.005, 0, 1),
    borrowRate: bounded(raw.borrowRate, 0.01, 0, 1),
  };
  if (params.exitZ >= params.entryZ) errors.push('The exit level must be below the entry level');
  if (params.stopZ <= params.entryZ) errors.push('The stop level must be above the entry level');
  return { params, errors };
}

/**
 * Backtest one pair. See the header for the no-look-ahead design.
 * Throws with a user-readable message when the pair cannot be tested.
 */
export function backtestPair({ tickerA, tickerB, barsA, barsB, params }) {
  const { dates, a, b } = alignPair(barsA, barsB);
  const n = dates.length;
  const split = Math.round((n * params.formationPct) / 100);
  if (split < MIN_TEST_SESSIONS || n - split < 60) {
    throw new Error(
      'Not enough shared trading days to form and then trade this pair. Use a longer window.',
    );
  }
  const best = bestOrdering(a.slice(0, split), b.slice(0, split), tickerA, tickerB);
  if (!best) throw new Error('The relationship between these two could not be estimated.');
  const { test } = best;
  if (!(test.hedgeRatio > 0)) {
    throw new Error(
      'In the formation period these two did not move together, so there is no spread to trade.',
    );
  }
  const yAll = best.y === tickerA ? a : b;
  const xAll = best.y === tickerA ? b : a;
  const beta = test.hedgeRatio;
  /* The spread uses the formation hedge ratio for the whole window. */
  const spread = yAll.map((bar, i) => Math.log(bar.close) - beta * Math.log(xAll[i].close));

  const warnings = [];
  if (test.confidence === null) {
    warnings.push(
      'The pair did not pass the cointegration test in the formation period. It is traded here anyway so you can see the result, but there was no statistical reason to expect the gap to close.',
    );
  }
  const slip = params.slippageBps / 10000;
  let cash = params.initialCapital;
  let pos = null; // { dir, qy, qx, entryDate, entryZ, entryEquity, costs, signalDate }
  let pending = null; // { type: 'enter'|'exit', dir?, reason?, signalDate, z }
  const curve = [];
  const trades = [];
  const zSeries = [];
  const costs = { commissions: 0, slippage: 0, borrow: 0 };
  let tradedNotional = 0;
  const priceAt = (bar) => (isNum(bar.open) && bar.open > 0 ? bar.open : bar.close);

  const closeOut = (i, reason, zNow) => {
    const py = priceAt(yAll[i]);
    const px = priceAt(xAll[i]);
    /* Long spread holds +Y, -X: selling Y, buying X back. Reverse for short. */
    const fy = py * (1 - pos.dir * slip);
    const fx = px * (1 + pos.dir * slip);
    cash += pos.dir * pos.qy * fy - pos.dir * pos.qx * fx;
    const comm = (pos.qy + pos.qx) * params.commissionPerShare;
    cash -= comm;
    const slipCost = pos.qy * py * slip + pos.qx * px * slip;
    costs.commissions += comm;
    costs.slippage += slipCost;
    tradedNotional += pos.qy * py + pos.qx * px;
    const equity = cash;
    const pnl = equity - pos.entryEquity;
    trades.push({
      direction: pos.dir === 1 ? 'long_spread' : 'short_spread',
      sharesY: pos.qy,
      sharesX: pos.qx,
      signalDate: pos.signalDate,
      entryDate: pos.entryDate,
      entryZ: round(pos.entryZ, 3),
      exitDate: dates[i],
      exitZ: round(zNow, 3),
      holdDays: daysBetween(pos.entryDate, dates[i]),
      pnl: round(pnl, 2),
      pnlPct: round(pnl / pos.entryEquity),
      costs: round(pos.costs + comm + slipCost, 2),
      exitReason: reason,
      open: false,
    });
    pos = null;
  };

  let lastZ = null;
  for (let i = split; i < n; i += 1) {
    /* 1. Fill what was decided after the previous close, at today's open. */
    if (pending) {
      if (pending.type === 'exit' && pos) closeOut(i, pending.reason, pending.z);
      else if (pending.type === 'enter' && !pos) {
        const py = priceAt(yAll[i]);
        const px = priceAt(xAll[i]);
        /* Notional N on Y and beta * N on X, using all of equity gross. */
        const notional = cash / (1 + beta);
        const qy = Math.floor(notional / py);
        const qx = Math.floor((beta * notional) / px);
        if (qy > 0 && qx > 0) {
          const { dir } = pending;
          const fy = py * (1 + dir * slip);
          const fx = px * (1 - dir * slip);
          const entryEquity = cash;
          cash += -dir * qy * fy + dir * qx * fx;
          const comm = (qy + qx) * params.commissionPerShare;
          cash -= comm;
          const slipCost = qy * py * slip + qx * px * slip;
          costs.commissions += comm;
          costs.slippage += slipCost;
          tradedNotional += qy * py + qx * px;
          pos = {
            dir,
            qy,
            qx,
            entryDate: dates[i],
            entryZ: pending.z,
            entryEquity,
            costs: comm + slipCost,
            signalDate: pending.signalDate,
          };
        }
      }
      pending = null;
    }

    /* 2. The short leg pays one day of borrow. */
    if (pos) {
      const shortValue = pos.dir === 1 ? pos.qx * xAll[i].close : pos.qy * yAll[i].close;
      const fee = (shortValue * params.borrowRate) / 252;
      cash -= fee;
      pos.costs += fee;
      costs.borrow += fee;
    }

    /* 3. Mark at the close. */
    const legs = pos ? pos.dir * (pos.qy * yAll[i].close - pos.qx * xAll[i].close) : 0;
    const equity = cash + legs;
    const gross = pos ? (pos.qy * yAll[i].close + pos.qx * xAll[i].close) / equity : 0;

    /* 4. Today's z-score from the previous `lookback` spreads only. */
    const window = spread.slice(i - params.lookback, i);
    const sd = stdev(window);
    const z = sd > 0 ? (spread[i] - mean(window)) / sd : null;
    lastZ = z;
    zSeries.push({ date: dates[i], z: round(z, 4) });
    curve.push({
      date: dates[i],
      equity,
      benchmark: null,
      grossExposure: gross,
      positions: pos ? 2 : 0,
    });

    /* 5. Decide for the next open. Nothing is queued on the last session. */
    if (i === n - 1 || !isNum(z)) continue;
    if (pos) {
      const reverted = pos.dir === 1 ? z >= -params.exitZ : z <= params.exitZ;
      const stopped = pos.dir === 1 ? z <= -params.stopZ : z >= params.stopZ;
      if (stopped) pending = { type: 'exit', reason: 'stop', z };
      else if (reverted) pending = { type: 'exit', reason: 'reverted', z };
    } else if (z <= -params.entryZ && z > -params.stopZ) {
      pending = { type: 'enter', dir: 1, z, signalDate: dates[i] };
    } else if (z >= params.entryZ && z < params.stopZ) {
      pending = { type: 'enter', dir: -1, z, signalDate: dates[i] };
    }
  }

  /* A position still open at the end is marked at the last close and listed. */
  if (pos) {
    const last = curve[curve.length - 1];
    trades.push({
      direction: pos.dir === 1 ? 'long_spread' : 'short_spread',
      sharesY: pos.qy,
      sharesX: pos.qx,
      signalDate: pos.signalDate,
      entryDate: pos.entryDate,
      entryZ: round(pos.entryZ, 3),
      exitDate: null,
      exitZ: round(lastZ, 3),
      holdDays: daysBetween(pos.entryDate, last.date),
      pnl: round(last.equity - pos.entryEquity, 2),
      pnlPct: round((last.equity - pos.entryEquity) / pos.entryEquity),
      costs: round(pos.costs, 2),
      exitReason: 'open_at_end',
      open: true,
    });
  }

  const totalCosts = costs.commissions + costs.slippage + costs.borrow;
  const metrics = computeRunMetrics({ curve, trades, riskFreeRate: 0, tradedNotional, totalCosts });
  const closed = trades.filter((t) => !t.open);
  if (closed.length < 10) {
    warnings.push(
      `Only ${closed.length} round trips. That is far too few to judge a pairs strategy.`,
    );
  }
  const stops = closed.filter((t) => t.exitReason === 'stop').length;
  if (closed.length && stops / closed.length >= 0.3) {
    warnings.push(
      `${stops} of ${closed.length} trades hit the stop: the spread kept widening instead of closing.`,
    );
  }
  /* Did the relationship survive into the period that was traded? */
  const later = engleGranger(logs(yAll.slice(split)), logs(xAll.slice(split)));
  if (test.confidence !== null && later && later.confidence === null) {
    warnings.push(
      'The pair passed the test in the formation period but not in the trading period. The relationship may have broken down.',
    );
  }

  return {
    statarbVersion: STATARB_VERSION,
    y: best.y,
    x: best.x,
    params,
    formation: {
      from: dates[0],
      to: dates[split - 1],
      observations: split,
      hedgeRatio: round(beta, 4),
      statistic: round(test.statistic, 4),
      critical: {
        1: round(test.critical[1], 4),
        5: round(test.critical[5], 4),
        10: round(test.critical[10], 4),
      },
      confidence: test.confidence,
      halfLife: round(halfLife(test.residual), 1),
    },
    trading: {
      from: dates[split],
      to: dates[n - 1],
      observations: n - split,
      statistic: later ? round(later.statistic, 4) : null,
      confidence: later ? later.confidence : null,
    },
    metrics,
    curve: curve.map((p) => ({
      date: p.date,
      equity: round(p.equity, 2),
      grossExposure: round(p.grossExposure, 4),
    })),
    zSeries,
    trades,
    costs: {
      commissions: round(costs.commissions, 2),
      slippage: round(costs.slippage, 2),
      borrow: round(costs.borrow, 2),
      total: round(totalCosts, 2),
    },
    warnings,
    assumptions: [
      'The hedge ratio and the cointegration test come from the formation period only. The trading period chooses nothing.',
      'The z-score on each day uses the previous sessions only. Signals are read on the close and filled at the next open.',
      `Slippage ${params.slippageBps} bps per fill on both legs, commission $${params.commissionPerShare} per share, short borrow ${(params.borrowRate * 100).toFixed(1)}% a year.`,
      'All equity is deployed across the two legs. Whole shares only. Margin calls, short-sale restrictions and hard-to-borrow fees are not modelled.',
      'A pairs backtest describes the past under these assumptions. It is not evidence of future results.',
    ],
  };
}
