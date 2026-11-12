/**
 * Quant Lab: cointegration testing and pair backtests (Nov 2026).
 *
 * The Engle-Granger, ADF and critical-value expectations were produced by an
 * independent statistics library on the same deterministic series this file
 * builds, not by the code under test. The backtest tests prove the
 * no-look-ahead rules and reconcile the accounting.
 *
 *   node --no-warnings --test scripts/check-quant-statarb.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adfNoConstant,
  alignPair,
  analyzePair,
  backtestPair,
  defaultMaxLag,
  engleGranger,
  engleGrangerCriticalValues,
  halfLife,
  normalizePairParams,
  ols,
} from '../src/lib/quants/statarb.js';

const near = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

/* Deterministic generator, so the fixture has variety without Math.random(). */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const bell = (next) => next() + next() + next() - 1.5;

/* In logs. X: a random walk. Y = 0.3 + 1.4 X + mean-reverting noise (so Y and
   X are cointegrated by construction). W: an unrelated random walk. */
function logSeries(n, seed = 7) {
  const next = lcg(seed);
  const x = [4];
  const u = [0];
  const w = [4];
  for (let i = 1; i < n; i += 1) {
    x.push(x[i - 1] + bell(next) * 0.02);
    u.push(0.85 * u[i - 1] + bell(next) * 0.02);
    w.push(w[i - 1] + bell(next) * 0.02);
  }
  return { x, u, w, y: x.map((v, i) => 0.3 + 1.4 * v + u[i]) };
}

function sessions(n, start = '2020-01-06') {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  while (out.length < n) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
/* Bars whose open is the previous close (first open = first close). */
const barsOf = (dates, logCloses) =>
  logCloses.map((l, i) => ({
    date: dates[i],
    open: Math.exp(i ? logCloses[i - 1] : l),
    close: Math.exp(l),
  }));

/* ── Regression and tests against the reference ── */

test('OLS: a hand-checked line and its standard errors', () => {
  /* y = 1, 3, 2, 5 on x = 1, 2, 3, 4. Slope = Sxy / Sxx = 5.5 / 5 = 1.1,
     intercept = 2.75 - 1.1 * 2.5 = 0. Residuals 0.1, 0.8, -1.3, 0.6 give
     SSR = 2.7, sigma^2 = 1.35, se(slope) = sqrt(1.35 / 5) = 0.5196152. */
  const fit = ols(
    [1, 3, 2, 5],
    [
      [1, 1, 1, 1],
      [1, 2, 3, 4],
    ],
  );
  near(fit.coef[0], 0, 1e-9);
  near(fit.coef[1], 1.1, 1e-9);
  near(fit.ssr, 2.7, 1e-9);
  near(fit.se[1], 0.5196152, 1e-6);
  assert.equal(
    ols(
      [1, 2],
      [
        [1, 1],
        [2, 2],
      ],
    ),
    null,
    'collinear columns have no solution',
  );
});

test('Engle-Granger critical values match the published response surface', () => {
  const inf = engleGrangerCriticalValues(Infinity);
  near(inf[1], -3.89644);
  near(inf[5], -3.33613);
  near(inf[10], -3.04445);
  /* Reference at 250 observations: -3.94078403, -3.36067957, -3.06145832. */
  const c = engleGrangerCriticalValues(250);
  near(c[1], -3.94078403, 1e-7);
  near(c[5], -3.36067957, 1e-7);
  near(c[10], -3.06145832, 1e-7);
});

test('Engle-Granger statistic matches the reference on a cointegrated pair', () => {
  const { x, y } = logSeries(400);
  const r = engleGranger(y, x);
  /* Reference: intercept 0.20555583, slope 1.42455554, statistic -5.53916063,
     critical values at 399 observations -3.92409897, -3.35148639, -3.05509666. */
  near(r.alpha, 0.20555583, 1e-7);
  near(r.hedgeRatio, 1.42455554, 1e-7);
  near(r.statistic, -5.53916063, 1e-6);
  near(r.critical[1], -3.92409897, 1e-7);
  near(r.critical[5], -3.35148639, 1e-7);
  assert.equal(r.confidence, 99);
  /* The other ordering, reference -5.49154653. */
  near(engleGranger(x, y).statistic, -5.49154653, 1e-6);
});

test('Engle-Granger: an unrelated random walk is not cointegrated, and lag choice matches', () => {
  const { x, w } = logSeries(400);
  const r = engleGranger(w, x);
  /* Reference: statistic -1.63068771 with 3 lagged differences chosen by AIC. */
  near(r.statistic, -1.63068771, 1e-6);
  assert.equal(r.lags, 3);
  assert.equal(r.confidence, null);
});

test('ADF without a constant matches the reference', () => {
  const { u } = logSeries(400);
  const r = adfNoConstant(u);
  /* Reference: -5.49572921 with 0 lags on 399 observations. */
  near(r.statistic, -5.49572921, 1e-6);
  assert.equal(r.lags, 0);
  assert.equal(r.nobs, 399);
  /* ceil(12 * 4^(1/4)) = ceil(16.97) = 17. */
  assert.equal(defaultMaxLag(400), 17);
  assert.equal(adfNoConstant([1, 2, 3]), null);
});

test('half-life of mean reversion', () => {
  /* Spread 2, 1, -1, -2 has mean 0. Sum of s(t-1) * s(t) = 2 - 1 + 2 = 3 and
     sum of s(t-1)^2 = 4 + 1 + 1 = 6, so phi = 0.5: half the gap closes each
     session, a half-life of exactly 1. */
  near(halfLife([2, 1, -1, -2]), 1, 1e-12);
  /* 1, -1, 1, -1: phi = -3 / 3 = -1. It flips, it does not decay. */
  assert.equal(halfLife([1, -1, 1, -1]), null);
  assert.equal(halfLife([1, 1, 1]), null, 'a flat spread has nothing to revert');
  /* Built with phi = 0.85, so about ln 2 / -ln 0.85 = 4.27 sessions. */
  const hl = halfLife(logSeries(400).u);
  assert.ok(hl > 3 && hl < 6, `half-life ${hl}`);
});

/* ── Alignment and screening ── */

test('pairs are joined on date', () => {
  const dates = sessions(5);
  const a = dates.map((date, i) => ({ date, close: 10 + i }));
  const b = dates.filter((_, i) => i !== 2).map((date, i) => ({ date, close: 20 + i }));
  b.push({ date: '2030-01-01', close: 99 });
  const r = alignPair(a, b);
  assert.deepEqual(r.dates, [dates[0], dates[1], dates[3], dates[4]]);
  assert.deepEqual(
    r.a.map((x) => x.close),
    [10, 11, 13, 14],
  );
  assert.deepEqual(
    r.b.map((x) => x.close),
    [20, 21, 22, 23],
  );
});

test('screen: a cointegrated pair is tradable, with the better ordering chosen', () => {
  const dates = sessions(400);
  const { x, y } = logSeries(400);
  const r = analyzePair({
    tickerA: 'XXX',
    tickerB: 'YYY',
    barsA: barsOf(dates, x),
    barsB: barsOf(dates, y),
  });
  assert.equal(r.ok, true);
  /* Y on X has the more negative statistic (-5.539 against -5.492). */
  assert.equal(r.y, 'YYY');
  assert.equal(r.x, 'XXX');
  near(r.statistic, -5.5392, 1e-4);
  near(r.hedgeRatio, 1.4246, 1e-4);
  assert.equal(r.confidence, 99);
  assert.equal(r.tradable, true);
  assert.equal(r.observations, 400);
  assert.ok(['inside', 'watch', 'long_spread', 'short_spread'].includes(r.signal));
});

test('screen: an unrelated pair gets no signal, however wide the gap', () => {
  const dates = sessions(400);
  const { x, w } = logSeries(400);
  const r = analyzePair({
    tickerA: 'XXX',
    tickerB: 'WWW',
    barsA: barsOf(dates, x),
    barsB: barsOf(dates, w),
  });
  assert.equal(r.confidence, null);
  assert.equal(r.tradable, false);
  assert.equal(r.signal, 'none');
  assert.ok(r.notes.length > 0);
});

test('screen: too little shared history is refused, not guessed', () => {
  const dates = sessions(80);
  const { x, y } = logSeries(80);
  const r = analyzePair({
    tickerA: 'A',
    tickerB: 'B',
    barsA: barsOf(dates, x),
    barsB: barsOf(dates, y),
  });
  assert.deepEqual(r, { ok: false, reason: 'too_short', observations: 80 });
});

/* ── Backtest ── */

const N = 700;
const DATES = sessions(N);
const pairInput = (mutate) => {
  const { x, y } = logSeries(N, 11);
  const barsA = barsOf(DATES, y);
  const barsB = barsOf(DATES, x);
  if (mutate) mutate(barsA, barsB);
  return { tickerA: 'YYY', tickerB: 'XXX', barsA, barsB };
};
const paramsFor = (raw = {}) => {
  const { params, errors } = normalizePairParams(raw);
  assert.deepEqual(errors, []);
  return params;
};
const FREE = { slippageBps: 0, commissionPerShare: 0, borrowRate: 0 };

test('backtest: formation and trading periods do not overlap, and trades happen', () => {
  const r = backtestPair({ ...pairInput(), params: paramsFor() });
  assert.equal(r.formation.observations, 350);
  assert.equal(r.trading.observations, 350);
  assert.equal(r.formation.to, DATES[349]);
  assert.equal(r.trading.from, DATES[350]);
  assert.equal(r.curve.length, 350);
  assert.equal(r.curve[0].date, DATES[350]);
  assert.ok(r.trades.length >= 3, `${r.trades.length} trades`);
  for (const t of r.trades) {
    assert.ok(t.entryDate >= r.trading.from, 'no trade before the trading period');
    assert.ok(t.signalDate < t.entryDate, 'filled on a later session than the signal');
    assert.ok(Math.abs(t.entryZ) >= r.params.entryZ);
  }
});

test('backtest: a fill happens at the open of the session after the signal', () => {
  const r = backtestPair({ ...pairInput(), params: paramsFor(FREE) });
  const t = r.trades[0];
  assert.equal(DATES.indexOf(t.entryDate), DATES.indexOf(t.signalDate) + 1);
});

test('backtest: nothing in the formation result depends on the trading period', () => {
  const base = backtestPair({ ...pairInput(), params: paramsFor() });
  const altered = backtestPair({
    ...pairInput((a) => {
      for (let i = 400; i < N; i += 1) {
        a[i] = { ...a[i], open: a[i].open * 1.3, close: a[i].close * 1.3 };
      }
    }),
    params: paramsFor(),
  });
  assert.deepEqual(altered.formation, base.formation);
});

test('backtest: no look-ahead, later prices never change earlier trades', () => {
  const base = backtestPair({ ...pairInput(), params: paramsFor() });
  const cut = DATES[520];
  const altered = backtestPair({
    ...pairInput((a, b) => {
      for (let i = 521; i < N; i += 1) {
        a[i] = { ...a[i], open: a[i].open * 0.7, close: a[i].close * 0.7 };
        b[i] = { ...b[i], open: b[i].open * 1.2, close: b[i].close * 1.2 };
      }
    }),
    params: paramsFor(),
  });
  const before = (r) => r.trades.filter((t) => t.exitDate && t.exitDate <= cut);
  assert.ok(before(base).length > 0);
  assert.deepEqual(before(altered), before(base));
  const curveBefore = (r) => r.curve.filter((p) => p.date <= cut);
  assert.deepEqual(curveBefore(altered), curveBefore(base));
  assert.deepEqual(
    altered.zSeries.filter((p) => p.date <= cut),
    base.zSeries.filter((p) => p.date <= cut),
  );
});

test('backtest: with no costs, trade P&L reconciles to the equity change', () => {
  const r = backtestPair({ ...pairInput(), params: paramsFor(FREE) });
  assert.equal(r.costs.total, 0);
  const pnl = r.trades.reduce((acc, t) => acc + t.pnl, 0);
  const end = r.curve[r.curve.length - 1].equity;
  near(pnl, end - 100000, 0.05 * r.trades.length);
  /* Each closed trade's return is its P&L over the equity it started with. */
  let equity = 100000;
  for (const t of r.trades.filter((x) => !x.open)) {
    near(t.pnlPct, t.pnl / equity, 1e-5);
    equity += t.pnl;
  }
});

test('backtest: costs only ever reduce the result', () => {
  const free = backtestPair({ ...pairInput(), params: paramsFor(FREE) });
  const charged = backtestPair({ ...pairInput(), params: paramsFor() });
  assert.ok(charged.costs.total > 0);
  assert.ok(charged.costs.borrow > 0, 'the short leg pays borrow');
  assert.ok(charged.metrics.totalReturn < free.metrics.totalReturn);
  near(
    charged.costs.total,
    charged.costs.commissions + charged.costs.slippage + charged.costs.borrow,
    0.02,
  );
});

test('backtest: legs are sized by the hedge ratio, in whole shares', () => {
  const r = backtestPair({ ...pairInput(), params: paramsFor(FREE) });
  const t = r.trades[0];
  assert.ok(Number.isInteger(t.sharesY) && Number.isInteger(t.sharesX));
  const i = DATES.indexOf(t.entryDate);
  const input = pairInput();
  const yBars = r.y === 'YYY' ? input.barsA : input.barsB;
  const xBars = r.y === 'YYY' ? input.barsB : input.barsA;
  /* Notional on X is the hedge ratio times the notional on Y, within one share. */
  const ny = t.sharesY * yBars[i].open;
  const nx = t.sharesX * xBars[i].open;
  near(nx / ny, r.formation.hedgeRatio, 0.02);
  /* Together they use the account's equity, gross. */
  assert.ok(ny + nx <= 100000 + 1e-6 && ny + nx > 99000);
});

test('backtest: exits are a reversion, a stop, or the end of the test', () => {
  const r = backtestPair({ ...pairInput(), params: paramsFor() });
  for (const t of r.trades) {
    assert.ok(['reverted', 'stop', 'open_at_end'].includes(t.exitReason));
    assert.equal(t.open, t.exitReason === 'open_at_end');
  }
  assert.ok(r.trades.filter((t) => t.open).length <= 1);
});

test('backtest: deterministic', () => {
  assert.deepEqual(
    backtestPair({ ...pairInput(), params: paramsFor() }),
    backtestPair({ ...pairInput(), params: paramsFor() }),
  );
});

test('backtest: an untradable or too-short pair is refused with a reason', () => {
  const short = sessions(200);
  const { x, y } = logSeries(200);
  assert.throws(
    () =>
      backtestPair({
        tickerA: 'A',
        tickerB: 'B',
        barsA: barsOf(short, y),
        barsB: barsOf(short, x),
        params: paramsFor(),
      }),
    /Not enough shared trading days/,
  );
  /* Y falls whenever X rises: the fitted hedge ratio is negative. */
  const { x: x2, u: u2 } = logSeries(N, 5);
  assert.throws(
    () =>
      backtestPair({
        tickerA: 'A',
        tickerB: 'B',
        barsA: barsOf(
          DATES,
          x2.map((v, i) => 8 - v + u2[i]),
        ),
        barsB: barsOf(DATES, x2),
        params: paramsFor(),
      }),
    /did not move together/,
  );
});

test('backtest: a pair that fails the test is traded with a warning, not silently', () => {
  const { x, w } = logSeries(N, 3);
  let r = null;
  try {
    r = backtestPair({
      tickerA: 'WWW',
      tickerB: 'XXX',
      barsA: barsOf(DATES, w),
      barsB: barsOf(DATES, x),
      params: paramsFor(),
    });
  } catch (err) {
    /* A negative fitted hedge ratio is also an honest refusal. */
    assert.match(err.message, /did not move together/);
    return;
  }
  if (r.formation.confidence === null) {
    assert.ok(r.warnings.some((m) => m.includes('did not pass the cointegration test')));
  }
});

test('settings are clamped and contradictory levels are rejected', () => {
  const { params } = normalizePairParams({ formationPct: 5, lookback: 3, entryZ: 99 });
  assert.equal(params.formationPct, 30);
  assert.equal(params.lookback, 20);
  assert.equal(params.entryZ, 5);
  assert.ok(normalizePairParams({ entryZ: 1, exitZ: 1.5 }).errors.length);
  assert.ok(normalizePairParams({ entryZ: 3, stopZ: 2 }).errors.length);
});
