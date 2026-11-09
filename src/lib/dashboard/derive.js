/**
 * Home dashboard (Nov 2026 redesign): one derived snapshot that every
 * section reads, plus the formatters. Pure, no React and no imports, so the
 * numbers can be tested in node (scripts/check-dashboard-redesign.mjs).
 *
 * Integrity rules this module enforces (handoff §4):
 *   - current value = sum of holding values + cash
 *   - one price per ticker (the watchlist reuses a held ticker's price)
 *   - sector and cash slices add up to exactly 100% (largest remainder)
 *   - weights come from holdings, never from a separate list
 *   - the profit bars reconcile with total P&L (the rest is shown as
 *     realized and closed positions)
 */

export const SNAPSHOT_RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y', 'ALL'];
export const HOLDING_RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];
export const HOLDINGS_PAGE = 10;
export const WATCHLIST_ROWS = 5;
export const TXN_ROWS = 5;
export const PROFIT_ROWS = 6;
export const NA = 'N/A';

const fin = (n) => typeof n === 'number' && Number.isFinite(n);

/* ── Formatters ─────────────────────────────────────────────────────── */

const moneyFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `$4,919,865.21`; negatives as `-$12.00`. */
export function fmtMoney(n) {
  if (!fin(n)) return NA;
  const s = moneyFmt.format(Math.abs(n));
  return n < 0 && Math.abs(n) >= 0.005 ? `-$${s}` : `$${s}`;
}

/** `+$338,438.71` / `-$12.00` / `$0.00`. */
export function fmtSignedMoney(n) {
  if (!fin(n)) return NA;
  if (Math.abs(n) < 0.005) return '$0.00';
  return `${n > 0 ? '+' : '-'}$${moneyFmt.format(Math.abs(n))}`;
}

/** `+7.28%` / `-4.74%` / `0.00%`. */
export function fmtSignedPct(n, digits = 2) {
  if (!fin(n)) return NA;
  const r = Number(n.toFixed(digits));
  if (r === 0) return `${(0).toFixed(digits)}%`;
  return `${r > 0 ? '+' : '-'}${Math.abs(r).toFixed(digits)}%`;
}

/** Compact money for axes and the donut centre: `$4.92M`, `$420.5K`. */
export function fmtCompactMoney(n, digits) {
  if (!fin(n)) return NA;
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(digits ?? 2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(digits ?? 2)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(digits ?? 1)}K`;
  return `${sign}$${a.toFixed(digits ?? 0)}`;
}

/** Share counts: `5,206.2`, `0.5`, `12.0`. */
export function fmtQty(n) {
  if (!fin(n)) return NA;
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 4 });
}

/** 'up' | 'down' | 'flat', for colouring a signed number. */
export function tone(n) {
  if (!fin(n) || Math.abs(n) < 1e-9) return 'flat';
  return n > 0 ? 'up' : 'down';
}

/** `Oct 30, 2026`. */
export function fmtDate(value) {
  const t = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(t)) return NA;
  return new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** `Monday, November 9, 2026`. */
export function fmtLongDate(d = new Date()) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function greetingFor(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

/* ── Rounding and scales ────────────────────────────────────────────── */

/**
 * Integer percentages that add up to exactly `total` (largest remainder).
 * @param {number[]} values non-negative weights
 */
export function largestRemainder(values, total = 100) {
  const sum = values.reduce((s, v) => s + (v > 0 ? v : 0), 0);
  if (sum <= 0) return values.map(() => 0);
  const raw = values.map((v) => ((v > 0 ? v : 0) / sum) * total);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((s, v) => s + v, 0);
  const order = raw
    .map((r, i) => [r - Math.floor(r), i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0 && k < order.length; k += 1, left -= 1) out[order[k][1]] += 1;
  return out;
}

function niceStep(raw) {
  const exp = Math.floor(Math.log10(raw));
  const base = 10 ** exp;
  const f = raw / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

/** About `count` evenly spaced, rounded ticks that cover [min, max]. */
export function niceTicks(min, max, count = 5) {
  if (!fin(min) || !fin(max)) return [];
  if (max < min) [min, max] = [max, min];
  if (max === min) {
    const pad = Math.abs(max) * 0.01 || 1;
    min -= pad;
    max += pad;
  }
  const step = niceStep((max - min) / (count - 1));
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/** `count` evenly spaced indices into a series of length `n`. */
export function pickTickIndices(n, count = 6) {
  if (n <= 0) return [];
  if (n <= count) return Array.from({ length: n }, (_, i) => i);
  const out = new Set();
  for (let k = 0; k < count; k += 1) out.add(Math.round((k * (n - 1)) / (count - 1)));
  return [...out];
}

/** X-axis label for a point, by range: `10:30 AM`, `Oct 11`, `Nov '25`. */
export function fmtAxisDate(at, range) {
  const t = Date.parse(at);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  if (range === '1D') return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (['1W', '1M', '3M', '6M', 'CUSTOM'].includes(range))
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${d.toLocaleDateString('en-US', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`;
}

/** Tooltip date: `Nov 9, 2026` (with the time for 1D). */
export function fmtTooltipDate(at, range) {
  const t = Date.parse(at);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  const day = fmtDate(t);
  return range === '1D'
    ? `${day}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : day;
}

/* ── Scores ─────────────────────────────────────────────────────────── */

const hhi = (weights) => weights.reduce((s, w) => s + w * w, 0);

function weightsOf(values) {
  const sum = values.reduce((s, v) => s + Math.max(0, v), 0);
  return sum > 0 ? values.map((v) => Math.max(0, v) / sum) : [];
}

function sectorValues(holdings) {
  const m = new Map();
  for (const h of holdings) m.set(h.sector || 'Other', (m.get(h.sector || 'Other') || 0) + h.value);
  return m;
}

/**
 * Diversification, 0 to 100, from how evenly money is spread across
 * holdings and across sectors (effective counts from the Herfindahl index).
 * 10+ evenly sized holdings across 5+ evenly sized sectors score 100.
 */
export function diversificationScore(holdings) {
  const vals = holdings.map((h) => h.value).filter((v) => v > 0);
  if (!vals.length) return null;
  const effPos = 1 / hhi(weightsOf(vals));
  const effSec = 1 / hhi(weightsOf([...sectorValues(holdings).values()]));
  const pos = Math.min(1, (effPos - 1) / 9);
  const sec = Math.min(1, (effSec - 1) / 4);
  return Math.round(100 * (0.5 * pos + 0.5 * sec));
}

/**
 * Risk, 0 to 10, from how much of the portfolio is invested and how
 * concentrated it is by holding and by sector. All cash scores 0; one
 * stock with no cash scores 10. A concentration measure, not volatility.
 */
export function riskScore(holdings, cash) {
  const vals = holdings.map((h) => h.value).filter((v) => v > 0);
  const invested = vals.reduce((s, v) => s + v, 0);
  const total = invested + Math.max(0, fin(cash) ? cash : 0);
  if (total <= 0) return null;
  if (!vals.length) return 0;
  const conc = Math.sqrt(hhi(weightsOf(vals)));
  const secConc = Math.sqrt(hhi(weightsOf([...sectorValues(holdings).values()])));
  const raw = (invested / total) * (0.4 + 0.3 * conc + 0.3 * secConc);
  return Math.round(Math.min(10, raw * 10) * 10) / 10;
}

export function riskBadge(score) {
  if (!fin(score)) return null;
  if (score < 4) return { label: 'Low', tone: 'up' };
  if (score < 7) return { label: 'Moderate', tone: 'warn' };
  return { label: 'High', tone: 'down' };
}

export function diversificationBadge(score) {
  if (!fin(score)) return null;
  if (score >= 75) return { label: 'Well diversified', tone: 'up' };
  if (score >= 50) return { label: 'Moderate', tone: 'warn' };
  return { label: 'Concentrated', tone: 'down' };
}

/* ── Series ─────────────────────────────────────────────────────────── */

/**
 * Chart rows for the active range. The last point is pinned to the live
 * current value so the chart, the headline and the delta row agree.
 * @param {{ at: string, value: number }[]} points
 */
export function seriesRows(points, currentValue, custom) {
  let list = (points || []).filter((p) => fin(p?.value) && Number.isFinite(Date.parse(p.at)));
  if (custom?.start && custom?.end) {
    const a = +custom.start;
    const b = +custom.end + 86400000 - 1;
    list = list.filter((p) => {
      const t = Date.parse(p.at);
      return t >= a && t <= b;
    });
  }
  const rows = list.map((p, i) => ({ i, at: p.at, value: p.value }));
  // A custom window that ended before today keeps its historical last point.
  const reachesToday = !custom?.end || +custom.end + 86400000 > Date.now();
  if (rows.length && fin(currentValue) && reachesToday) {
    rows[rows.length - 1] = { ...rows[rows.length - 1], value: currentValue };
  }
  return rows;
}

/** Change from the first row to the last: `{ abs, pct }` or null. */
export function rangeChange(rows) {
  if (!rows || rows.length < 1) return null;
  const first = rows[0].value;
  const last = rows[rows.length - 1].value;
  return { abs: last - first, pct: first > 0 ? ((last - first) / first) * 100 : 0 };
}

/* ── The snapshot ───────────────────────────────────────────────────── */

/**
 * @typedef {{ ticker: string, company: string, value: number, quantity: number,
 *   price: number, dayChangeAbs: number|null, dayChangePct: number|null,
 *   unrealizedPnl: number|null, unrealizedPnlPct: number|null, sector: string }} Holding
 *
 * @param {{
 *   holdings: Holding[],
 *   cash: number|null,              // null when the broker holds it (unknown)
 *   startingValue?: number|null,    // mock: starting cash, for total P&L
 *   totalPnl?: number|null,         // linked accounts: gain vs cost basis
 *   totalReturnPct?: number|null,
 *   fallbackValue?: number|null,    // used only when there are no holdings
 *   watchlist?: { ticker: string, company: string, price: number|null, dayChangePct: number|null }[],
 *   transactions?: { id: string|number, ticker: string, side: 'buy'|'sell', total: number, ts: string|number }[],
 * }} input
 */
export function buildDashboardData(input) {
  const raw = (input.holdings || []).filter((h) => h && h.ticker && fin(h.value));
  const invested = raw.reduce((s, h) => s + h.value, 0);
  const cash = fin(input.cash) ? input.cash : null;
  const currentValue =
    raw.length || cash != null
      ? invested + (cash ?? 0)
      : fin(input.fallbackValue)
        ? input.fallbackValue
        : null;

  const holdings = raw
    .map((h) => ({
      ...h,
      weightPct: currentValue > 0 ? (h.value / currentValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  let totalPnl = null;
  let totalReturnPct = null;
  if (fin(input.startingValue) && input.startingValue > 0 && fin(currentValue)) {
    totalPnl = currentValue - input.startingValue;
    totalReturnPct = (currentValue / input.startingValue - 1) * 100;
  } else if (fin(input.totalPnl)) {
    totalPnl = input.totalPnl;
    totalReturnPct = fin(input.totalReturnPct) ? input.totalReturnPct : null;
  }

  // One price per ticker: the watchlist reuses a held ticker's price and move.
  const byTicker = new Map(holdings.map((h) => [h.ticker, h]));
  const watchlist = (input.watchlist || []).map((w) => {
    const h = byTicker.get(w.ticker);
    return h
      ? { ...w, company: w.company || h.company, price: h.price, dayChangePct: h.dayChangePct }
      : w;
  });

  // Best performer: highest return on cost.
  const ranked = holdings.filter((h) => fin(h.unrealizedPnlPct));
  const best = ranked.length
    ? ranked.reduce((a, b) => (b.unrealizedPnlPct > a.unrealizedPnlPct ? b : a))
    : null;

  // Profits: top positions by |unrealized P&L|, signed; the remainder of
  // total P&L is realized and closed positions, shown as its own line.
  const withPnl = holdings.filter((h) => fin(h.unrealizedPnl));
  const profitRows = [...withPnl]
    .sort((a, b) => Math.abs(b.unrealizedPnl) - Math.abs(a.unrealizedPnl))
    .slice(0, PROFIT_ROWS)
    .map((h) => ({ ticker: h.ticker, pnl: h.unrealizedPnl }));
  const maxAbs = profitRows.reduce((m, r) => Math.max(m, Math.abs(r.pnl)), 0) || 1;
  for (const r of profitRows) r.widthPct = (Math.abs(r.pnl) / maxAbs) * 100;
  const unrealizedTotal = withPnl.reduce((s, h) => s + h.unrealizedPnl, 0);
  const realized =
    fin(totalPnl) && withPnl.length === holdings.length ? totalPnl - unrealizedTotal : null;
  const topWeights = holdings.slice(0, 3).map((h) => ({
    ticker: h.ticker,
    weightPct: h.weightPct,
    pnl: h.unrealizedPnl,
  }));

  // Sectors (plus cash) as shares of the current value, summing to 100.
  const sectorMap = sectorValues(holdings);
  const sectorList = [...sectorMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const MAX_NAMED = 5;
  let slices = sectorList.slice(0, MAX_NAMED);
  const rest = sectorList.slice(MAX_NAMED);
  if (rest.length) {
    const otherIdx = slices.findIndex((s) => s.name === 'Other');
    const extra = rest.reduce((s, x) => s + x.value, 0);
    if (otherIdx >= 0)
      slices[otherIdx] = { ...slices[otherIdx], value: slices[otherIdx].value + extra };
    else slices.push({ name: 'Other', value: extra });
  }
  // "Other" always sits last among the sectors.
  slices = [
    ...slices.filter((s) => s.name !== 'Other'),
    ...slices.filter((s) => s.name === 'Other'),
  ];
  if (cash != null && cash > 0) slices.push({ name: 'Cash', value: cash, isCash: true });
  const pcts = largestRemainder(slices.map((s) => s.value));
  const sectors = slices.map((s, i) => ({ ...s, pct: pcts[i] }));

  const transactions = [...(input.transactions || [])]
    .map((t) => {
      const ts = typeof t.ts === 'number' ? t.ts : Date.parse(t.ts);
      const amount = fin(t.total) ? (t.side === 'sell' ? -t.total : t.total) : null;
      return {
        id: String(t.id ?? ts),
        ticker: t.ticker,
        company: t.company || byTicker.get(t.ticker)?.company || '',
        amount,
        ts,
        date: fmtDate(ts),
        ref: `#${String(t.id ?? ts)
          .replace(/\D/g, '')
          .slice(-9)}`,
      };
    })
    .filter((t) => Number.isFinite(t.ts))
    .sort((a, b) => b.ts - a.ts);

  return {
    totals: {
      currentValue,
      cashBalance: cash,
      invested,
      totalPnl,
      totalReturnPct,
      openPositions: holdings.length,
    },
    scores: {
      risk: riskScore(holdings, cash),
      diversification: diversificationScore(holdings),
    },
    bestPerformer: best ? { ticker: best.ticker, returnPct: best.unrealizedPnlPct } : null,
    holdings,
    watchlist,
    profits: { rows: profitRows, realized, topWeights },
    sectors,
    sectorCount: sectorList.length,
    transactions,
  };
}
