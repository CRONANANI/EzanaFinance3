/**
 * Best returns for a member of Congress over a period (Nov 21 2026), for the portfolio card
 * of the congressional profile in Sonar.
 *
 * For each listed asset the member disclosed buying in the period: the price on each purchase
 * date (the first close on or after it), averaged with the disclosed range midpoints as
 * weights, against the latest close. Price only: no dividends, and since filings disclose
 * ranges rather than share counts, a return per asset, never a dollar gain. Assets with no
 * ticker (bonds, notes, private holdings) have no price and are left out; the card says so.
 *
 * rankReturns is pure (tested in scripts/check-sonar-congress-profile.mjs);
 * getPoliticianReturns is SERVER ONLY (reads trades and daily closes, cached for six hours).
 */

/* The same share-class folding as the portfolio RPC. */
const FOLD = { GOOG: 'GOOGL', 'BRK.A': 'BRK.B', FOX: 'FOXA', NWS: 'NWSA', UA: 'UAA' };
export const normTicker = (t) => {
  const u = String(t || '')
    .trim()
    .toUpperCase();
  if (!u || !/^[A-Z][A-Z0-9.\-]{0,9}$/.test(u)) return null;
  return FOLD[u] || u;
};

/** The first day of a window `months` long ending `today` (YYYY-MM-DD); null = all time. */
export function windowStart(months, today = new Date()) {
  const m = Number(months);
  if (!Number.isFinite(m) || m <= 0) return null;
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() - m);
  return d.toISOString().slice(0, 10);
}

/** Listed purchases in the window, grouped by ticker, largest disclosed amount first. */
export function purchasesByTicker(trades, from = null) {
  const by = new Map();
  for (const t of trades || []) {
    if (t?.type !== 'purchase') continue;
    const tk = normTicker(t.ticker);
    const date = String(t.transaction_date || '').slice(0, 10);
    if (!tk || !date || (from && date < from)) continue;
    const g = by.get(tk) || { ticker: tk, name: t.asset_name || null, buys: [], amount: 0 };
    const w = Number(t.amount_mid) || Number(t.amount_min) || 1001;
    g.buys.push({ date, weight: w });
    g.amount += w;
    by.set(tk, g);
  }
  return [...by.values()].sort((a, b) => b.amount - a.amount);
}

/* The first close on or after `date`, within ten days (a filing on a weekend or holiday). */
function closeOnOrAfter(candles, date) {
  for (const c of candles) {
    if (c.date >= date) {
      const gap = (Date.parse(c.date) - Date.parse(date)) / 86400000;
      return gap <= 10 ? c : null;
    }
  }
  return null;
}

/**
 * groups   purchasesByTicker() output
 * closes   { [ticker]: [{ date, close }] } oldest first
 * -> [{ ticker, name, pct, entry, last, lastDate, since, buys, amount }] best first, at most max
 */
export function rankReturns(groups, closes, { max = 5 } = {}) {
  const out = [];
  for (const g of groups || []) {
    const candles = closes?.[g.ticker];
    if (!Array.isArray(candles) || candles.length < 2) continue;
    let wsum = 0;
    let psum = 0;
    for (const b of g.buys) {
      const c = closeOnOrAfter(candles, b.date);
      if (!c) continue;
      wsum += b.weight;
      psum += b.weight * c.close;
    }
    if (!(wsum > 0)) continue;
    const entry = psum / wsum;
    const lastBar = candles[candles.length - 1];
    if (!(entry > 0) || !(lastBar?.close > 0)) continue;
    out.push({
      ticker: g.ticker,
      name: g.name,
      pct: (lastBar.close / entry - 1) * 100,
      entry,
      last: lastBar.close,
      lastDate: lastBar.date,
      since: g.buys.reduce((m, b) => (b.date < m ? b.date : m), g.buys[0].date),
      buys: g.buys.length,
      amount: g.amount,
    });
  }
  return out.sort((a, b) => b.pct - a.pct).slice(0, max);
}

const PRICE_TICKERS = 12;
const TTL_S = 6 * 3600;

/**
 * SERVER ONLY. The best returns for one member over `months` (0 or none = all time).
 * -> { from, rows, priced, considered }
 */
export async function getPoliticianReturns(bioguide, months, { admin, getDailyBars, cache } = {}) {
  const id = String(bioguide || '').trim();
  if (!/^[A-Z]\d{6}$/.test(id) || !admin || typeof getDailyBars !== 'function') {
    return { from: null, rows: [], priced: 0, considered: 0 };
  }
  const m = Number(months) > 0 ? Math.min(600, Math.round(Number(months))) : 0;
  const key = `polret:v1:${id}:${m}`;
  if (cache) {
    const hit = await cache.get(key).catch(() => null);
    if (hit) return hit;
  }
  const from = windowStart(m);
  let q = admin
    .from('congress_trades')
    .select('type, transaction_date, amount_min, amount_mid, ticker, asset_name')
    .eq('bioguide_id', id)
    .eq('type', 'purchase')
    .not('ticker', 'is', null)
    .order('transaction_date', { ascending: true })
    .limit(5000);
  if (from) q = q.gte('transaction_date', from);
  const { data } = await q.then(
    (r) => r,
    () => ({ data: null }),
  );
  const groups = purchasesByTicker(data || [], from).slice(0, PRICE_TICKERS);
  const closes = {};
  await Promise.all(
    groups.map(async (g) => {
      const first = g.buys.reduce((mm, b) => (b.date < mm ? b.date : mm), g.buys[0].date);
      try {
        const { candles } = await getDailyBars(g.ticker, first);
        closes[g.ticker] = candles || [];
      } catch {
        closes[g.ticker] = [];
      }
    }),
  );
  const rows = rankReturns(groups, closes);
  const out = {
    from,
    rows,
    priced: Object.values(closes).filter((c) => c.length >= 2).length,
    considered: groups.length,
  };
  if (cache) await cache.set(key, out, TTL_S).catch(() => {});
  return out;
}
