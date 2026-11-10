/**
 * Mock Trading page (Nov 2026 redesign): pure helpers for the order ticket,
 * the KPI row, the positions table and the activity list. No React, no DOM,
 * no fetch. Tested by scripts/check-mock-trading.mjs.
 *
 * Definitions used everywhere on the page (one source, so the KPIs, the
 * positions table and the activity agree):
 *   market value   sum of qty x current price over open positions
 *   cost basis     sum of qty x average cost over open positions
 *   unrealised     market value - cost basis
 *   total value    cash + market value
 *   total P&L      total value - starting cash
 *   realised       total P&L - unrealised (gains and losses already banked)
 */

const LOCALE = 'en-US';

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** $12,438.20 */
export const fmtUSD = (v) =>
  isNum(v)
    ? `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString(LOCALE, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : 'N/A';

/** +$240.18 / -$120.40 */
export const fmtSignedUSD = (v) =>
  isNum(v) ? `${v > 0 ? '+' : v < 0 ? '-' : ''}${fmtUSD(Math.abs(v))}` : 'N/A';

/** +1.97% / -0.92% (value in percent units, 2 decimals) */
export const fmtSignedPct = (v) =>
  isNum(v) ? `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(2)}%` : 'N/A';

/** $1.971M / $845.2K, for the chart headline and axis only. */
export function fmtCompactUSD(v) {
  if (!isNum(v)) return 'N/A';
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(3)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(3)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)}K`;
  return fmtUSD(v);
}

/** Shares: whole numbers plain, fractions up to 4 decimals (trailing zeros dropped). */
export function fmtQty(v) {
  if (!isNum(v)) return 'N/A';
  return v.toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

/** "up" | "down" | "flat" */
export const signOf = (v) => (!isNum(v) || v === 0 ? 'flat' : v > 0 ? 'up' : 'down');

const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' });

/** "Jan 20, 2025" */
export function fmtDate(v) {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? 'N/A' : dateFmt.format(d);
}

/** "Jan 20, 2025 at 10:24 AM" */
export function fmtDateTime(v) {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? 'N/A' : `${dateFmt.format(d)} at ${timeFmt.format(d)}`;
}

/** "just now", "2s ago", "5m ago", "3h ago" */
export function relativeTime(ms, now = Date.now()) {
  if (!isNum(ms)) return null;
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 2) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

/** "1,000.50" / "$1,000" / "1000" -> 1000.5; anything else -> 0. */
export function parseAmount(raw) {
  const n = Number(String(raw ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* ------------------------------------------------------------------ */
/* Portfolio summary                                                   */
/* ------------------------------------------------------------------ */

/**
 * @param {{ cash: number, startingCash: number, positions: Array<{ qty: number, avgCost: number, currentPrice: number }> }} p
 */
export function summarizePortfolio({ cash, startingCash, positions }) {
  const list = Array.isArray(positions) ? positions : [];
  let marketValue = 0;
  let costBasis = 0;
  for (const pos of list) {
    const q = Number(pos.qty) || 0;
    marketValue += q * (Number(pos.currentPrice) || 0);
    costBasis += q * (Number(pos.avgCost) || 0);
  }
  const c = Number(cash) || 0;
  const start = Number(startingCash) || 0;
  const totalValue = c + marketValue;
  const totalPnl = totalValue - start;
  const unrealised = marketValue - costBasis;
  return {
    cash: c,
    startingCash: start,
    count: list.length,
    marketValue,
    costBasis,
    unrealised,
    realised: totalPnl - unrealised,
    totalValue,
    totalPnl,
    totalPnlPct: start > 0 ? (totalPnl / start) * 100 : 0,
  };
}

/** One position row: market value and P&L from qty, average cost and current price. */
export function positionRow(pos) {
  const qty = Number(pos.qty) || 0;
  const avg = Number(pos.avgCost) || 0;
  const cur = Number(pos.currentPrice) || avg;
  return {
    ...pos,
    qty,
    avgCost: avg,
    currentPrice: cur,
    value: qty * cur,
    pnl: (cur - avg) * qty,
    pnlPct: avg > 0 ? (cur / avg - 1) * 100 : 0,
  };
}

export const SORT_KEYS = ['symbol', 'opened', 'qty', 'avgCost', 'current', 'pnl', 'value'];

/** Sort position rows by a column. Strings (ticker, opened ISO) compare as text. */
export function sortPositions(rows, key, dir = 'desc') {
  const list = [...(rows || [])];
  if (!key) return list;
  const get = {
    symbol: (r) => r.symbol || '',
    opened: (r) => r.openedAt || '',
    qty: (r) => r.qty,
    avgCost: (r) => r.avgCost,
    current: (r) => r.currentPrice,
    pnl: (r) => r.pnl,
    value: (r) => r.value,
  }[key];
  if (!get) return list;
  const sign = dir === 'asc' ? 1 : -1;
  return list.sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (typeof x === 'string' || typeof y === 'string')
      return sign * String(x).localeCompare(String(y));
    return sign * ((Number(x) || 0) - (Number(y) || 0));
  });
}

/* ------------------------------------------------------------------ */
/* Order ticket                                                        */
/* ------------------------------------------------------------------ */

export const PRESETS = [100, 500, 1000, 5000];

/**
 * Everything the ticket shows and whether it can submit.
 * @param {object} t
 * @param {'buy'|'sell'} t.side
 * @param {number} t.amount   USD
 * @param {number} t.cash
 * @param {number|null} t.price      last price of the selected ticker
 * @param {string|null} t.symbol
 * @param {{ qty: number }|null} t.position  the holding in that ticker, if any
 */
export function ticketState({ side, amount, cash, price, symbol, position }) {
  const amt = isNum(amount) && amount > 0 ? amount : 0;
  const px = isNum(price) && price > 0 ? price : null;
  const held = position && Number(position.qty) > 0 ? Number(position.qty) : 0;
  const positionValue = px ? held * px : 0;
  const max =
    side === 'sell'
      ? Math.floor(positionValue * 100) / 100
      : Math.floor((Number(cash) || 0) * 100) / 100;
  const shares = px ? amt / px : 0;
  const cashAfter = side === 'sell' ? (Number(cash) || 0) + amt : (Number(cash) || 0) - amt;

  let reason = null;
  if (!symbol) reason = 'Search for a ticker to trade.';
  else if (!px) reason = 'No live price for this ticker right now.';
  else if (side === 'sell' && held <= 0) reason = `You don't hold any ${symbol}.`;
  else if (amt <= 0) reason = 'Enter an amount.';
  else if (side === 'buy' && amt > (Number(cash) || 0) + 1e-9)
    reason = `Over your available cash of ${fmtUSD(Number(cash) || 0)}.`;
  else if (side === 'sell' && amt > positionValue + 0.005)
    reason = `Over your ${symbol} position of ${fmtUSD(positionValue)}.`;

  return {
    amount: amt,
    shares,
    total: amt,
    cashAfter,
    max,
    held,
    positionValue,
    reason,
    /* The "enter an amount" prompt is guidance, not an error to shout. */
    showReason: reason != null && !(amt <= 0 && reason === 'Enter an amount.'),
    canSubmit: reason == null,
  };
}

/* ------------------------------------------------------------------ */
/* Chart ranges                                                        */
/* ------------------------------------------------------------------ */

export const RANGES = ['1M', '6M', '1Y', '3Y', '5Y', '10Y', 'ALL'];
const RANGE_DAYS = { '1M': 31, '6M': 183, '1Y': 366, '3Y': 1096, '5Y': 1827, '10Y': 3653 };

/**
 * Ranges longer than the account's history, which the chart disables.
 * A range is kept while it is no more than one step past the history (so a
 * 4-month-old account still offers 6M, clamped to inception by the series).
 */
export function disabledRanges(startedAt, now = Date.now()) {
  const t = startedAt ? new Date(startedAt).getTime() : NaN;
  if (!Number.isFinite(t)) return [];
  const ageDays = (now - t) / 86400000;
  const order = ['1M', '6M', '1Y', '3Y', '5Y', '10Y'];
  const firstCovering = order.findIndex((r) => RANGE_DAYS[r] >= ageDays);
  if (firstCovering < 0) return [];
  return order.slice(firstCovering + 1);
}

/** "Since inception" / "Last 6M" / "Jan 2, 2025 to Mar 4, 2025" */
export function rangeCaption(range, custom) {
  if (range === 'ALL') return 'Since inception';
  if (range === 'CUSTOM' && custom?.start && custom?.end)
    return `${fmtDate(custom.start)} to ${fmtDate(custom.end)}`;
  return `Last ${range}`;
}
