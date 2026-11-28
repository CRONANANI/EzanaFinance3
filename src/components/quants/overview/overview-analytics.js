// Run analytics for the Quant Lab Overview (Nov 28 2026). Pure functions over
// one stored backtest (run.results.curve and run.results.trades, written by
// the backtest engine) or over several stored curves. No React, no fetch, no
// clock, no randomness: the same stored run always gives the same panels.

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Why a position closed, in words. Keys are the engine's exitReason values. */
export const EXIT_REASON = {
  stop_loss: 'Stop loss',
  trailing_stop: 'Trailing stop',
  take_profit: 'Take profit',
  exit_rule: 'Exit rule',
  time: 'Holding limit',
  open_at_end: 'Open at end of test',
};

/** Indicator reads the engine stores with each entry, labelled for people. */
export function readLabel(key) {
  const m = /^(sma|rsi|avgVolume)(\d+)$/.exec(key);
  if (m) {
    if (m[1] === 'sma') return `${m[2]}-day avg`;
    if (m[1] === 'rsi') return `RSI ${m[2]}`;
    return `${m[2]}-day avg volume`;
  }
  return (
    {
      close: 'Close',
      macd: 'MACD',
      macdSignal: 'Signal line',
      high: 'High',
      low: 'Low',
      upperBand: 'Upper band',
      lowerBand: 'Lower band',
      volume: 'Volume',
      congress_buyDisclosed: 'Congress buy disclosed',
      congress_sellDisclosed: 'Congress sale disclosed',
      insider_buyDisclosed: 'Insider buy filed',
    }[key] || key
  );
}

/** Entries and exits per calendar month of a run, oldest first. */
export function signalFlow(trades) {
  const months = new Map();
  const bump = (date, key) => {
    if (!date) return;
    const m = String(date).slice(0, 7);
    const row = months.get(m) || { month: m, entries: 0, exits: 0 };
    row[key] += 1;
    months.set(m, row);
  };
  for (const t of trades || []) {
    bump(t.entryDate, 'entries');
    if (!t.open) bump(t.exitDate, 'exits');
  }
  return [...months.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

/**
 * One row per ticker of the universe: trades, closed win rate, average
 * return per closed trade, total P&L and the latest signal date. Tickers
 * that never traded stay in, with zero trades, so a quiet rule is visible.
 */
export function tickerMatrix(trades, universe = []) {
  const rows = new Map(
    universe.map((t) => [t, { ticker: t, trades: 0, closed: [], pnl: 0, last: null, open: 0 }]),
  );
  for (const t of trades || []) {
    const r = rows.get(t.ticker) || {
      ticker: t.ticker,
      trades: 0,
      closed: [],
      pnl: 0,
      last: null,
      open: 0,
    };
    r.trades += 1;
    if (isNum(t.pnl)) r.pnl += t.pnl;
    if (t.open) r.open += 1;
    else if (isNum(t.pnlPct)) r.closed.push(t.pnlPct);
    const sig = t.signalDate || t.entryDate;
    if (sig && (!r.last || sig > r.last)) r.last = sig;
    rows.set(t.ticker, r);
  }
  return [...rows.values()]
    .map((r) => ({
      ticker: r.ticker,
      trades: r.trades,
      open: r.open,
      closedCount: r.closed.length,
      winRate: r.closed.length ? r.closed.filter((x) => x > 0).length / r.closed.length : null,
      avgReturn: r.closed.length ? mean(r.closed) : null,
      pnl: r.trades ? r.pnl : null,
      last: r.last,
    }))
    .sort((a, b) => b.trades - a.trades || a.ticker.localeCompare(b.ticker));
}

/**
 * The run's decisions as an audit log, newest first: each signal (with the
 * indicator reads that triggered it), its fill, and its exit with the
 * recorded reason. Only what the engine stored; nothing inferred.
 */
export function decisionTrace(trades, limit = 12) {
  const events = [];
  (trades || []).forEach((t, i) => {
    if (t.signalDate) {
      events.push({
        id: `s${i}`,
        date: t.signalDate,
        kind: 'signal',
        ticker: t.ticker,
        reads: t.entryReads && typeof t.entryReads === 'object' ? t.entryReads : null,
        order: 0,
      });
    }
    events.push({
      id: `e${i}`,
      date: t.entryDate,
      kind: 'entry',
      ticker: t.ticker,
      side: t.side,
      price: t.entryPrice,
      order: 1,
    });
    if (!t.open && t.exitDate) {
      events.push({
        id: `x${i}`,
        date: t.exitDate,
        kind: 'exit',
        ticker: t.ticker,
        price: t.exitPrice,
        reason: t.exitReason,
        pnlPct: t.pnlPct,
        order: 2,
      });
    }
  });
  return events
    .filter((e) => e.date)
    .sort((a, b) => (a.date === b.date ? b.order - a.order : a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

/** Daily simple returns keyed by date, from a stored equity curve. */
function dailyReturns(curve) {
  const out = new Map();
  for (let i = 1; i < (curve || []).length; i += 1) {
    const a = curve[i - 1]?.equity;
    const b = curve[i]?.equity;
    if (isNum(a) && isNum(b) && a > 0) out.set(curve[i].date, b / a - 1);
  }
  return out;
}

function pearson(xs, ys) {
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
}

/** Fewest shared sessions before a pair's correlation is shown. */
export const MIN_OVERLAP = 60;

/**
 * Pearson correlation of daily strategy returns, pairwise on the sessions
 * both runs share. `series` is [{ id, label, curve }]. A pair with fewer
 * than MIN_OVERLAP shared sessions, or a flat series, is null (not shown).
 */
export function correlationMatrix(series) {
  const rets = series.map((s) => dailyReturns(s.curve));
  const cells = series.map((_, i) =>
    series.map((__, j) => {
      if (i === j) return { r: rets[i].size >= 2 ? 1 : null, n: rets[i].size };
      const shared = [...rets[i].keys()].filter((d) => rets[j].has(d));
      if (shared.length < MIN_OVERLAP) return { r: null, n: shared.length };
      return {
        r: pearson(
          shared.map((d) => rets[i].get(d)),
          shared.map((d) => rets[j].get(d)),
        ),
        n: shared.length,
      };
    }),
  );
  const pairs = cells.flatMap((row, i) => row.filter((c, j) => j > i && c.r !== null));
  return { labels: series.map((s) => s.label), cells, comparable: pairs.length > 0 };
}

/**
 * A documented, rule-based market state for the run's benchmark at the
 * run's last session. Not a forecast:
 *   trend       last benchmark value vs its 200-session average
 *               (above = uptrend, below = downtrend)
 *   volatility  annualised stdev of the last 20 daily benchmark returns vs
 *               the median of every 20-session window in the run
 *               (above 1.25x median = elevated, below 0.8x = calm, else normal)
 * Null when the run holds fewer than 220 benchmark sessions.
 */
export function benchmarkRegime(curve) {
  const pts = (curve || []).filter((p) => isNum(p.benchmark) && p.benchmark > 0);
  if (pts.length < 220) return null;
  const vals = pts.map((p) => p.benchmark);
  const last = vals[vals.length - 1];
  const avg200 = mean(vals.slice(-200));
  const rets = vals.slice(1).map((v, i) => v / vals[i] - 1);
  const vol = (xs) => {
    const m = mean(xs);
    return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)) * Math.sqrt(252);
  };
  const windows = [];
  for (let i = 20; i <= rets.length; i += 5) windows.push(vol(rets.slice(i - 20, i)));
  windows.sort((a, b) => a - b);
  const median = windows[Math.floor(windows.length / 2)];
  const recent = vol(rets.slice(-20));
  const ratio = median > 0 ? recent / median : null;
  return {
    asOf: pts[pts.length - 1].date,
    trend: last >= avg200 ? 'Uptrend' : 'Downtrend',
    distance: last / avg200 - 1,
    recentVol: recent,
    medianVol: median,
    volState:
      ratio === null ? 'Unknown' : ratio > 1.25 ? 'Elevated' : ratio < 0.8 ? 'Calm' : 'Normal',
  };
}
