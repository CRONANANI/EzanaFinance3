// src/lib/quants/risk.js
// Quant Lab risk analytics. Pure and deterministic: no fetch, no clock, no
// randomness. Unit-tested by scripts/check-quant-risk.mjs.
//
// Two reports:
//
//   runRisk        Reads one stored backtest run (its daily curve and trade
//                  ledger) and describes HOW the result was earned: rolling
//                  volatility and beta, the worst drawdown episodes, the shape
//                  of the daily returns, and which tickers the profit came
//                  from.
//
//   portfolioRisk  Reads a set of current holdings and the daily closes of
//                  each, and describes the risk of holding those weights: it
//                  replays the last year of returns at TODAY'S weights
//                  (historical simulation). It is not the account's own
//                  performance history.
//
// Conventions match metrics.js: simple daily returns, sample standard
// deviation, 252 sessions a year, and null for anything that cannot be
// computed.

import { TRADING_DAYS, mean, quantile, simpleReturns, stdev } from './metrics.js';

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round = (x, d = 6) => (isNum(x) ? Number(x.toFixed(d)) : null);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** Sessions in the rolling window: about one quarter. */
export const ROLLING_WINDOW = 63;
/** Shared sessions the portfolio report needs before it reports anything. */
export const MIN_PORTFOLIO_SESSIONS = 60;
export const MAX_PORTFOLIO_HOLDINGS = 30;

/** Sample covariance of two equal-length series (n - 1). Null under 2 points. */
export function covariance(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let acc = 0;
  for (let i = 0; i < n; i += 1) acc += (xs[i] - mx) * (ys[i] - my);
  return acc / (n - 1);
}

/** Beta of xs on ys. Null when ys has no variance. */
export function beta(xs, ys) {
  const cov = covariance(xs, ys);
  const v = covariance(ys, ys);
  return cov !== null && v > 0 ? cov / v : null;
}

/** Pearson correlation. Null when either side has no variance. */
export function correlation(xs, ys) {
  const cov = covariance(xs, ys);
  const sx = stdev(xs);
  const sy = stdev(ys);
  return cov !== null && sx > 0 && sy > 0 ? cov / (sx * sy) : null;
}

/** Skewness and (non-excess) kurtosis from population moments. */
export function moments(xs) {
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

/** Historical value at risk and expected shortfall, as positive loss fractions. */
export function tailRisk(returns, level = 0.95) {
  if (returns.length < 20) return { valueAtRisk: null, expectedShortfall: null };
  const q = quantile(returns, 1 - level);
  const tail = returns.filter((r) => r <= q);
  return { valueAtRisk: -q, expectedShortfall: tail.length ? -mean(tail) : null };
}

/* ── Run risk ─────────────────────────────────────────────── */

/**
 * Rolling annualised volatility and beta over `window` sessions.
 * One point per session from the first full window: [{ date, volatility, beta }].
 */
export function rollingStats(curve, window = ROLLING_WINDOW) {
  const out = [];
  if (curve.length <= window) return out;
  const r = [];
  const b = [];
  for (let i = 1; i < curve.length; i += 1) {
    const p = curve[i - 1];
    const c = curve[i];
    r.push(p.equity > 0 ? c.equity / p.equity - 1 : null);
    b.push(
      isNum(p.benchmark) && isNum(c.benchmark) && p.benchmark > 0
        ? c.benchmark / p.benchmark - 1
        : null,
    );
  }
  for (let end = window; end <= r.length; end += 1) {
    const rs = r.slice(end - window, end);
    if (!rs.every(isNum)) continue;
    const sd = stdev(rs);
    const bs = b.slice(end - window, end);
    out.push({
      date: curve[end].date,
      volatility: sd !== null ? sd * Math.sqrt(TRADING_DAYS) : null,
      beta: bs.every(isNum) ? beta(rs, bs) : null,
    });
  }
  return out;
}

/**
 * Every completed or ongoing peak-to-trough episode, deepest first.
 * [{ peakDate, troughDate, recoveryDate, depth, daysToTrough, daysToRecover }]
 * `recoveryDate` and `daysToRecover` are null while still under water.
 */
export function drawdownEpisodes(curve, top = 5) {
  const episodes = [];
  if (!curve.length) return episodes;
  let peak = curve[0];
  let current = null;
  for (const p of curve) {
    if (p.equity >= peak.equity) {
      if (current) {
        current.recoveryDate = p.date;
        episodes.push(current);
        current = null;
      }
      peak = p;
      continue;
    }
    const depth = p.equity / peak.equity - 1;
    if (!current) current = { peakDate: peak.date, troughDate: p.date, recoveryDate: null, depth };
    else if (depth < current.depth) {
      current.depth = depth;
      current.troughDate = p.date;
    }
  }
  if (current) episodes.push(current);
  return episodes
    .sort((a, b) => a.depth - b.depth)
    .slice(0, top)
    .map((e) => ({
      ...e,
      depth: round(e.depth),
      daysToTrough: daysBetween(e.peakDate, e.troughDate),
      daysToRecover: e.recoveryDate ? daysBetween(e.troughDate, e.recoveryDate) : null,
    }));
}

/** The `n` worst and best single sessions: { worst: [{date, return}], best: [...] }. */
export function extremeDays(curve, n = 5) {
  const days = [];
  for (let i = 1; i < curve.length; i += 1) {
    if (curve[i - 1].equity > 0) {
      days.push({ date: curve[i].date, return: curve[i].equity / curve[i - 1].equity - 1 });
    }
  }
  const sorted = [...days].sort((a, b) => a.return - b.return);
  const fmt = (d) => ({ date: d.date, return: round(d.return) });
  return { worst: sorted.slice(0, n).map(fmt), best: sorted.slice(-n).reverse().map(fmt) };
}

/**
 * Closed-trade profit by ticker, largest absolute contribution first.
 * `contribution` is the ticker's P&L as a fraction of starting equity, so the
 * column sums to the realised part of the total return.
 */
export function contributionByTicker(trades, startEquity) {
  const map = new Map();
  for (const t of trades) {
    if (t.open || !isNum(t.pnl)) continue;
    const row = map.get(t.ticker) || { ticker: t.ticker, trades: 0, wins: 0, pnl: 0, holdDays: 0 };
    row.trades += 1;
    row.wins += t.pnl > 0 ? 1 : 0;
    row.pnl += t.pnl;
    row.holdDays += isNum(t.holdDays) ? t.holdDays : 0;
    map.set(t.ticker, row);
  }
  return [...map.values()]
    .map((r) => ({
      ticker: r.ticker,
      trades: r.trades,
      winRate: round(r.wins / r.trades, 4),
      pnl: round(r.pnl, 2),
      contribution: startEquity > 0 ? round(r.pnl / startEquity) : null,
      averageHoldDays: round(r.holdDays / r.trades, 1),
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}

/**
 * Risk report for one stored backtest run.
 * @param {{ curve: object[], trades: object[] }} results  as stored on the run
 */
export function runRisk(results) {
  const curve = Array.isArray(results?.curve) ? results.curve : [];
  const trades = Array.isArray(results?.trades) ? results.trades : [];
  const returns = simpleReturns(curve.map((p) => p.equity)).filter(isNum);
  const shape = moments(returns);
  const t95 = tailRisk(returns, 0.95);
  const t99 =
    returns.length >= 100
      ? tailRisk(returns, 0.99)
      : { valueAtRisk: null, expectedShortfall: null };
  const exposures = curve.map((p) => p.grossExposure).filter(isNum);
  const invested = exposures.filter((e) => e > 0).length;
  const counts = curve.map((p) => p.positions).filter(isNum);
  const contributions = contributionByTicker(trades, curve[0]?.equity ?? 0);
  const gains = contributions.filter((c) => c.pnl > 0);
  const totalGain = gains.reduce((a, c) => a + c.pnl, 0);
  const notes = [];
  if (gains.length > 1 && totalGain > 0 && gains[0].pnl / totalGain > 0.5) {
    const top = [...gains].sort((a, b) => b.pnl - a.pnl)[0];
    notes.push(
      `${top.ticker} produced ${((top.pnl / totalGain) * 100).toFixed(0)}% of all winning profit. Without it the result looks very different.`,
    );
  }
  if (isNum(shape.kurtosis) && shape.kurtosis > 6) {
    notes.push(
      'Daily returns have fat tails: a few extreme days carry much of the risk, so volatility and Sharpe understate it.',
    );
  }
  if (isNum(shape.skew) && shape.skew < -0.5) {
    notes.push(
      'Returns are negatively skewed: losses tend to be larger than gains of the same frequency.',
    );
  }
  if (exposures.length && invested / exposures.length < 0.25) {
    notes.push(
      `The strategy held positions on only ${((invested / exposures.length) * 100).toFixed(0)}% of sessions. Its low volatility partly reflects sitting in cash.`,
    );
  }
  return {
    window: ROLLING_WINDOW,
    rolling: rollingStats(curve).map((p) => ({
      date: p.date,
      volatility: round(p.volatility),
      beta: round(p.beta, 4),
    })),
    episodes: drawdownEpisodes(curve),
    extremes: extremeDays(curve),
    distribution: {
      observations: returns.length,
      positiveDays: returns.length
        ? round(returns.filter((r) => r > 0).length / returns.length, 4)
        : null,
      skew: round(shape.skew, 4),
      kurtosis: round(shape.kurtosis, 4),
      valueAtRisk95: round(t95.valueAtRisk),
      expectedShortfall95: round(t95.expectedShortfall),
      valueAtRisk99: round(t99.valueAtRisk),
      expectedShortfall99: round(t99.expectedShortfall),
    },
    exposure: {
      timeInMarket: exposures.length ? round(invested / exposures.length, 4) : null,
      average: exposures.length ? round(mean(exposures), 4) : null,
      max: exposures.length ? round(Math.max(...exposures), 4) : null,
      averagePositions: counts.length ? round(mean(counts), 2) : null,
    },
    contributions,
    notes,
  };
}

/* ── Portfolio risk ───────────────────────────────────────── */

/**
 * Risk of holding today's weights, replayed over the shared price history.
 *
 * @param {object} input
 * @param {{ ticker: string, quantity: number }[]} input.holdings
 * @param {number} [input.cash]
 * @param {Object<string, {date: string, close: number}[]>} input.series  closes per ticker
 * @param {{date: string, close: number}[]} [input.benchmark]
 */
export function portfolioRisk({ holdings, cash = 0, series, benchmark = [] }) {
  const skipped = [];
  const usable = [];
  for (const h of holdings) {
    const candles = (series[h.ticker] || []).filter((c) => isNum(c.close) && c.close > 0);
    if (!(h.quantity > 0) || candles.length <= MIN_PORTFOLIO_SESSIONS) skipped.push(h.ticker);
    else usable.push({ ...h, map: new Map(candles.map((c) => [c.date, c.close])) });
  }
  if (!usable.length) return { empty: true, skipped };

  /* Sessions every holding traded (and the benchmark, when there is one). */
  const benchMap = new Map(
    benchmark.filter((c) => isNum(c.close) && c.close > 0).map((c) => [c.date, c.close]),
  );
  const hasBench = benchMap.size > MIN_PORTFOLIO_SESSIONS;
  const maps = usable.map((u) => u.map);
  if (hasBench) maps.push(benchMap);
  const dates = [...maps[0].keys()].filter((d) => maps.every((m) => m.has(d))).sort();
  if (dates.length <= MIN_PORTFOLIO_SESSIONS) return { empty: true, skipped, tooShort: true };

  const lastDate = dates[dates.length - 1];
  const values = usable.map((u) => u.quantity * u.map.get(lastDate));
  const invested = values.reduce((a, b) => a + b, 0);
  const total = invested + Math.max(cash, 0);
  const weights = values.map((v) => v / total);

  const rets = usable.map((u) => {
    const out = [];
    for (let i = 1; i < dates.length; i += 1)
      out.push(u.map.get(dates[i]) / u.map.get(dates[i - 1]) - 1);
    return out;
  });
  const n = dates.length - 1;
  const port = [];
  for (let t = 0; t < n; t += 1) {
    let r = 0;
    for (let i = 0; i < usable.length; i += 1) r += weights[i] * rets[i][t];
    port.push(r);
  }
  const bench = hasBench
    ? dates.slice(1).map((d, i) => benchMap.get(d) / benchMap.get(dates[i]) - 1)
    : null;

  const sd = stdev(port);
  const variance = covariance(port, port);
  const tail = tailRisk(port, 0.95);
  const rows = usable
    .map((u, i) => {
      const s = stdev(rets[i]);
      const cov = covariance(rets[i], port);
      return {
        ticker: u.ticker,
        value: round(values[i], 2),
        weight: round(weights[i], 4),
        volatility: s !== null ? round(s * Math.sqrt(TRADING_DAYS), 4) : null,
        beta: bench ? round(beta(rets[i], bench), 4) : null,
        /* Share of portfolio variance this holding accounts for. Sums to 1. */
        riskShare: variance > 0 && cov !== null ? round((weights[i] * cov) / variance, 4) : null,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  let pairSum = 0;
  let pairs = 0;
  for (let i = 0; i < usable.length; i += 1) {
    for (let j = i + 1; j < usable.length; j += 1) {
      const c = correlation(rets[i], rets[j]);
      if (c !== null) {
        pairSum += c;
        pairs += 1;
      }
    }
  }
  const investedWeights = values.map((v) => v / invested);
  const hhi = investedWeights.reduce((a, w) => a + w * w, 0);

  const notes = [];
  if (rows[0].weight > 0.4) {
    notes.push(
      `${rows[0].ticker} is ${(rows[0].weight * 100).toFixed(0)}% of the portfolio. One company drives most of the risk.`,
    );
  }
  const topRisk = [...rows].sort((a, b) => (b.riskShare ?? 0) - (a.riskShare ?? 0))[0];
  if (isNum(topRisk.riskShare) && topRisk.riskShare > 0.5 && topRisk.ticker !== rows[0].ticker) {
    notes.push(
      `${topRisk.ticker} accounts for ${(topRisk.riskShare * 100).toFixed(0)}% of the portfolio's risk, more than its weight suggests.`,
    );
  }
  if (pairs > 0 && pairSum / pairs > 0.7) {
    notes.push(
      'The holdings move closely together, so owning several of them diversifies less than the count suggests.',
    );
  }
  if (skipped.length) {
    notes.push(`Left out for lack of price history: ${skipped.join(', ')}.`);
  }

  return {
    empty: false,
    observations: n,
    from: dates[1],
    to: lastDate,
    totalValue: round(total, 2),
    investedValue: round(invested, 2),
    cashWeight: round(Math.max(cash, 0) / total, 4),
    volatility: sd !== null ? round(sd * Math.sqrt(TRADING_DAYS), 4) : null,
    beta: bench ? round(beta(port, bench), 4) : null,
    correlation: bench ? round(correlation(port, bench), 4) : null,
    valueAtRisk95: round(tail.valueAtRisk),
    expectedShortfall95: round(tail.expectedShortfall),
    valueAtRisk95Dollars: isNum(tail.valueAtRisk) ? round(tail.valueAtRisk * total, 2) : null,
    worstDay: round(Math.min(...port)),
    holdings: rows,
    /* 1 / sum of squared weights: how many equal positions this is worth. */
    effectiveHoldings: hhi > 0 ? round(1 / hhi, 2) : null,
    averageCorrelation: pairs ? round(pairSum / pairs, 4) : null,
    skipped,
    notes,
  };
}
