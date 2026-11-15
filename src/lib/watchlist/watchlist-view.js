/**
 * Watchlist Market Monitor (Nov 2026): pure helpers for the page. Insights
 * are always calculated from the active list, class and live quotes; nothing
 * here is sample data. Tested by scripts/check-watchlist-monitor.mjs.
 */
import {
  ASSET_CLASSES,
  CLASS_BY_ID,
  classIdOfType,
  displayTicker,
} from '@/lib/watchlist/asset-classes';

const LOCALE = 'en-US';
export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** $1,234.56 (sub-dollar crypto keeps 4 decimals) */
export function fmtUSD(v) {
  if (!isNum(v)) return 'N/A';
  const digits = Math.abs(v) > 0 && Math.abs(v) < 1 ? 4 : 2;
  return `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** +1.23% / -4.27% */
export const fmtSignedPct = (v) =>
  isNum(v) ? `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(2)}%` : 'N/A';

/** "up" | "down" | "flat" */
export const signOf = (v) => (!isNum(v) || v === 0 ? 'flat' : v > 0 ? 'up' : 'down');

/** 10:24 AM in the viewer's local time. */
export function fmtTime(v) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' });
}

/** Market-cap bucket label from a dollar value. */
export function capBucket(marketCap) {
  if (!isNum(marketCap) || marketCap <= 0) return null;
  if (marketCap >= 200e9) return 'Mega cap';
  if (marketCap >= 10e9) return 'Large cap';
  if (marketCap >= 2e9) return 'Mid cap';
  if (marketCap >= 300e6) return 'Small cap';
  return 'Micro cap';
}

/* ------------------------------------------------------------------ */
/* Items                                                               */
/* ------------------------------------------------------------------ */

/**
 * One list's items for a class, starred first (most recently starred on top),
 * then in the order they were added. Quotes are merged in from `quotes`
 * ({ SYMBOL: { price, changePct } }).
 */
export function itemsForClass(list, classId, quotes = {}) {
  const cls = CLASS_BY_ID[classId];
  if (!list || !cls) return [];
  return (list.stocks || [])
    .filter((i) => classIdOfType(i.type) === classId)
    .map((i) => {
      const q = quotes[String(i.ticker).toUpperCase()] || null;
      return {
        ...i,
        price: q && isNum(q.price) ? q.price : null,
        changePct: q && isNum(q.changePct) ? q.changePct : null,
      };
    })
    .sort((a, b) => {
      const sa = a.starredAt ? Date.parse(a.starredAt) : 0;
      const sb = b.starredAt ? Date.parse(b.starredAt) : 0;
      if (sa !== sb) return sb - sa;
      return (Date.parse(a.createdAt || 0) || 0) - (Date.parse(b.createdAt || 0) || 0);
    });
}

/** Count of items per class in a list, for the tabs. */
export function classCounts(list) {
  const out = Object.fromEntries(ASSET_CLASSES.map((c) => [c.id, 0]));
  for (const i of list?.stocks || []) out[classIdOfType(i.type)] += 1;
  return out;
}

/* ------------------------------------------------------------------ */
/* Insights                                                            */
/* ------------------------------------------------------------------ */

/**
 * Breadth, biggest mover, worst performer and sector concentration for the
 * items shown. Items without a quote are left out of the price stats.
 * Sector concentration only for classes with sectors (stocks).
 */
export function computeInsights(items, classId) {
  const priced = (items || []).filter((i) => isNum(i.changePct));
  const up = priced.filter((i) => i.changePct > 0).length;
  const down = priced.filter((i) => i.changePct < 0).length;
  const sorted = [...priced].sort((a, b) => b.changePct - a.changePct);

  let sector = null;
  if (classId === 'stocks') {
    const counts = new Map();
    let withSector = 0;
    for (const i of items || []) {
      if (!i.sector) continue;
      withSector += 1;
      counts.set(i.sector, (counts.get(i.sector) || 0) + 1);
    }
    if (withSector > 0) {
      const [name, n] = [...counts.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0];
      sector = {
        name,
        count: n,
        total: (items || []).length,
        pct: (n / (items || []).length) * 100,
      };
    }
  }

  return {
    total: (items || []).length,
    priced: priced.length,
    breadthPct: priced.length ? (up / priced.length) * 100 : null,
    up,
    down,
    best: sorted[0] || null,
    worst: sorted.length > 1 ? sorted[sorted.length - 1] : null,
    sector,
  };
}

/* ------------------------------------------------------------------ */
/* URL state                                                           */
/* ------------------------------------------------------------------ */

export const RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'];

/** ?class=stocks&symbol=AAPL&range=1M&list=<id> -> state (unknown values fall back). */
export function readUrlState(searchParams) {
  const get = (k) => (searchParams?.get ? searchParams.get(k) : null);
  const cls = get('class');
  const range = (get('range') || '').toUpperCase();
  return {
    classId: CLASS_BY_ID[cls] ? cls : 'stocks',
    symbol: get('symbol') ? String(get('symbol')).toUpperCase() : null,
    range: RANGES.includes(range) ? range : range === 'MAX' ? 'ALL' : '1M',
    listId: get('list') || null,
  };
}

/** The query string for a state, dropping defaults. */
export function writeUrlState(base, { classId, symbol, range, listId }) {
  const sp = new URLSearchParams(base?.toString?.() || '');
  const set = (k, v, dflt) => (v && v !== dflt ? sp.set(k, v) : sp.delete(k));
  set('class', classId, 'stocks');
  set('symbol', symbol, null);
  set('range', range, '1M');
  set('list', listId, null);
  return sp.toString();
}

/* ------------------------------------------------------------------ */
/* Market Monitor 2.0: pulse row, securities table, signals            */
/* ------------------------------------------------------------------ */

/** A day move at or over this percent is a "big move" (same threshold as the alerts). */
export const BIG_MOVE_PCT = 5;
export const PAGE_SIZE = 25;
export const SMART_WINDOW_DAYS = 7;
const DAY_MS = 86400000;

/**
 * The four pulse cards. Pure: everything comes from data the page already has.
 *   list            the active list ({ stocks: [...] })
 *   classId         the active tab
 *   items           itemsForClass(list, classId, quotes)
 *   smartWeekCount  smart adds to this list in the last 7 days (server count)
 *   unreadAlerts    unread 'watchlist' notifications [{ created_at, tickers }]
 *   politicians     { [bioguideId]: { trades: [{ date }] } } (politicians tab)
 */
export function pulseSummary({
  list,
  classId,
  items = [],
  smartWeekCount = 0,
  unreadAlerts = [],
  politicians = {},
  now = Date.now(),
}) {
  const all = list?.stocks || [];
  const tracked = {
    total: all.length,
    inClass: items.length,
    classLabel: CLASS_BY_ID[classId]?.label || '',
  };

  let breadth = null;
  let disclosures = null;
  if (classId === 'politicians') {
    let count = 0;
    let known = false;
    let capped = false;
    for (const i of items) {
      const trades = politicians[i.ticker]?.trades;
      if (!Array.isArray(trades)) continue;
      known = true;
      const recent = trades.filter((t) => {
        const ms = Date.parse(t.date);
        return Number.isFinite(ms) && now - ms <= 30 * DAY_MS && ms <= now + DAY_MS;
      }).length;
      count += recent;
      /* The page loads each member's latest few trades; all of them recent means there may be more. */
      if (trades.length > 0 && recent === trades.length) capped = true;
    }
    disclosures = known ? { count, capped, days: 30 } : null;
  } else {
    const priced = items.filter((i) => isNum(i.changePct));
    const up = priced.filter((i) => i.changePct > 0).length;
    const down = priced.filter((i) => i.changePct < 0).length;
    breadth = priced.length
      ? { priced: priced.length, up, down, pct: (up / priced.length) * 100 }
      : null;
  }

  const inList = new Set(all.map((i) => String(i.ticker).toUpperCase()));
  const tagged = unreadAlerts.filter((a) => Array.isArray(a.tickers) && a.tickers.length > 0);
  const scoped = tagged.length > 0;
  const counted = scoped
    ? tagged.filter((a) => a.tickers.some((t) => inList.has(String(t).toUpperCase())))
    : unreadAlerts;
  const latestAt =
    counted
      .map((a) => a.created_at)
      .filter(Boolean)
      .sort()
      .pop() || null;

  return {
    tracked,
    breadth,
    disclosures,
    smartMatches: { count: Math.max(0, Number(smartWeekCount) || 0), days: SMART_WINDOW_DAYS },
    alerts: { unread: counted.length, latestAt, scoped },
  };
}

export const SORT_KEYS = ['ticker', 'name', 'price', 'changePct'];

/**
 * Sort table rows. No key keeps the order given (starred first, then as
 * added). Rows with no value for the column always sink to the bottom.
 */
export function sortItems(items, key, dir = 'asc') {
  const list = [...(items || [])];
  if (!SORT_KEYS.includes(key)) return list;
  const sign = dir === 'desc' ? -1 : 1;
  const text = key === 'ticker' || key === 'name';
  const get = (i) =>
    key === 'ticker' ? displayTicker(i.ticker || '') : key === 'name' ? i.name || '' : i[key];
  return list.sort((a, b) => {
    const x = get(a);
    const y = get(b);
    const xMissing = text ? !x : !isNum(x);
    const yMissing = text ? !y : !isNum(y);
    if (xMissing || yMissing) return xMissing === yMissing ? 0 : xMissing ? 1 : -1;
    return text ? sign * String(x).localeCompare(String(y)) : sign * (x - y);
  });
}

/** Search (ticker, display ticker or name), starred only, smart-added only. */
export function filterItems(items, { q = '', starredOnly = false, smartOnly = false } = {}) {
  const s = String(q).trim().toLowerCase();
  return (items || []).filter((i) => {
    if (starredOnly && !i.starredAt) return false;
    if (smartOnly && i.addedBy !== 'smart') return false;
    if (!s) return true;
    return `${i.ticker} ${displayTicker(i.ticker || '')} ${i.name || ''}`.toLowerCase().includes(s);
  });
}

/** One page of rows plus the numbers for "Showing 1 to 25 of 40". */
export function paginate(items, page = 1, size = PAGE_SIZE) {
  const total = (items || []).length;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(pages, Math.max(1, Math.round(Number(page)) || 1));
  const start = (p - 1) * size;
  return {
    rows: (items || []).slice(start, start + size),
    page: p,
    pages,
    total,
    from: total ? start + 1 : 0,
    to: Math.min(total, start + size),
  };
}

/** Items whose day move is at or over the big-move threshold, biggest first. */
export function bigMoves(items, threshold = BIG_MOVE_PCT) {
  return (items || [])
    .filter((i) => isNum(i.changePct) && Math.abs(i.changePct) >= threshold)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
}

/** The label a row shows under "Added": the stored reason, never one made up here. */
export function addedLabel(item) {
  if (item?.addedBy !== 'smart') return { smart: false, text: 'Manual' };
  return { smart: true, text: item.addedReason || 'Added by a smart watchlist' };
}

/** A starting question for Sonar about an item; the user can edit it before sending. */
export function sonarPrompt(item) {
  if (!item) return '';
  if (item.type === 'politician')
    return `What has ${item.name || 'this member'} traded recently, and which sectors stand out?`;
  const who =
    item.name && item.name !== item.ticker
      ? `${item.name} (${displayTicker(item.ticker)})`
      : displayTicker(item.ticker);
  return `What are the biggest risks and catalysts for ${who} over the next 12 months?`;
}
