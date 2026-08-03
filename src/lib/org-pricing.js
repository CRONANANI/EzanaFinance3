/**
 * Org book pricing — server-only helpers used by the daily cron (and callable
 * on demand). Quotes are fetched ONCE per distinct ticker across ALL orgs,
 * then written back to every active org_positions row for that ticker.
 *
 * Providers: FMP batch-quote first (one call per 100 symbols), then a
 * per-symbol Finnhub fallback for anything FMP missed. A symbol neither
 * provider prices is left untouched — its rows keep their previous
 * current_price / last_priced_at, and Phase A's carried-at-cost valuation
 * remains the honest floor. No fabricated prices, ever.
 */

import { FmpAPI } from '@/lib/services/fmp';

const CHUNK = 100; // FMP batch-quote page size
const FINNHUB_CONCURRENCY = 4;

const finite = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/** Direct server-side Finnhub quote (the src/lib/services/finnhub.js client is
 *  a browser proxy wrapper — unusable inside a cron). Returns price or null. */
async function finnhubQuote(symbol) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const j = await res.json();
    return finite(j?.c);
  } catch {
    return null;
  }
}

/** Fetch prices for a set of tickers. @returns Map(ticker → price) */
export async function fetchPricesForTickers(tickers) {
  const symbols = [...new Set(tickers.map((t) => String(t || '').toUpperCase().trim()).filter(Boolean))];
  const prices = new Map();
  if (symbols.length === 0) return prices;

  // 1) FMP batch quotes
  for (const group of chunk(symbols, CHUNK)) {
    try {
      const rows = await FmpAPI.getBatchQuote(group);
      for (const r of rows || []) {
        const sym = String(r?.symbol || '').toUpperCase();
        const p = finite(r?.price);
        if (sym && p != null) prices.set(sym, p);
      }
    } catch {
      /* fall through to Finnhub for this group's symbols */
    }
  }

  // 2) Finnhub fallback for the misses, small concurrency pool
  const missing = symbols.filter((s) => !prices.has(s));
  for (const group of chunk(missing, FINNHUB_CONCURRENCY)) {
    const results = await Promise.all(group.map((s) => finnhubQuote(s)));
    group.forEach((s, i) => {
      if (results[i] != null) prices.set(s, results[i]);
    });
  }

  return prices;
}

/**
 * Refresh current_price on every active org position, all orgs at once.
 * One UPDATE per priced ticker (fans out across orgs holding it).
 * @returns {{ tickers: number, priced: number, unpriced: string[], rowsTouched: number }}
 */
export async function refreshOrgPositionPrices(admin) {
  const { data: rows, error } = await admin
    .from('org_positions')
    .select('ticker')
    .eq('is_active', true);
  if (error) throw new Error(`read tickers: ${error.message}`);

  const tickers = [...new Set((rows || []).map((r) => (r.ticker || '').toUpperCase()))].filter(Boolean);
  const prices = await fetchPricesForTickers(tickers);
  const now = new Date().toISOString();

  let rowsTouched = 0;
  for (const group of chunk([...prices.entries()], 10)) {
    const results = await Promise.all(
      group.map(([ticker, price]) =>
        admin
          .from('org_positions')
          .update({ current_price: price, last_priced_at: now })
          .eq('ticker', ticker)
          .eq('is_active', true)
          .select('id'),
      ),
    );
    for (const r of results) rowsTouched += (r.data || []).length;
  }

  return {
    tickers: tickers.length,
    priced: prices.size,
    unpriced: tickers.filter((t) => !prices.has(t)),
    rowsTouched,
  };
}
