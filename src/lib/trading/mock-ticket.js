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
 *   day P&L        sum of qty x the day's per-share change (a position opened
 *                  today counts from its fill, not the previous close)
 *   weight         position market value / total value
 */

import { tradeImpacts } from './mock-thesis.js';

const LOCALE = 'en-US';
const ET = 'America/New_York';

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

const etDayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: ET,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const etClockFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ET,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
});
const etStampFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ET,
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const etShortDayFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ET,
  month: 'short',
  day: 'numeric',
});

/** The New York calendar day of a timestamp, "2026-11-14"; null when invalid. */
export function etDay(v) {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : etDayFmt.format(d);
}

/** "10:24:16 AM ET" (the quotes status in the page header). */
export function fmtClockET(v) {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? 'N/A' : `${etClockFmt.format(d)} ET`;
}

/** "Oct 1, 10:24 AM" in New York time (the journal's Time (ET) column). */
export function fmtStampET(v) {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? 'N/A' : etStampFmt.format(d);
}

/** "Oct 1" in New York time (labels such as "Edit thesis note for NVDA, Oct 1"). */
export function fmtShortDayET(v) {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? 'N/A' : etShortDayFmt.format(d);
}

/** "12.4%" (unsigned percent, one decimal: weights and shares of a total). */
export const fmtPct = (v, dp = 1) => (isNum(v) ? `${v.toFixed(dp)}%` : 'N/A');

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
 * @param {{ cash: number, startingCash: number,
 *   positions: Array<{ qty: number, avgCost: number, currentPrice: number, dayPnl?: number|null }> }} p
 *   dayPnl per row comes from positionRow; rows without a live day change
 *   (dayPnl null) are left out, and with none at all the day P&L is null ("N/A").
 */
export function summarizePortfolio({ cash, startingCash, positions }) {
  const list = Array.isArray(positions) ? positions : [];
  let marketValue = 0;
  let costBasis = 0;
  let dayPnl = null;
  for (const pos of list) {
    const q = Number(pos.qty) || 0;
    marketValue += q * (Number(pos.currentPrice) || 0);
    costBasis += q * (Number(pos.avgCost) || 0);
    if (isNum(pos.dayPnl)) dayPnl = (dayPnl ?? 0) + pos.dayPnl;
  }
  const c = Number(cash) || 0;
  const start = Number(startingCash) || 0;
  const totalValue = c + marketValue;
  const totalPnl = totalValue - start;
  const unrealised = marketValue - costBasis;
  const dayBase = dayPnl == null ? 0 : totalValue - dayPnl;
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
    dayPnl,
    dayPnlPct: dayPnl != null && dayBase > 0 ? (dayPnl / dayBase) * 100 : null,
    cashPct: totalValue > 0 ? (c / totalValue) * 100 : 0,
  };
}

/**
 * One position row: market value and P&L from qty, average cost and current
 * price; the day's move from the live per-share change; the weight against
 * the portfolio total.
 *
 * @param {object} pos  { symbol, name?, qty, avgCost, currentPrice, openedAt? }
 * @param {{ change?: number|null, totalValue?: number, now?: number }} [opts]
 *   change      per-share day change from the live quote, or null when none
 *   totalValue  portfolio total, for the weight (omit and weight is null)
 *   now         clock for the opened-today rule (tests)
 */
export function positionRow(pos, opts = {}) {
  const { change = null, totalValue = null, now = Date.now() } = opts;
  const qty = Number(pos.qty) || 0;
  const avg = Number(pos.avgCost) || 0;
  const cur = Number(pos.currentPrice) || avg;
  const value = qty * cur;
  let dayPnl = null;
  let dayPct = null;
  if (isNum(change)) {
    /* Opened today: the gain counts from the fill, never more than the day's move. */
    const openedToday = pos.openedAt && etDay(pos.openedAt) === etDay(now);
    const perShare = openedToday ? Math.min(change, cur - avg) : change;
    dayPnl = qty * perShare;
    const prev = cur - change;
    dayPct = prev > 0 ? (change / prev) * 100 : null;
  }
  return {
    ...pos,
    name: pos.name || pos.symbol || '',
    qty,
    avgCost: avg,
    currentPrice: cur,
    value,
    pnl: (cur - avg) * qty,
    pnlPct: avg > 0 ? (cur / avg - 1) * 100 : 0,
    dayPnl,
    dayPct,
    weight: isNum(totalValue) && totalValue > 0 ? (value / totalValue) * 100 : null,
  };
}

/**
 * Every row of the positions table plus the summary they add up to, in one
 * pass: rows first (value, P&L, day move), then the total, then each weight.
 *
 * @param {{ positions: object[], cash: number, startingCash: number,
 *   changes?: Record<string, number|null>, now?: number }} p
 *   changes is keyed by upper-case ticker (the live quote's per-share change).
 */
export function portfolioRows({ positions, cash, startingCash, changes = {}, now = Date.now() }) {
  const list = Array.isArray(positions) ? positions : [];
  const changeOf = (p) => {
    const v = changes?.[String(p.symbol || '').toUpperCase()];
    return isNum(v) ? v : null;
  };
  const base = list.map((p) => positionRow(p, { change: changeOf(p), now }));
  const summary = summarizePortfolio({ cash, startingCash, positions: base });
  const rows = list.map((p) =>
    positionRow(p, { change: changeOf(p), now, totalValue: summary.totalValue }),
  );
  return { rows, summary };
}

/** 'all' | 'winners' (P&L above zero) | 'losers' (below zero). */
export const POSITION_FILTERS = [
  { id: 'all', label: 'All positions' },
  { id: 'winners', label: 'Winners' },
  { id: 'losers', label: 'Losers' },
];

export function filterPositions(rows, filter = 'all') {
  const list = Array.isArray(rows) ? rows : [];
  if (filter === 'winners') return list.filter((r) => r.pnl > 0);
  if (filter === 'losers') return list.filter((r) => r.pnl < 0);
  return list;
}

/**
 * Fill share (0 to 1) of a row's weight bar. The bar is full at the thesis
 * cap when one is set, otherwise at the largest weight in the table.
 */
export function weightBarFill(weight, rows, cap = null) {
  const w = Number(weight);
  if (!isNum(w) || w <= 0) return 0;
  let max = Number(cap);
  if (!(max > 0)) {
    max = 0;
    for (const r of Array.isArray(rows) ? rows : [])
      if (isNum(r.weight)) max = Math.max(max, r.weight);
  }
  return max > 0 ? Math.min(1, w / max) : 0;
}

export const SORT_KEYS = [
  'symbol',
  'name',
  'qty',
  'avgCost',
  'current',
  'dayPct',
  'pnl',
  'value',
  'weight',
];

/** Sort position rows by a column. Strings (ticker, opened ISO) compare as text. */
export function sortPositions(rows, key, dir = 'desc') {
  const list = [...(rows || [])];
  if (!key) return list;
  const get = {
    symbol: (r) => r.symbol || '',
    name: (r) => r.name || '',
    opened: (r) => r.openedAt || '',
    qty: (r) => r.qty,
    avgCost: (r) => r.avgCost,
    current: (r) => r.currentPrice,
    pnl: (r) => r.pnl,
    value: (r) => r.value,
    dayPct: (r) => (isNum(r.dayPct) ? r.dayPct : -Infinity),
    weight: (r) => r.weight,
  }[key];
  if (!get) return list;
  const sign = dir === 'asc' ? 1 : -1;
  return list.sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (typeof x === 'string' || typeof y === 'string')
      return sign * String(x).localeCompare(String(y));
    const a1 = Number.isFinite(x) || x === -Infinity ? x : Number(x) || 0;
    const b1 = Number.isFinite(y) || y === -Infinity ? y : Number(y) || 0;
    if (a1 === b1) return 0;
    return sign * (a1 < b1 ? -1 : 1);
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

export const RANGES = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];
export const DEFAULT_RANGE = '3M';
const RANGE_DAYS = { '1W': 7, '1M': 31, '3M': 92, '6M': 183, '1Y': 366 };
const RANGE_CAPTIONS = {
  '1W': 'Last week',
  '1M': 'Last month',
  '3M': 'Last 3 months',
  '6M': 'Last 6 months',
  '1Y': 'Last year',
};

/**
 * Ranges longer than the account's history, which the chart disables.
 * A range is kept while it is no more than one step past the history (so a
 * 4-month-old account still offers 6M, clamped to inception by the series).
 */
export function disabledRanges(startedAt, now = Date.now()) {
  const t = startedAt ? new Date(startedAt).getTime() : NaN;
  if (!Number.isFinite(t)) return [];
  const ageDays = (now - t) / 86400000;
  const order = RANGES.filter((r) => r !== 'ALL');
  const firstCovering = order.findIndex((r) => RANGE_DAYS[r] >= ageDays);
  if (firstCovering < 0) return [];
  return order.slice(firstCovering + 1);
}

/** "Since inception" / "Last 6 months" / "Jan 2, 2025 to Mar 4, 2025" */
export function rangeCaption(range, custom) {
  if (range === 'ALL') return 'Since inception';
  if (range === 'CUSTOM' && custom?.start && custom?.end)
    return `${fmtDate(custom.start)} to ${fmtDate(custom.end)}`;
  return RANGE_CAPTIONS[range] || `Last ${range}`;
}

/* ------------------------------------------------------------------ */
/* Market movers                                                       */
/* ------------------------------------------------------------------ */

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[%+$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/**
 * The movers response ({ gainers, losers }) as two lists of
 * { ticker, name, price, change, pct }. The dollar change comes from the
 * response when it carries one, else from the price and the percent.
 */
export function normalizeMovers(resp, limit = 5) {
  const one = (m) => {
    const price = num(m?.price);
    const pct = num(m?.changesPercentage ?? m?.change);
    let change = num(m?.dollarChange);
    if (change == null && price != null && pct != null && pct > -100)
      change = price - price / (1 + pct / 100);
    return {
      ticker: String(m?.ticker || m?.symbol || '').toUpperCase(),
      name: m?.name || '',
      price,
      change,
      pct,
    };
  };
  const list = (rows) =>
    (Array.isArray(rows) ? rows : [])
      .map(one)
      .filter((m) => m.ticker && m.pct != null)
      .slice(0, limit);
  return { gainers: list(resp?.gainers), losers: list(resp?.losers) };
}

/* ------------------------------------------------------------------ */
/* Activity and trade journal                                          */
/* ------------------------------------------------------------------ */

/** "+7.0112 shares" / "-10 shares" / "Opened position" / "Closed position" */
export function impactLabel(impact) {
  if (!impact) return 'N/A';
  if (impact.kind === 'opened') return 'Opened position';
  if (impact.kind === 'closed') return 'Closed position';
  const n = fmtQty(impact.shares);
  return impact.kind === 'reduced' ? `-${n} shares` : `+${n} shares`;
}

/**
 * Journal rows from the trade log (newest first), each with its details line
 * and the position impact from a replay of the whole log in time order.
 *
 * @param {Array<{ id, ticker, trade_type, quantity, price, total_amount,
 *   created_at, thesis_note?, thesis_name? }>} trades
 */
export function journalRows(trades) {
  const list = Array.isArray(trades) ? trades : [];
  const impacts = tradeImpacts(list);
  return list.map((t) => {
    const side = t.trade_type === 'sell' ? 'sell' : 'buy';
    const qty = Number(t.quantity) || 0;
    const price = Number(t.price) || 0;
    const total =
      isNum(Number(t.total_amount)) && t.total_amount != null
        ? Number(t.total_amount)
        : qty * price;
    const impact = impacts.get(t.id) || null;
    return {
      id: t.id,
      side,
      symbol: String(t.ticker || '').toUpperCase(),
      qty,
      price,
      total,
      ts: t.created_at,
      details: `${side === 'sell' ? 'Sold' : 'Bought'} ${fmtQty(qty)} shares @ ${fmtUSD(price)}`,
      impact,
      impactText: impactLabel(impact),
      note: t.thesis_note || null,
      thesisName: t.thesis_name || null,
    };
  });
}
