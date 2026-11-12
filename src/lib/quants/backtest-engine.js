// src/lib/quants/backtest-engine.js
// Quant Lab backtest engine. A pure, deterministic function of
// (strategy spec, daily bars, run config): no I/O, no clock, no randomness, so
// identical inputs always give identical results and every rule is unit
// testable. The API route loads the bars and stores what this returns.
//
// Order of events on each trading day t (the trading calendar is the
// benchmark's own sessions):
//   1. Orders queued after the close of the previous session fill at the OPEN
//      of day t, plus or minus slippage, with commission. Exits fill first.
//   2. Short positions pay one day of borrow cost.
//   3. Positions are marked at the CLOSE of day t.
//   4. Entry and exit rules are evaluated on data up to and including the
//      close of day t, and queue orders for the next session.
// A signal can therefore never trade on its own bar (no look-ahead, no
// same-bar fills), and an indicator value on day t only ever uses bars <= t.
//
// What it deliberately does NOT model, and says so in `assumptions`:
// intraday stop fills, partial fills, market impact, limit orders, dividends
// beyond what the price source adjusts for, and delisted securities.

import { CONDITIONS } from './strategy-spec.js';
import { computeRunMetrics, drawdownStats, monthlyReturns, sampleCaveats } from './metrics.js';

export const ENGINE_VERSION = 'ql-engine-1.1.0';

/** Sessions an order may wait for its ticker to trade before it is cancelled. */
const MAX_ORDER_WAIT = 5;

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

/* ── Indicators (null until enough history exists) ─────────── */

export function sma(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  let bad = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (isNum(values[i])) sum += values[i];
    else bad += 1;
    if (i >= period) {
      if (isNum(values[i - period])) sum -= values[i - period];
      else bad -= 1;
    }
    if (i >= period - 1 && bad === 0) out[i] = sum / period;
  }
  return out;
}

/** EMA seeded with the SMA of the first `period` values. */
export function ema(values, period) {
  const out = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev = null;
  let seed = 0;
  let seen = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (!isNum(v)) continue;
    if (prev === null) {
      seed += v;
      seen += 1;
      if (seen === period) {
        prev = seed / period;
        out[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < closes.length; i += 1) {
    const ch = closes[i] - closes[i - 1];
    const gain = Math.max(ch, 0);
    const loss = Math.max(-ch, 0);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (i >= period) out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function macd(closes, fast = 12, slow = 26, signalPeriod = 9) {
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const line = closes.map((_, i) => (isNum(f[i]) && isNum(s[i]) ? f[i] - s[i] : null));
  const firstIdx = line.findIndex(isNum);
  const sig = new Array(closes.length).fill(null);
  if (firstIdx >= 0) {
    const tail = ema(line.slice(firstIdx), signalPeriod);
    tail.forEach((v, i) => {
      sig[firstIdx + i] = v;
    });
  }
  return { line, signal: sig };
}

/** Bollinger Bands: SMA plus or minus k population standard deviations. */
export function bollinger(closes, period = 20, k = 2) {
  const mid = sma(closes, period);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i += 1) {
    if (!isNum(mid[i])) continue;
    let ss = 0;
    for (let j = i - period + 1; j <= i; j += 1) ss += (closes[j] - mid[i]) ** 2;
    const sd = Math.sqrt(ss / period);
    upper[i] = mid[i] + k * sd;
    lower[i] = mid[i] - k * sd;
  }
  return { mid, upper, lower };
}

/* ── Per-ticker indicator cache and rule evaluation ────────── */

function makeContext(bars, events = {}) {
  const closes = bars.map((b) => b.close);
  const cache = new Map();
  const memo = (key, fn) => {
    if (!cache.has(key)) cache.set(key, fn());
    return cache.get(key);
  };
  return {
    bars,
    closes,
    /* { kind: sorted public dates } for this ticker. */
    events,
    sma: (p) => memo(`sma${p}`, () => sma(closes, p)),
    rsi: (p) => memo(`rsi${p}`, () => rsi(closes, p)),
    macd: () => memo('macd', () => macd(closes)),
    boll: (p) => memo(`bb${p}`, () => bollinger(closes, p)),
    /* Average volume of the PREVIOUS `w` sessions, excluding today. */
    volAvg: (w) =>
      memo(`vol${w}`, () => {
        const avg = sma(
          bars.map((b) => b.volume),
          w,
        );
        return avg.map((_, i) => (i > 0 ? avg[i - 1] : null));
      }),
  };
}

const round = (x, dp = 4) => (isNum(x) ? Number(x.toFixed(dp)) : null);

/**
 * Evaluate one condition on bar i.
 * @returns {{ value: boolean|null, reads: object }} value null = not enough history
 */
function evalCondition(id, p, ctx, i) {
  const bar = ctx.bars[i];
  const c = bar.close;
  switch (id) {
    case 'price_above_sma':
    case 'price_below_sma': {
      const m = ctx.sma(p.period)[i];
      if (!isNum(m)) return { value: null, reads: {} };
      return {
        value: id === 'price_above_sma' ? c > m : c < m,
        reads: { close: round(c), [`sma${p.period}`]: round(m) },
      };
    }
    case 'sma_cross_up':
    case 'sma_cross_down': {
      const f = ctx.sma(p.fast);
      const s = ctx.sma(p.slow);
      if (i < 1 || ![f[i], s[i], f[i - 1], s[i - 1]].every(isNum))
        return { value: null, reads: {} };
      const up = f[i - 1] <= s[i - 1] && f[i] > s[i];
      const down = f[i - 1] >= s[i - 1] && f[i] < s[i];
      return {
        value: id === 'sma_cross_up' ? up : down,
        reads: { [`sma${p.fast}`]: round(f[i]), [`sma${p.slow}`]: round(s[i]) },
      };
    }
    case 'rsi_below':
    case 'rsi_above': {
      const r = ctx.rsi(p.period)[i];
      if (!isNum(r)) return { value: null, reads: {} };
      return {
        value: id === 'rsi_below' ? r < p.threshold : r > p.threshold,
        reads: { [`rsi${p.period}`]: round(r, 2) },
      };
    }
    case 'macd_cross_up':
    case 'macd_cross_down': {
      const { line, signal } = ctx.macd();
      if (i < 1 || ![line[i], signal[i], line[i - 1], signal[i - 1]].every(isNum)) {
        return { value: null, reads: {} };
      }
      const up = line[i - 1] <= signal[i - 1] && line[i] > signal[i];
      const down = line[i - 1] >= signal[i - 1] && line[i] < signal[i];
      return {
        value: id === 'macd_cross_up' ? up : down,
        reads: { macd: round(line[i]), macdSignal: round(signal[i]) },
      };
    }
    case 'bollinger_touch': {
      const bb = ctx.boll(p.period);
      if (!isNum(bb.lower[i])) return { value: null, reads: {} };
      const low = isNum(bar.low) ? bar.low : c;
      const high = isNum(bar.high) ? bar.high : c;
      return p.band === 'upper'
        ? {
            value: high >= bb.upper[i],
            reads: { high: round(high), upperBand: round(bb.upper[i]) },
          }
        : { value: low <= bb.lower[i], reads: { low: round(low), lowerBand: round(bb.lower[i]) } };
    }
    case 'volume_spike': {
      const avg = ctx.volAvg(p.window)[i];
      if (!isNum(avg) || avg <= 0 || !isNum(bar.volume)) return { value: null, reads: {} };
      return {
        value: bar.volume >= p.multiple * avg,
        reads: { volume: bar.volume, [`avgVolume${p.window}`]: Math.round(avg) },
      };
    }
    case 'congress_buy':
    case 'congress_sell':
    case 'insider_purchase': {
      /* Latest disclosure made public strictly BEFORE this session. A filing
         dated today may have landed after the close, so it only counts from
         the next session. */
      const last = lastBefore(ctx.events[id] || [], bar.date);
      if (!last) return { value: false, reads: {} };
      const age = Math.round((Date.parse(bar.date) - Date.parse(last)) / 86400000);
      return { value: age <= p.withinDays, reads: { [`${id}Disclosed`]: last } };
    }
    default:
      return { value: null, reads: {} };
  }
}

/** The latest date in a sorted list that is strictly before `date`, or null. */
function lastBefore(sorted, date) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < date) lo = mid + 1;
    else hi = mid;
  }
  return lo > 0 ? sorted[lo - 1] : null;
}

/** Three-valued rule evaluation: null (not enough history) never opens a trade. */
function evalNode(node, ctx, i, reads) {
  if (node.op === 'cond') {
    const r = evalCondition(node.id, node.params, ctx, i);
    Object.assign(reads, r.reads);
    return r.value;
  }
  if (node.op === 'not') {
    const v = evalNode(node.arg, ctx, i, reads);
    return v === null ? null : !v;
  }
  const vals = node.args.map((a) => evalNode(a, ctx, i, reads));
  if (node.op === 'and') {
    if (vals.includes(false)) return false;
    return vals.includes(null) ? null : true;
  }
  if (vals.includes(true)) return true;
  return vals.includes(null) ? null : false;
}

/* ── The engine ────────────────────────────────────────────── */

const calendarDays = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/**
 * @param {object} input
 * @param {object} input.spec    a spec that passed validateSpec with no unsupported conditions
 * @param {object} input.config  from normalizeConfig
 * @param {Record<string, {date:string, open?:number, high?:number, low?:number,
 *                          close:number, volume?:number}[]>} input.bars  oldest first,
 *        including warm-up history before config.startDate
 * @param {{date:string, close:number}[]} [input.benchmarkBars]
 * @param {Record<string, string>} [input.sources]  price source per ticker, for the report
 * @param {Record<string, Record<string, string[]>>} [input.events]  disclosure
 *        dates per kind and ticker, e.g. { insider_purchase: { AAPL: ['2024-03-04'] } }.
 *        Each date is the day the information became PUBLIC. Required for every
 *        kind the spec uses (see specEventKinds).
 */
export function runBacktest({ spec, config, bars, benchmarkBars = [], sources = {}, events = {} }) {
  const eventKinds = new Set();
  for (const id of collectIds(spec)) {
    if (!CONDITIONS[id]) throw new Error(`Condition "${id}" cannot be backtested`);
    if (CONDITIONS[id].event) eventKinds.add(CONDITIONS[id].event);
  }
  for (const kind of eventKinds) {
    if (!events[kind]) throw new Error('Disclosure data for this strategy was not loaded');
  }
  const warnings = [];
  for (const kind of eventKinds) {
    const found = spec.universe.some((t) => (events[kind][t] || []).length > 0);
    if (!found) {
      warnings.push(
        `No ${CONDITIONS[kind].label.toLowerCase()} was on record for these tickers, so that condition never fired.`,
      );
    }
  }
  const side = spec.side === 'short' ? 'short' : 'long';
  const slip = config.slippageBps / 10000;

  /* Universe: tickers that actually have data in the window. */
  const tickers = [];
  const ctx = {};
  const index = {};
  const coverage = {};
  for (const t of [...spec.universe].sort()) {
    const series = (bars[t] || []).filter((b) => isNum(b.close) && b.close > 0);
    const inWindow = series.filter((b) => b.date >= config.startDate && b.date <= config.endDate);
    coverage[t] = {
      source: sources[t] || null,
      bars: inWindow.length,
      first: inWindow[0]?.date ?? null,
      last: inWindow[inWindow.length - 1]?.date ?? null,
      hasOpen: inWindow.length > 0 && inWindow.every((b) => isNum(b.open)),
      missingSessions: 0,
    };
    if (inWindow.length < 2) {
      warnings.push(`${t}: no price history in the test window, left out of the run.`);
      continue;
    }
    tickers.push(t);
    const tickerEvents = {};
    for (const kind of eventKinds) tickerEvents[kind] = [...(events[kind][t] || [])].sort();
    ctx[t] = makeContext(series, tickerEvents);
    index[t] = new Map(series.map((b, i) => [b.date, i]));
    if (!coverage[t].hasOpen) {
      warnings.push(
        `${t}: the price source has no opening prices, so its orders fill at the next session's close instead of the open.`,
      );
    }
  }
  if (!tickers.length) throw new Error('None of the tickers has price history in this window');

  /* Trading calendar: the benchmark's sessions, else the union of the tickers'. */
  const bench = new Map(
    benchmarkBars.filter((b) => isNum(b.close) && b.close > 0).map((b) => [b.date, b.close]),
  );
  let dates = [...bench.keys()];
  if (dates.length < 2) {
    if (benchmarkBars.length)
      warnings.push('Benchmark has no usable history; no benchmark comparison.');
    const all = new Set();
    for (const t of tickers) for (const b of ctx[t].bars) all.add(b.date);
    dates = [...all];
  }
  dates = dates.filter((d) => d >= config.startDate && d <= config.endDate).sort();
  if (dates.length < 2) throw new Error('The test window holds fewer than two trading days');

  let cash = config.initialCapital;
  let prevEquity = config.initialCapital;
  const positions = new Map();
  let pending = [];
  const trades = [];
  const rejected = [];
  const curve = [];
  const lastClose = {};
  const costs = { commissions: 0, slippage: 0, borrow: 0 };
  let tradedNotional = 0;
  let staleMarks = 0;
  let benchBase = null;
  let benchLast = null;

  const commission = (shares, price) =>
    shares * config.commissionPerShare + (shares * price * config.commissionBps) / 10000;

  const closePosition = (pos, date, refPrice, reason) => {
    const fill = pos.side === 'long' ? refPrice * (1 - slip) : refPrice * (1 + slip);
    const comm = commission(pos.shares, fill);
    cash += pos.side === 'long' ? pos.shares * fill - comm : -(pos.shares * fill) - comm;
    costs.commissions += comm;
    costs.slippage += pos.shares * Math.abs(fill - refPrice);
    tradedNotional += pos.shares * fill;
    const gross =
      pos.side === 'long'
        ? pos.shares * (fill - pos.entryPrice)
        : pos.shares * (pos.entryPrice - fill);
    const pnl = gross - pos.entryCommission - comm - pos.borrow;
    trades.push({
      ticker: pos.ticker,
      side: pos.side,
      shares: pos.shares,
      entryDate: pos.entryDate,
      entryPrice: round(pos.entryPrice),
      exitDate: date,
      exitPrice: round(fill),
      holdDays: calendarDays(pos.entryDate, date),
      pnl: round(pnl, 2),
      pnlPct: round(pnl / (pos.shares * pos.entryPrice), 6),
      costs: round(pos.entryCommission + comm + pos.borrow, 2),
      exitReason: reason,
      signalDate: pos.signalDate,
      entryReads: pos.entryReads,
      open: false,
    });
    positions.delete(pos.ticker);
  };

  for (let di = 0; di < dates.length; di += 1) {
    const date = dates[di];
    const barOf = (t) => {
      const i = index[t].get(date);
      return i === undefined ? null : { i, bar: ctx[t].bars[i] };
    };

    /* 1. Fill orders queued after the previous close. Exits first, then entries by ticker. */
    const carry = [];
    pending.sort((a, b) =>
      a.type === b.type ? a.ticker.localeCompare(b.ticker) : a.type === 'exit' ? -1 : 1,
    );
    for (const order of pending) {
      const hit = barOf(order.ticker);
      if (!hit) {
        order.waited += 1;
        coverage[order.ticker].missingSessions += 1;
        if (order.waited > MAX_ORDER_WAIT) {
          rejected.push({
            date,
            ticker: order.ticker,
            type: order.type,
            reason: 'No price for 5 sessions',
          });
          if (order.type === 'exit') {
            warnings.push(`${order.ticker}: an exit could not fill for 5 sessions (no prices).`);
          }
        } else carry.push(order);
        continue;
      }
      const ref = isNum(hit.bar.open) ? hit.bar.open : hit.bar.close;
      if (order.type === 'exit') {
        const pos = positions.get(order.ticker);
        if (pos) closePosition(pos, date, ref, order.reason);
        continue;
      }
      if (positions.has(order.ticker)) continue;
      if (positions.size >= spec.sizing.maxPositions) {
        rejected.push({
          date,
          ticker: order.ticker,
          type: 'entry',
          reason: 'Position limit reached',
        });
        continue;
      }
      const target =
        spec.sizing.type === 'pct_equity'
          ? (prevEquity * spec.sizing.pct) / 100
          : prevEquity / spec.sizing.maxPositions;
      const fill = side === 'long' ? ref * (1 + slip) : ref * (1 - slip);
      let shares = Math.floor(target / fill);
      if (side === 'long') {
        while (shares > 0 && shares * fill + commission(shares, fill) > cash) shares -= 1;
        if (shares < 1) {
          rejected.push({ date, ticker: order.ticker, type: 'entry', reason: 'Insufficient cash' });
          continue;
        }
      } else {
        let gross = 0;
        for (const p of positions.values())
          gross += p.shares * (lastClose[p.ticker] ?? p.entryPrice);
        const room = config.maxGrossLeverage * prevEquity - gross;
        shares = Math.min(shares, Math.floor(room / fill));
        if (shares < 1) {
          rejected.push({
            date,
            ticker: order.ticker,
            type: 'entry',
            reason: 'Leverage limit reached',
          });
          continue;
        }
      }
      const comm = commission(shares, fill);
      cash += side === 'long' ? -(shares * fill) - comm : shares * fill - comm;
      costs.commissions += comm;
      costs.slippage += shares * Math.abs(fill - ref);
      tradedNotional += shares * fill;
      positions.set(order.ticker, {
        ticker: order.ticker,
        side,
        shares,
        entryDate: date,
        entryPrice: fill,
        entryCommission: comm,
        borrow: 0,
        best: fill,
        signalDate: order.signalDate,
        entryReads: order.reads,
      });
    }
    pending = carry;

    /* 2 and 3. Borrow cost, then mark to the close. */
    let longValue = 0;
    let shortValue = 0;
    for (const pos of positions.values()) {
      const hit = barOf(pos.ticker);
      if (hit) lastClose[pos.ticker] = hit.bar.close;
      else {
        staleMarks += 1;
        coverage[pos.ticker].missingSessions += 1;
      }
      const mark = lastClose[pos.ticker] ?? pos.entryPrice;
      if (pos.side === 'short') {
        const fee = (pos.shares * mark * config.borrowRate) / 252;
        cash -= fee;
        pos.borrow += fee;
        costs.borrow += fee;
        shortValue += pos.shares * mark;
      } else longValue += pos.shares * mark;
    }
    const equity = cash + longValue - shortValue;

    const b = bench.get(date);
    if (isNum(b)) {
      if (benchBase === null) benchBase = b;
      benchLast = b;
    }
    curve.push({
      date,
      equity: round(equity, 2),
      cash: round(cash, 2),
      benchmark:
        benchBase !== null && benchLast !== null
          ? round((config.initialCapital * benchLast) / benchBase, 2)
          : null,
      grossExposure: equity > 0 ? round((longValue + shortValue) / equity) : null,
      netExposure: equity > 0 ? round((longValue - shortValue) / equity) : null,
      positions: positions.size,
    });
    prevEquity = equity;
    if (equity <= 0) {
      warnings.push(`Equity reached zero on ${date}; the run stops there.`);
      break;
    }

    /* 4. Evaluate rules on the close; queue orders for the next session. */
    if (di === dates.length - 1) break;
    const queued = new Set(pending.map((o) => o.ticker));
    for (const t of tickers) {
      const hit = barOf(t);
      if (!hit || queued.has(t)) continue;
      const c = hit.bar.close;
      const pos = positions.get(t);
      if (pos) {
        const long = pos.side === 'long';
        pos.best = long ? Math.max(pos.best, c) : Math.min(pos.best, c);
        const ex = spec.exit || {};
        const move = long ? c / pos.entryPrice - 1 : pos.entryPrice / c - 1;
        const offBest = long ? 1 - c / pos.best : c / pos.best - 1;
        let reason = null;
        if (ex.stopLossPct && move <= -ex.stopLossPct / 100) reason = 'stop_loss';
        else if (ex.trailingStopPct && offBest >= ex.trailingStopPct / 100)
          reason = 'trailing_stop';
        else if (ex.takeProfitPct && move >= ex.takeProfitPct / 100) reason = 'take_profit';
        else if (ex.rule && evalNode(ex.rule, ctx[t], hit.i, {}) === true) reason = 'exit_rule';
        else if (ex.maxHoldDays && calendarDays(pos.entryDate, date) >= ex.maxHoldDays)
          reason = 'time';
        if (reason) pending.push({ type: 'exit', ticker: t, reason, waited: 0 });
        continue;
      }
      const reads = {};
      if (evalNode(spec.entry, ctx[t], hit.i, reads) === true) {
        pending.push({ type: 'entry', ticker: t, signalDate: date, reads, waited: 0 });
      }
    }
  }

  /* Positions still open at the end are marked, reported as open and kept out of trade statistics. */
  const lastDate = curve[curve.length - 1].date;
  for (const pos of positions.values()) {
    const mark = lastClose[pos.ticker] ?? pos.entryPrice;
    const gross =
      pos.side === 'long'
        ? pos.shares * (mark - pos.entryPrice)
        : pos.shares * (pos.entryPrice - mark);
    trades.push({
      ticker: pos.ticker,
      side: pos.side,
      shares: pos.shares,
      entryDate: pos.entryDate,
      entryPrice: round(pos.entryPrice),
      exitDate: null,
      exitPrice: round(mark),
      holdDays: calendarDays(pos.entryDate, lastDate),
      pnl: round(gross - pos.entryCommission - pos.borrow, 2),
      pnlPct: round((gross - pos.entryCommission - pos.borrow) / (pos.shares * pos.entryPrice), 6),
      costs: round(pos.entryCommission + pos.borrow, 2),
      exitReason: 'open_at_end',
      signalDate: pos.signalDate,
      entryReads: pos.entryReads,
      open: true,
    });
  }
  if (staleMarks > 0) {
    warnings.push(
      `${staleMarks} position marks used the last known close because a ticker had no bar on a benchmark session.`,
    );
  }
  if (pending.length) {
    warnings.push(`${pending.length} order(s) were queued on the final session and never filled.`);
  }

  const totalCosts = costs.commissions + costs.slippage + costs.borrow;
  const metrics = computeRunMetrics({
    curve,
    trades,
    riskFreeRate: config.riskFreeRate,
    tradedNotional,
    totalCosts,
  });

  return {
    engineVersion: ENGINE_VERSION,
    metrics,
    curve,
    drawdown: drawdownStats(curve).series.map((p) => ({
      date: p.date,
      drawdown: round(p.drawdown, 6),
    })),
    monthly: monthlyReturns(curve).map((m) => ({ month: m.month, return: round(m.return, 6) })),
    trades,
    rejected,
    costs: {
      commissions: round(costs.commissions, 2),
      slippage: round(costs.slippage, 2),
      borrow: round(costs.borrow, 2),
      total: round(totalCosts, 2),
    },
    coverage,
    warnings: [...warnings, ...sampleCaveats(metrics)],
    assumptions: [
      'Signals use closing prices; orders fill at the next session open (or close, where the source has no open).',
      `Slippage ${config.slippageBps} bps per fill, commission $${config.commissionPerShare} per share plus ${config.commissionBps} bps.`,
      'Stops are checked on closing prices and fill at the next open; intraday stop fills are not modelled.',
      'Whole shares only. No partial fills, market impact or limit orders.',
      'The universe is the list chosen today: companies that were delisted are not represented (survivorship bias).',
      'Prices are adjusted by the data source. Where it adjusts for splits only, dividends are not in the returns.',
      ...(eventKinds.size
        ? [
            'Disclosure signals use the date a trade was made public, never the date it happened, and count from the first session after that date.',
          ]
        : []),
      'A backtest describes the past under these assumptions. It is not evidence of future results.',
    ],
  };
}

function collectIds(spec) {
  const ids = [];
  const walk = (n) => {
    if (!n) return;
    if (n.op === 'cond') ids.push(n.id);
    else if (n.op === 'not') walk(n.arg);
    else (n.args || []).forEach(walk);
  };
  walk(spec.entry);
  walk(spec.exit?.rule);
  return ids;
}
