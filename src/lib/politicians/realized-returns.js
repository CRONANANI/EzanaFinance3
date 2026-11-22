/**
 * Realized returns for members of Congress (Nov 21 2026): one measure, used by the Politician
 * Tracker's "Realized return" column and by the Best returns list in Sonar's congressional
 * profile.
 *
 * A realized trade is a disclosed purchase of a listed asset matched to the member's next
 * disclosed sale of the same asset (a full or partial sale, transacted after the purchase).
 * Its return is the first close on or after the sale date against the first close on or
 * after the purchase date: price only, no dividends. A purchase with no later sale is still
 * held, so it has no realized return and is left out. Filings disclose amount ranges, not
 * share counts, so a partial sale closes the purchases before it as a group; the purchase's
 * range midpoint is its weight when trades are averaged.
 *
 * A period covers purchases made in it (sales may fall after it, up to today).
 *
 * Pure helpers here; the daily job (/api/cron/politician-realized-returns) and the Sonar route
 * fetch the trades and closes.
 */

/* The same share-class folding as the portfolio RPC. */
const FOLD = { GOOG: 'GOOGL', 'BRK.A': 'BRK.B', FOX: 'FOXA', NWS: 'NWSA', UA: 'UAA' };
export const normTicker = (t) => {
  const u = String(t || '')
    .trim()
    .toUpperCase();
  if (!u || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(u)) return null;
  return FOLD[u] || u;
};

const isSale = (type) => type === 'sale' || type === 'sale_partial';
const day = (d) => String(d || '').slice(0, 10);

/** The first day of a window `days` long ending `today` (YYYY-MM-DD); null = all time. */
export function windowStartDays(days, today = new Date()) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0 || n >= 36500) return null;
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - Math.round(n));
  return d.toISOString().slice(0, 10);
}

/**
 * Purchases matched to the next later sale of the same asset by the same member.
 * trades: [{ bioguide_id, type, transaction_date, amount_mid, amount_min, ticker, asset_name }]
 * -> [{ id, bioguide, ticker, name, buyDate, sellDate, weight }]  (id: the purchase's row id)
 */
export function realizedPairs(trades, { from = null } = {}) {
  const by = new Map();
  for (const t of trades || []) {
    const tk = normTicker(t?.ticker);
    const date = day(t?.transaction_date);
    if (!tk || !date || !(t.type === 'purchase' || isSale(t.type))) continue;
    const k = `${t.bioguide_id || ''}|${tk}`;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push({ ...t, tk, date });
  }
  const out = [];
  for (const list of by.values()) {
    list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const sales = list.filter((x) => isSale(x.type));
    if (!sales.length) continue;
    for (const p of list) {
      if (p.type !== 'purchase' || (from && p.date < from)) continue;
      const sale = sales.find((x) => x.date > p.date);
      if (!sale) continue;
      out.push({
        id: p.id ?? null,
        bioguide: p.bioguide_id || null,
        ticker: p.tk,
        name: p.asset_name || null,
        buyDate: p.date,
        sellDate: sale.date,
        weight: Number(p.amount_mid) || Number(p.amount_min) || 1001,
      });
    }
  }
  return out;
}

/* The first close on or after `date`, within ten days (a weekend, a holiday). */
export function closeOnOrAfter(candles, date) {
  for (const c of candles || []) {
    if (c.date >= date) {
      const gap = (Date.parse(c.date) - Date.parse(date)) / 86400000;
      return gap <= 10 ? c : null;
    }
  }
  return null;
}

/** Each pair with its realized return (percent), where both closes are known. */
export function pairReturns(pairs, closes) {
  const out = [];
  for (const p of pairs || []) {
    const candles = closes?.[p.ticker];
    const buy = closeOnOrAfter(candles, p.buyDate);
    const sell = closeOnOrAfter(candles, p.sellDate);
    if (!buy || !sell || !(buy.close > 0) || !(sell.close > 0)) continue;
    out.push({
      ...p,
      buyClose: buy.close,
      sellClose: sell.close,
      pct: (sell.close / buy.close - 1) * 100,
    });
  }
  return out;
}

const weighted = (rows) => {
  let w = 0;
  let s = 0;
  for (const r of rows) {
    w += r.weight;
    s += r.weight * r.pct;
  }
  return w > 0 ? s / w : null;
};

/**
 * Per member: the realized return over the period (each realized trade weighted by its
 * purchase's range midpoint), the number of realized trades and how many gained.
 * -> { [bioguide]: { pct, trades, wins, amount } }
 */
export function memberRealized(rows) {
  const by = new Map();
  for (const r of rows || []) {
    if (!r.bioguide) continue;
    if (!by.has(r.bioguide)) by.set(r.bioguide, []);
    by.get(r.bioguide).push(r);
  }
  const out = {};
  for (const [id, list] of by) {
    out[id] = {
      pct: weighted(list),
      trades: list.length,
      wins: list.filter((r) => r.pct > 0).length,
      amount: list.reduce((a, r) => a + r.weight, 0),
    };
  }
  return out;
}

/**
 * Per asset, best first (Sonar's Best returns): the weighted realized return, the realized
 * trade count, and the first purchase and last sale dates. At most `max`.
 */
export function assetRealized(rows, { max = 5 } = {}) {
  const by = new Map();
  for (const r of rows || []) {
    if (!by.has(r.ticker)) by.set(r.ticker, []);
    by.get(r.ticker).push(r);
  }
  return [...by.entries()]
    .map(([ticker, list]) => ({
      ticker,
      name: list[0].name,
      pct: weighted(list),
      trades: list.length,
      since: list.reduce((m, r) => (r.buyDate < m ? r.buyDate : m), list[0].buyDate),
      lastSale: list.reduce((m, r) => (r.sellDate > m ? r.sellDate : m), list[0].sellDate),
      amount: list.reduce((a, r) => a + r.weight, 0),
    }))
    .filter((x) => x.pct != null)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, max);
}

/** The earliest purchase date each ticker needs closes from. */
export function tickerStarts(pairs) {
  const out = {};
  for (const p of pairs || [])
    if (!out[p.ticker] || p.buyDate < out[p.ticker]) out[p.ticker] = p.buyDate;
  return out;
}
