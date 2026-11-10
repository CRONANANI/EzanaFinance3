/**
 * Watchlist Market Monitor (Nov 2026): pure helpers for the page. Insights
 * are always calculated from the active list, class and live quotes; nothing
 * here is sample data. Tested by scripts/check-watchlist-monitor.mjs.
 */
import { ASSET_CLASSES, CLASS_BY_ID, classIdOfType } from '@/lib/watchlist/asset-classes';

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
