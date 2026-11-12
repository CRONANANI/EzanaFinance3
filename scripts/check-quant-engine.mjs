/**
 * Quant Lab: metric definitions and backtest engine correctness (Nov 2026).
 *
 * Every expected number below is worked out by hand in the comment above it,
 * not copied from the code under test.
 *
 *   node --no-warnings --test scripts/check-quant-engine.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRunMetrics,
  drawdownStats,
  monthlyReturns,
  quantile,
  tradeStats,
} from '../src/lib/quants/metrics.js';
import {
  validateSpec,
  normalizeConfig,
  explainSpec,
  canonicalJson,
  specEventKinds,
} from '../src/lib/quants/strategy-spec.js';
import { runBacktest, sma, rsi, ENGINE_VERSION } from '../src/lib/quants/backtest-engine.js';

const near = (a, b, tol = 1e-4) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

/* Weekday calendar starting 2024-01-01 (a Monday). */
function sessions(n, start = '2024-01-01') {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  while (out.length < n) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
const mkBars = (dates, closes, opens) =>
  dates.map((date, i) => ({
    date,
    open: opens ? opens[i] : closes[i],
    high: Math.max(closes[i], opens ? opens[i] : closes[i]),
    low: Math.min(closes[i], opens ? opens[i] : closes[i]),
    close: closes[i],
    volume: 1000,
  }));
const curveOf = (dates, equity, benchmark) =>
  dates.map((date, i) => ({ date, equity: equity[i], benchmark: benchmark ? benchmark[i] : null }));

const FREE = { commissionPerShare: 0, commissionBps: 0, slippageBps: 0, borrowRate: 0 };
const cfg = (dates, extra = {}) =>
  normalizeConfig({
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    initialCapital: 100000,
    ...extra,
  }).config;
const specOf = (extra = {}) => {
  const v = validateSpec({
    universe: ['AAA'],
    benchmark: 'SPY',
    side: 'long',
    entry: { op: 'cond', id: 'price_above_sma', params: { period: 2 } },
    exit: {},
    sizing: { type: 'equal_weight', maxPositions: 1 },
    ...extra,
  });
  assert.deepEqual(v.errors, []);
  return v.spec;
};

/* ── Metrics ─────────────────────────────────────────────── */

test('Sharpe, Sortino, drawdown and total return match a hand calculation', () => {
  // Equity 100, 110, 99, 108.9 -> returns +0.1, -0.1, +0.1.
  // mean = 0.0333333. Deviations 0.0666667, -0.1333333, 0.0666667.
  // Sample variance = (0.0044444 + 0.0177778 + 0.0044444) / 2 = 0.0133333, sd = 0.1154701.
  // Sharpe = 0.0333333 / 0.1154701 * sqrt(252) = 0.2886751 * 15.8745079 = 4.5825757.
  // Downside deviation = sqrt((0 + 0.01 + 0) / 3) = 0.0577350.
  // Sortino = 0.0333333 / 0.0577350 * 15.8745079 = 9.1651514.
  // Max drawdown = 99 / 110 - 1 = -0.1. Total return = 108.9 / 100 - 1 = 0.089.
  const d = sessions(4);
  const m = computeRunMetrics({ curve: curveOf(d, [100, 110, 99, 108.9]) });
  near(m.sharpe, 4.5825757);
  near(m.sortino, 9.1651514);
  near(m.maxDrawdown, -0.1, 1e-12);
  near(m.totalReturn, 0.089, 1e-12);
  near(m.volatility, 0.1154701 * Math.sqrt(252));
});

test('Sharpe uses the risk-free rate that was selected', () => {
  // Same returns, rf 2.52% a year = 0.0001 a day: (0.0333333 - 0.0001) / 0.1154701 * 15.8745079 = 4.5688280.
  const m = computeRunMetrics({
    curve: curveOf(sessions(4), [100, 110, 99, 108.9]),
    riskFreeRate: 0.0252,
  });
  near(m.sharpe, 4.568828);
});

test('zero variance or too little data gives null, never a made-up number', () => {
  const flat = computeRunMetrics({ curve: curveOf(sessions(4), [100, 100, 100, 100]) });
  assert.equal(flat.sharpe, null);
  assert.equal(flat.sortino, null);
  assert.equal(flat.valueAtRisk95, null);
  const one = computeRunMetrics({ curve: curveOf(sessions(1), [100]) });
  assert.equal(one.totalReturn, null);
  assert.equal(one.cagr, null);
});

test('CAGR compounds over calendar time', () => {
  // 100 -> 121 over exactly 2 * 365.25 days is 10% a year. 2024-01-01 + 731 days
  // = 2026-01-01 (730.5 would be exact): (1.21)^(365.25/731) - 1 = 0.0999285.
  const m = computeRunMetrics({
    curve: [
      { date: '2024-01-01', equity: 100 },
      { date: '2026-01-01', equity: 121 },
    ],
  });
  near(m.cagr, 0.0999285, 1e-6);
});

test('profit factor is gross profit over gross loss on closed trades', () => {
  // +100, +50, -60 -> 150 / 60 = 2.5, win rate 2/3, expectancy 90 / 3 = 30.
  const s = tradeStats([{ pnl: 100 }, { pnl: 50 }, { pnl: -60 }, { pnl: 999, open: true }]);
  near(s.profitFactor, 2.5, 1e-12);
  near(s.winRate, 2 / 3, 1e-12);
  near(s.expectancy, 30, 1e-12);
  assert.equal(s.closedTrades, 3);
  assert.equal(s.openTrades, 1);
  assert.equal(tradeStats([{ pnl: 10 }, { pnl: 5 }]).profitFactor, null);
});

test('historical VaR and expected shortfall', () => {
  // 21 returns -0.10, -0.09, ..., +0.10. 5th percentile position = 20 * 0.05 = 1
  // -> the second smallest, -0.09. VaR = 0.09. ES = mean(-0.10, -0.09) = 0.095.
  const rets = Array.from({ length: 21 }, (_, i) => (i - 10) / 100);
  near(quantile(rets, 0.05), -0.09, 1e-12);
  const equity = [100];
  rets.forEach((r) => equity.push(equity[equity.length - 1] * (1 + r)));
  const m = computeRunMetrics({ curve: curveOf(sessions(22), equity) });
  near(m.valueAtRisk95, 0.09, 1e-9);
  near(m.expectedShortfall95, 0.095, 1e-9);
});

test('beta, alpha and correlation against the benchmark', () => {
  // Strategy return is exactly twice the benchmark return each day:
  // beta = 2, correlation = 1, Jensen alpha = mean(r) - 2 * mean(b) = 0.
  const br = [0.01, -0.02, 0.015, 0.005, -0.01];
  const b = [100];
  const e = [100];
  br.forEach((r) => {
    b.push(b[b.length - 1] * (1 + r));
    e.push(e[e.length - 1] * (1 + 2 * r));
  });
  const m = computeRunMetrics({ curve: curveOf(sessions(6), e, b) });
  near(m.beta, 2, 1e-9);
  near(m.correlation, 1, 1e-9);
  near(m.alpha, 0, 1e-9);
});

test('drawdown episodes: depth, duration and recovery', () => {
  // 100, 120, 90, 100, 120, 110. Episode 1: peak 120 (day 2), trough 90 (day 3,
  // -25%), recovered day 5. Episode 2: 110 vs 120 = -8.3333%, still open.
  // Worst = -0.25; recovery from trough = Jan 3 -> Jan 5 = 2 days; longest
  // episode Jan 2 -> Jan 5 = 3 days; average depth = (-0.25 - 0.0833333) / 2.
  const d = sessions(6);
  const dd = drawdownStats(curveOf(d, [100, 120, 90, 100, 120, 110]));
  near(dd.maxDrawdown, -0.25, 1e-12);
  assert.equal(dd.maxDrawdownRecoveryDays, 2);
  assert.equal(dd.longestDrawdownDays, 3);
  near(dd.currentDrawdown, 110 / 120 - 1, 1e-12);
  near(dd.averageDrawdown, (-0.25 + (110 / 120 - 1)) / 2, 1e-12);
});

test('monthly returns chain from the previous month end', () => {
  const m = monthlyReturns([
    { date: '2024-01-30', equity: 100 },
    { date: '2024-01-31', equity: 110 },
    { date: '2024-02-15', equity: 121 },
    { date: '2024-02-29', equity: 99 },
  ]);
  assert.equal(m.length, 2);
  near(m[0].return, 0.1, 1e-12);
  near(m[1].return, 99 / 110 - 1, 1e-12);
});

/* ── Indicators ──────────────────────────────────────────── */

test('SMA and RSI are null until enough history exists', () => {
  assert.deepEqual(sma([1, 2, 3, 4], 3), [null, null, 2, 3]);
  // Closes 1, 2, 3 with period 2: gains 1, 1 and no losses -> RSI 100.
  assert.deepEqual(rsi([1, 2, 3], 2), [null, null, 100]);
});

/* ── Engine ──────────────────────────────────────────────── */

test('a signal on the close fills at the NEXT session open, never on its own bar', () => {
  // SMA(2): closes 10, 10, 12 -> day 3 close 12 > SMA 11: first signal on day 3.
  const d = sessions(6);
  const closes = [10, 10, 12, 13, 14, 15];
  const opens = [10, 10, 10, 12.5, 13.5, 14.5];
  const r = runBacktest({
    spec: specOf(),
    config: cfg(d, { ...FREE }),
    bars: { AAA: mkBars(d, closes, opens) },
  });
  const t = r.trades[0];
  assert.equal(t.signalDate, d[2]);
  assert.equal(t.entryDate, d[3]);
  assert.equal(t.entryPrice, 12.5);
  assert.equal(r.curve[2].positions, 0);
  assert.equal(r.curve[3].positions, 1);
});

test('no look-ahead: cutting off the future does not change the past', () => {
  const d = sessions(120);
  const closes = d.map((_, i) => 50 + 10 * Math.sin(i / 7) + i * 0.05);
  const opens = closes.map((c, i) => c - 0.3 * Math.cos(i));
  const spec = specOf({
    entry: { op: 'cond', id: 'price_above_sma', params: { period: 10 } },
    exit: { rule: { op: 'cond', id: 'price_below_sma', params: { period: 10 } } },
  });
  const full = runBacktest({ spec, config: cfg(d), bars: { AAA: mkBars(d, closes, opens) } });
  const cut = 80;
  const part = runBacktest({
    spec,
    config: cfg(d.slice(0, cut)),
    bars: { AAA: mkBars(d.slice(0, cut), closes.slice(0, cut), opens.slice(0, cut)) },
  });
  assert.deepEqual(part.curve, full.curve.slice(0, cut));
  const closedBefore = (r) => r.trades.filter((t) => !t.open && t.exitDate <= d[cut - 1]);
  assert.deepEqual(closedBefore(part), closedBefore(full));
});

test('no trade before the start date, even when warm-up history has signals', () => {
  const d = sessions(40);
  const closes = d.map((_, i) => 10 + i);
  const r = runBacktest({
    spec: specOf(),
    config: { ...cfg(d), startDate: d[20] },
    bars: { AAA: mkBars(d, closes) },
  });
  assert.equal(r.curve[0].date, d[20]);
  assert.ok(r.trades.every((t) => t.entryDate > d[20] && t.signalDate >= d[20]));
});

test('P&L reconciles: ending equity minus starting capital equals the sum of trade P&L', () => {
  const d = sessions(200);
  const mk = (phase) => d.map((_, i) => 40 + 8 * Math.sin(i / 9 + phase) + i * 0.03);
  const spec = specOf({
    universe: ['AAA', 'BBB', 'CCC'],
    entry: { op: 'cond', id: 'rsi_below', params: { threshold: 45, period: 5 } },
    exit: { takeProfitPct: 4, stopLossPct: 6, maxHoldDays: 20 },
    sizing: { type: 'pct_equity', pct: 30, maxPositions: 3 },
  });
  const r = runBacktest({
    spec,
    config: cfg(d),
    bars: { AAA: mkBars(d, mk(0)), BBB: mkBars(d, mk(2)), CCC: mkBars(d, mk(4)) },
  });
  assert.ok(r.trades.length > 5, 'the scenario should trade');
  const pnl = r.trades.reduce((a, t) => a + t.pnl, 0);
  near(r.metrics.endEquity - 100000, pnl, 0.02 * r.trades.length + 0.02);
  assert.ok(r.costs.total > 0);
});

test('transaction costs are deducted', () => {
  const d = sessions(60);
  const closes = d.map((_, i) => 20 + 3 * Math.sin(i / 4));
  const spec = specOf({
    entry: { op: 'cond', id: 'price_above_sma', params: { period: 3 } },
    exit: { rule: { op: 'cond', id: 'price_below_sma', params: { period: 3 } } },
  });
  const bars = { AAA: mkBars(d, closes) };
  const free = runBacktest({ spec, config: cfg(d, FREE), bars });
  const paid = runBacktest({
    spec,
    config: cfg(d, { slippageBps: 10, commissionPerShare: 0.01 }),
    bars,
  });
  assert.equal(free.costs.total, 0);
  assert.ok(paid.costs.commissions > 0 && paid.costs.slippage > 0);
  assert.ok(paid.metrics.endEquity < free.metrics.endEquity);
});

test('insufficient cash and the position limit reject orders', () => {
  const d = sessions(8);
  const up = [10, 10, 12, 13, 14, 15, 16, 17];
  const poor = runBacktest({
    spec: specOf(),
    config: cfg(d, { ...FREE, initialCapital: 1000 }),
    bars: {
      AAA: mkBars(
        d,
        up.map((c) => c * 200),
      ),
    },
  });
  assert.equal(poor.trades.length, 0);
  assert.equal(poor.rejected[0].reason, 'Insufficient cash');

  const limited = runBacktest({
    spec: specOf({
      universe: ['AAA', 'BBB'],
      sizing: { type: 'pct_equity', pct: 10, maxPositions: 1 },
    }),
    config: cfg(d, FREE),
    bars: { AAA: mkBars(d, up), BBB: mkBars(d, up) },
  });
  assert.equal(limited.trades.length, 1);
  assert.equal(limited.trades[0].ticker, 'AAA');
  assert.ok(
    limited.rejected.some((x) => x.ticker === 'BBB' && x.reason === 'Position limit reached'),
  );
});

test('short positions: profit when price falls, borrow cost charged', () => {
  // Signal on day 3 (close 8 < SMA 9), short at day 4 open 8.
  // Equal weight, 1 position: floor(100000 / 8) = 12500 shares.
  // Time exit after 1 day -> queued on day 5 close, fills day 6 open 6.
  // Gross = 12500 * (8 - 6) = 25000.
  const d = sessions(7);
  const closes = [10, 10, 8, 7, 6.5, 6, 6];
  const opens = [10, 10, 10, 8, 7, 6, 6];
  const spec = specOf({
    side: 'short',
    entry: { op: 'cond', id: 'price_below_sma', params: { period: 2 } },
    exit: { maxHoldDays: 1 },
  });
  const bars = { AAA: mkBars(d, closes, opens) };
  const free = runBacktest({ spec, config: cfg(d, FREE), bars });
  const first = free.trades[0];
  assert.equal(first.side, 'short');
  assert.equal(first.shares, 12500);
  assert.equal(first.entryPrice, 8);
  assert.equal(first.exitPrice, 6);
  near(first.pnl, 25000, 0.01);
  const borrow = runBacktest({ spec, config: cfg(d, { ...FREE, borrowRate: 0.252 }), bars });
  // Borrow 25.2% a year = 0.1% a day on the marked short value: day 4 (7) and day 5 (6.5).
  // 12500 * 7 * 0.001 + 12500 * 6.5 * 0.001 = 87.5 + 81.25 = 168.75.
  near(borrow.trades[0].costs, 168.75, 0.01);
  near(borrow.trades[0].pnl, 25000 - 168.75, 0.01);
});

test('trailing stop exits after the close falls from its best close', () => {
  // Enter day 4 open (12). Closes 13, 15, 13.4: 13.4 is 10.67% off 15 -> exit queued, fills next open.
  const d = sessions(8);
  const closes = [10, 10, 12, 13, 15, 13.4, 13, 13];
  const opens = [10, 10, 10, 12, 13, 15, 13.2, 13];
  const r = runBacktest({
    spec: specOf({ exit: { trailingStopPct: 10 } }),
    config: cfg(d, FREE),
    bars: { AAA: mkBars(d, closes, opens) },
  });
  assert.equal(r.trades[0].exitReason, 'trailing_stop');
  assert.equal(r.trades[0].exitDate, d[6]);
  assert.equal(r.trades[0].exitPrice, 13.2);
});

test('missing bars are reported, never silently invented', () => {
  const d = sessions(12);
  const closes = d.map((_, i) => 10 + i);
  const aaa = mkBars(d, closes).filter((_, i) => i !== 6 && i !== 7);
  const r = runBacktest({
    spec: specOf(),
    config: cfg(d, FREE),
    bars: { AAA: aaa },
    benchmarkBars: mkBars(d, closes),
  });
  assert.equal(r.curve.length, 12);
  assert.ok(r.coverage.AAA.missingSessions >= 2);
  assert.ok(r.warnings.some((w) => /last known close/.test(w)));
});

test('a ticker with no history is left out with a warning; none at all is an error', () => {
  const d = sessions(10);
  const closes = d.map((_, i) => 10 + i);
  const r = runBacktest({
    spec: specOf({ universe: ['AAA', 'ZZZ'] }),
    config: cfg(d),
    bars: { AAA: mkBars(d, closes) },
  });
  assert.ok(r.warnings.some((w) => w.startsWith('ZZZ')));
  assert.throws(() => runBacktest({ spec: specOf(), config: cfg(d), bars: {} }), /price history/);
});

test('identical inputs give identical results', () => {
  const d = sessions(150);
  const closes = d.map((_, i) => 30 + 5 * Math.sin(i / 5) + i * 0.02);
  const input = () => ({
    spec: specOf({
      entry: {
        op: 'and',
        args: [
          { op: 'cond', id: 'price_above_sma', params: { period: 20 } },
          { op: 'not', arg: { op: 'cond', id: 'rsi_above', params: { threshold: 80 } } },
        ],
      },
      exit: { trailingStopPct: 5 },
    }),
    config: cfg(d),
    bars: { AAA: mkBars(d, closes) },
    benchmarkBars: mkBars(
      d,
      closes.map((c) => c * 2),
    ),
  });
  const a = runBacktest(input());
  const b = runBacktest(input());
  assert.deepEqual(a, b);
  assert.equal(a.engineVersion, ENGINE_VERSION);
});

/* ── Spec validation ─────────────────────────────────────── */

test('spec validation: tickers, parameters, legacy ids and unsupported conditions', () => {
  const bad = validateSpec({
    universe: ['aapl', 'not a ticker!'],
    entry: { op: 'cond', id: 'sma_cross_up', params: { fast: 200, slow: 50 } },
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => /not a valid ticker/.test(e)));
  assert.ok(bad.errors.some((e) => /shorter than slow/.test(e)));

  const legacy = validateSpec({ universe: ['AAPL'], entry: { op: 'cond', id: 'macd_crossover' } });
  assert.equal(legacy.spec.entry.id, 'macd_cross_up');

  const alt = validateSpec({ universe: ['AAPL'], entry: { op: 'cond', id: 'cpi_surprise' } });
  assert.equal(alt.ok, true);
  assert.equal(alt.unsupported[0].id, 'cpi_surprise');
  assert.throws(
    () => runBacktest({ spec: alt.spec, config: cfg(sessions(10)), bars: {} }),
    /cannot be backtested/,
  );
});

test('equal specs serialise identically, and the explanation states the execution rule', () => {
  const a = validateSpec({
    universe: ['MSFT', 'AAPL'],
    entry: { op: 'cond', id: 'rsi_below', params: { threshold: 30 } },
  });
  const b = validateSpec({
    entry: { id: 'rsi_below', op: 'cond', params: { threshold: 30 } },
    universe: ['MSFT', 'AAPL'],
  });
  assert.equal(canonicalJson(a.spec), canonicalJson(b.spec));
  assert.ok(explainSpec(a.spec).some((s) => /next session's open/.test(s)));
});

test('run settings are bounded', () => {
  const { config, errors } = normalizeConfig({
    startDate: '2010-01-01',
    endDate: '2024-01-01',
    slippageBps: 99999,
    initialCapital: -5,
  });
  assert.ok(errors.some((e) => /at most 10 years/.test(e)));
  assert.equal(config.slippageBps, 200);
  assert.equal(config.initialCapital, 1000);
});

/* ── Disclosure conditions ── */

/* 2024-01-01 is a Monday: sessions 01-01, 01-02, 01-03, 01-04, 01-05, 01-08, 01-09, ... */
const discSpec = (withinDays = 3, id = 'insider_purchase') =>
  validateSpec({
    universe: ['AAA'],
    benchmark: 'AAA',
    entry: { op: 'cond', id, params: { withinDays } },
    exit: { maxHoldDays: 200 },
    sizing: { type: 'equal_weight', maxPositions: 1 },
  }).spec;
const discRun = (events, extra = {}, withinDays = 3) => {
  const dates = sessions(30);
  return runBacktest({
    spec: discSpec(withinDays),
    config: cfg(dates, { ...FREE, ...extra }),
    bars: {
      AAA: mkBars(
        dates,
        dates.map(() => 100),
      ),
    },
    events,
  });
};

test('disclosure conditions are backtestable and name the data they need', () => {
  const v = validateSpec({
    universe: ['AAPL'],
    entry: {
      op: 'and',
      args: [
        { op: 'cond', id: 'congress_buy' },
        { op: 'cond', id: 'insider_purchase', params: { withinDays: 10 } },
      ],
    },
  });
  assert.equal(v.ok, true);
  assert.deepEqual(v.unsupported, []);
  assert.equal(v.spec.entry.args[0].params.withinDays, 5, 'default window');
  assert.deepEqual(specEventKinds(v.spec), ['congress_buy', 'insider_purchase']);
  assert.deepEqual(specEventKinds(specOf()), []);
  assert.ok(explainSpec(v.spec).join(' ').includes('publicly disclosed'));
});

test('a disclosure counts from the session AFTER it became public, and fills the session after that', () => {
  /* Made public on Wednesday 01-03. It may have landed after that close, so
     the first signal is Thursday's close and the fill is Friday's open. */
  const r = discRun({ insider_purchase: { AAA: ['2024-01-03'] } });
  assert.equal(r.trades.length, 1);
  assert.equal(r.trades[0].signalDate, '2024-01-04');
  assert.equal(r.trades[0].entryDate, '2024-01-05');
  assert.equal(r.trades[0].entryReads.insider_purchaseDisclosed, '2024-01-03');
});

test('a weekend disclosure is acted on from Monday', () => {
  /* Public on Saturday 01-06: first signal Monday 01-08, fill Tuesday 01-09. */
  const r = discRun({ insider_purchase: { AAA: ['2024-01-06'] } });
  assert.equal(r.trades[0].signalDate, '2024-01-08');
  assert.equal(r.trades[0].entryDate, '2024-01-09');
});

test('a disclosure expires after its window', () => {
  /* Public 01-03; the test starts 01-10, seven days later. A 3 day window has
     lapsed; a 10 day window is still open on the first session. */
  const late = { startDate: '2024-01-10' };
  assert.equal(discRun({ insider_purchase: { AAA: ['2024-01-03'] } }, late, 3).trades.length, 0);
  const open = discRun({ insider_purchase: { AAA: ['2024-01-03'] } }, late, 10);
  assert.equal(open.trades[0].signalDate, '2024-01-10');
});

test('disclosures of another ticker or another kind are ignored', () => {
  const r = discRun({
    insider_purchase: { BBB: ['2024-01-03'] },
    congress_buy: { AAA: ['2024-01-03'] },
  });
  assert.equal(r.trades.length, 0);
  assert.ok(r.warnings.some((w) => w.includes('never fired')));
});

test('a run that needs disclosure data refuses to start without it', () => {
  assert.throws(() => discRun({}), /Disclosure data for this strategy was not loaded/);
  /* An empty list is data: the run is valid and simply has no trades. */
  assert.equal(discRun({ insider_purchase: {} }).trades.length, 0);
});

test('a later disclosure never changes an earlier result', () => {
  const a = discRun({ insider_purchase: { AAA: ['2024-01-03'] } }, { endDate: '2024-01-19' });
  const b = discRun(
    { insider_purchase: { AAA: ['2024-01-03', '2024-01-25'] } },
    { endDate: '2024-01-19' },
  );
  assert.deepEqual(b.trades, a.trades);
  assert.deepEqual(b.curve, a.curve);
});
