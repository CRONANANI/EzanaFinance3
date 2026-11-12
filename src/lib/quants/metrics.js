// src/lib/quants/metrics.js
// Performance and risk statistics for a backtest, computed only from the run's
// own daily equity series, benchmark series and closed trades. Pure functions,
// no I/O, safe on server and client. Every number the Quant Lab shows comes
// from here, so there is one definition of each metric.
//
// Conventions (also returned by METRIC_CONVENTIONS so the UI can print them):
//   returns          simple daily returns, r_t = E_t / E_(t-1) - 1
//   annualisation    252 trading days
//   volatility       sample standard deviation (n - 1) of daily returns
//   risk-free rate   annual rate / 252 per day, default 0
//   Sharpe           (mean(r) - rf_d) / sd(r) * sqrt(252)
//   Sortino          (mean(r) - rf_d) / DD * sqrt(252), where the downside
//                    deviation DD = sqrt(mean(min(r - rf_d, 0)^2)) over ALL days
//   CAGR             (E_end / E_start)^(365.25 / calendar days) - 1
//   max drawdown     largest peak-to-trough fall of the equity series
//   Calmar           CAGR / |max drawdown|
//   beta             cov(r, b) / var(b) on days both series have a return
//   alpha            Jensen's alpha, annualised:
//                    (mean(r) - rf_d - beta * (mean(b) - rf_d)) * 252
//   tracking error   sd(r - b) * sqrt(252)
//   information ratio  mean(r - b) * 252 / tracking error
//   VaR 95%          historical, 1 day: -(5th percentile of r), linear interp.
//   expected shortfall  -(mean of the returns at or below that percentile)
//   profit factor    gross profit / gross loss over CLOSED trades
// A statistic that cannot be computed (too few observations, zero variance,
// no losing trades) is null. It is never approximated from another metric.

export const TRADING_DAYS = 252;

export const METRIC_CONVENTIONS = {
  returns: 'Simple daily returns from the run equity series',
  annualisation: `${TRADING_DAYS} trading days`,
  volatility: 'Sample standard deviation of daily returns',
  sharpe: 'Excess mean daily return over its standard deviation, annualised',
  sortino: 'Excess mean daily return over downside deviation (target: risk-free), annualised',
  alpha: "Jensen's alpha against the benchmark, annualised",
  var: 'Historical 1 day, 95%',
  profitFactor: 'Gross profit over gross loss, closed trades only',
};

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Sample standard deviation (n - 1). null below two observations. */
export function stdev(xs) {
  if (xs.length < 2) return null;
  const mu = mean(xs);
  const ss = xs.reduce((a, x) => a + (x - mu) ** 2, 0);
  return Math.sqrt(ss / (xs.length - 1));
}

/** Linear-interpolated quantile (the "type 7" definition), q in [0, 1]. */
export function quantile(xs, q) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** Simple returns of a value series. A non-positive prior value yields no return. */
export function simpleReturns(values) {
  const out = [];
  for (let i = 1; i < values.length; i += 1) {
    out.push(values[i - 1] > 0 ? values[i] / values[i - 1] - 1 : null);
  }
  return out;
}

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/**
 * Drawdown statistics of an equity series.
 * @param {{ date: string, equity: number }[]} curve oldest first
 */
export function drawdownStats(curve) {
  if (curve.length < 2) {
    return {
      series: curve.map((p) => ({ date: p.date, drawdown: 0 })),
      maxDrawdown: null,
      currentDrawdown: null,
      averageDrawdown: null,
      longestDrawdownDays: null,
      maxDrawdownRecoveryDays: null,
    };
  }
  let peak = curve[0].equity;
  let peakDate = curve[0].date;
  const series = [];
  const episodes = [];
  let ep = null;
  for (const p of curve) {
    if (p.equity >= peak) {
      if (ep) {
        ep.recoveredOn = p.date;
        episodes.push(ep);
        ep = null;
      }
      peak = p.equity;
      peakDate = p.date;
      series.push({ date: p.date, drawdown: 0 });
    } else {
      const dd = p.equity / peak - 1;
      if (!ep) ep = { start: peakDate, depth: dd, troughOn: p.date, recoveredOn: null };
      if (dd < ep.depth) {
        ep.depth = dd;
        ep.troughOn = p.date;
      }
      series.push({ date: p.date, drawdown: dd });
    }
  }
  const lastDate = curve[curve.length - 1].date;
  if (ep) episodes.push(ep);
  if (!episodes.length) {
    return {
      series,
      maxDrawdown: 0,
      currentDrawdown: 0,
      averageDrawdown: 0,
      longestDrawdownDays: 0,
      maxDrawdownRecoveryDays: 0,
    };
  }
  const worst = episodes.reduce((a, b) => (b.depth < a.depth ? b : a));
  return {
    series,
    maxDrawdown: worst.depth,
    currentDrawdown: series[series.length - 1].drawdown,
    averageDrawdown: mean(episodes.map((e) => e.depth)),
    longestDrawdownDays: Math.max(
      ...episodes.map((e) => daysBetween(e.start, e.recoveredOn || lastDate)),
    ),
    /* Trough to recovery of the worst episode; null while still under water. */
    maxDrawdownRecoveryDays: worst.recoveredOn
      ? daysBetween(worst.troughOn, worst.recoveredOn)
      : null,
  };
}

/** Calendar-month returns of an equity series: [{ month: 'YYYY-MM', return }]. */
export function monthlyReturns(curve) {
  const out = [];
  if (curve.length < 2) return out;
  let startEquity = curve[0].equity;
  let month = curve[0].date.slice(0, 7);
  let last = curve[0].equity;
  for (let i = 1; i < curve.length; i += 1) {
    const m = curve[i].date.slice(0, 7);
    if (m !== month) {
      out.push({ month, return: startEquity > 0 ? last / startEquity - 1 : null });
      startEquity = last;
      month = m;
    }
    last = curve[i].equity;
  }
  out.push({ month, return: startEquity > 0 ? last / startEquity - 1 : null });
  return out;
}

/**
 * Statistics of closed trades. `pnl` is net of every cost charged to the trade.
 * @param {{ pnl: number, holdDays?: number, open?: boolean }[]} trades
 */
export function tradeStats(trades) {
  const closed = trades.filter((t) => !t.open && isNum(t.pnl));
  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const grossProfit = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = -losses.reduce((a, t) => a + t.pnl, 0);
  const holds = closed.map((t) => t.holdDays).filter(isNum);
  return {
    closedTrades: closed.length,
    openTrades: trades.length - closed.length,
    winRate: closed.length ? wins.length / closed.length : null,
    averageWin: wins.length ? grossProfit / wins.length : null,
    averageLoss: losses.length ? -grossLoss / losses.length : null,
    grossProfit,
    grossLoss,
    /* Undefined without a losing trade: shown as "n/a", never as a large number. */
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    expectancy: closed.length ? (grossProfit - grossLoss) / closed.length : null,
    averageHoldDays: holds.length ? mean(holds) : null,
  };
}

/**
 * Every headline statistic for one run.
 *
 * @param {object} input
 * @param {{ date: string, equity: number, benchmark?: number|null,
 *           grossExposure?: number }[]} input.curve  daily, oldest first
 * @param {object[]} [input.trades]
 * @param {number}  [input.riskFreeRate]   annual, decimal (0.04 = 4%)
 * @param {number}  [input.tradedNotional] sum of |fill notional| over the run
 * @param {number}  [input.totalCosts]     commissions + slippage + borrow
 */
export function computeRunMetrics({
  curve,
  trades = [],
  riskFreeRate = 0,
  tradedNotional = 0,
  totalCosts = 0,
}) {
  const n = curve.length;
  const equity = curve.map((p) => p.equity);
  const rets = simpleReturns(equity).filter(isNum);
  const rfDaily = riskFreeRate / TRADING_DAYS;
  const first = curve[0];
  const last = curve[n - 1];
  const calendarDays = n > 1 ? daysBetween(first.date, last.date) : 0;
  const years = calendarDays / 365.25;

  const totalReturn = n > 1 && first.equity > 0 ? last.equity / first.equity - 1 : null;
  const cagr =
    totalReturn !== null && calendarDays > 0 && last.equity > 0
      ? (last.equity / first.equity) ** (365.25 / calendarDays) - 1
      : null;

  const mu = mean(rets);
  const sd = stdev(rets);
  const volatility = sd !== null ? sd * Math.sqrt(TRADING_DAYS) : null;
  const sharpe = sd ? ((mu - rfDaily) / sd) * Math.sqrt(TRADING_DAYS) : null;

  const downside = rets.length
    ? Math.sqrt(mean(rets.map((r) => Math.min(r - rfDaily, 0) ** 2)))
    : null;
  const sortino = downside ? ((mu - rfDaily) / downside) * Math.sqrt(TRADING_DAYS) : null;

  const dd = drawdownStats(curve);
  const calmar = cagr !== null && dd.maxDrawdown ? cagr / Math.abs(dd.maxDrawdown) : null;

  /* Benchmark-relative statistics, on days both series have a return. */
  const pairs = [];
  for (let i = 1; i < n; i += 1) {
    const a = curve[i - 1];
    const b = curve[i];
    if (a.equity > 0 && isNum(a.benchmark) && isNum(b.benchmark) && a.benchmark > 0) {
      pairs.push([b.equity / a.equity - 1, b.benchmark / a.benchmark - 1]);
    }
  }
  let beta = null;
  let alpha = null;
  let trackingError = null;
  let informationRatio = null;
  let correlation = null;
  let benchmarkReturn = null;
  if (pairs.length >= 2) {
    const rs = pairs.map((p) => p[0]);
    const bs = pairs.map((p) => p[1]);
    const mr = mean(rs);
    const mb = mean(bs);
    let cov = 0;
    let varB = 0;
    let varR = 0;
    for (const [r, b] of pairs) {
      cov += (r - mr) * (b - mb);
      varB += (b - mb) ** 2;
      varR += (r - mr) ** 2;
    }
    if (varB > 0) {
      beta = cov / varB;
      alpha = (mr - rfDaily - beta * (mb - rfDaily)) * TRADING_DAYS;
      correlation = varR > 0 ? cov / Math.sqrt(varB * varR) : null;
    }
    const active = pairs.map(([r, b]) => r - b);
    const te = stdev(active);
    trackingError = te !== null ? te * Math.sqrt(TRADING_DAYS) : null;
    informationRatio = te ? (mean(active) * TRADING_DAYS) / trackingError : null;
    const firstB = curve.find((p) => isNum(p.benchmark));
    const lastB = [...curve].reverse().find((p) => isNum(p.benchmark));
    if (firstB && lastB && firstB.benchmark > 0) {
      benchmarkReturn = lastB.benchmark / firstB.benchmark - 1;
    }
  }

  const q05 = rets.length >= 20 ? quantile(rets, 0.05) : null;
  const tail = q05 !== null ? rets.filter((r) => r <= q05) : [];
  const avgEquity = mean(equity);
  const exposures = curve.map((p) => p.grossExposure).filter(isNum);

  return {
    observations: n,
    startDate: first?.date ?? null,
    endDate: last?.date ?? null,
    calendarDays,
    startEquity: first?.equity ?? null,
    endEquity: last?.equity ?? null,
    totalReturn,
    cagr,
    volatility,
    sharpe,
    sortino,
    calmar,
    downsideDeviation: downside !== null ? downside * Math.sqrt(TRADING_DAYS) : null,
    maxDrawdown: dd.maxDrawdown,
    currentDrawdown: dd.currentDrawdown,
    averageDrawdown: dd.averageDrawdown,
    longestDrawdownDays: dd.longestDrawdownDays,
    maxDrawdownRecoveryDays: dd.maxDrawdownRecoveryDays,
    benchmarkReturn,
    excessReturn:
      totalReturn !== null && benchmarkReturn !== null ? totalReturn - benchmarkReturn : null,
    beta,
    alpha,
    correlation,
    trackingError,
    informationRatio,
    valueAtRisk95: q05 !== null ? -q05 : null,
    expectedShortfall95: tail.length ? -mean(tail) : null,
    averageGrossExposure: exposures.length ? mean(exposures) : null,
    maxGrossExposure: exposures.length ? Math.max(...exposures) : null,
    /* One-way annual turnover: half of all traded notional over average equity. */
    turnover: years > 0 && avgEquity > 0 ? tradedNotional / 2 / avgEquity / years : null,
    totalCosts,
    costDrag: first?.equity > 0 ? totalCosts / first.equity : null,
    riskFreeRate,
    ...tradeStats(trades),
  };
}

/**
 * Plain-language cautions about how much weight the numbers can bear. The UI
 * shows these beside the results; they are not errors.
 */
export function sampleCaveats(m) {
  const out = [];
  if (m.observations < TRADING_DAYS) {
    out.push(
      `Only ${m.observations} trading days. Annualised figures from under a year are unstable.`,
    );
  }
  if (m.closedTrades < 30) {
    out.push(
      `${m.closedTrades} closed trades. Win rate and profit factor need about 30 or more to mean much.`,
    );
  }
  if (m.sharpe !== null && m.sharpe > 3) {
    out.push('A Sharpe ratio above 3 on daily bars usually points to a flaw or a tiny sample.');
  }
  return out;
}
