/**
 * Best realized returns for a member of Congress over a period (Nov 21 2026), for the
 * portfolio card of Sonar's congressional profile. The measure is the Politician Tracker's
 * "Realized return" (lib/politicians/realized-returns): each disclosed purchase in the period
 * matched to the member's next disclosed sale of the same asset, from the close on the
 * purchase date to the close on the sale date. Positions still held have no realized return.
 *
 * getPoliticianReturns is SERVER ONLY (reads trades and daily closes, cached six hours).
 */

import {
  realizedPairs,
  pairReturns,
  assetRealized,
  tickerStarts,
  normTicker,
} from '@/lib/politicians/realized-returns';

export { normTicker };

/** The first day of a window `months` long ending `today` (YYYY-MM-DD); null = all time. */
export function windowStart(months, today = new Date()) {
  const m = Number(months);
  if (!Number.isFinite(m) || m <= 0) return null;
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() - m);
  return d.toISOString().slice(0, 10);
}

const PRICE_TICKERS = 15;
const TTL_S = 6 * 3600;

/**
 * SERVER ONLY. The best realized returns for one member over `months` (0 = all time).
 * -> { from, rows: [{ ticker, name, pct, trades, since, lastSale, amount }], realized, priced }
 */
export async function getPoliticianReturns(bioguide, months, { admin, getDailyBars, cache } = {}) {
  const id = String(bioguide || '').trim();
  if (!/^[A-Z]\d{6}$/.test(id) || !admin || typeof getDailyBars !== 'function') {
    return { from: null, rows: [], realized: 0, priced: 0 };
  }
  const m = Number(months) > 0 ? Math.min(600, Math.round(Number(months))) : 0;
  const key = `polret:v2:${id}:${m}`;
  if (cache) {
    const hit = await cache.get(key).catch(() => null);
    if (hit) return hit;
  }
  const from = windowStart(m);
  const { data } = await admin
    .from('congress_trades')
    .select('bioguide_id, type, transaction_date, amount_min, amount_mid, ticker, asset_name')
    .eq('bioguide_id', id)
    .in('type', ['purchase', 'sale', 'sale_partial'])
    .not('ticker', 'is', null)
    .order('transaction_date', { ascending: true })
    .limit(5000)
    .then(
      (r) => r,
      () => ({ data: null }),
    );
  const pairs = realizedPairs(data || [], { from });
  /* Price the assets with the most realized money first, so a bounded fetch covers the bulk. */
  const weightBy = {};
  for (const p of pairs) weightBy[p.ticker] = (weightBy[p.ticker] || 0) + p.weight;
  const starts = tickerStarts(pairs);
  const tickers = Object.keys(starts)
    .sort((a, b) => weightBy[b] - weightBy[a])
    .slice(0, PRICE_TICKERS);
  const closes = {};
  await Promise.all(
    tickers.map(async (t) => {
      try {
        const { candles } = await getDailyBars(t, starts[t]);
        closes[t] = candles || [];
      } catch {
        closes[t] = [];
      }
    }),
  );
  const rows = assetRealized(pairReturns(pairs, closes));
  const out = {
    from,
    rows,
    realized: pairs.length,
    priced: Object.values(closes).filter((c) => c.length >= 2).length,
  };
  if (cache) await cache.set(key, out, TTL_S).catch(() => {});
  return out;
}
