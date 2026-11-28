/**
 * Sonar valuation prices through the shared price contract (Sonar 6.4 integration,
 * Nov 28 2026). Pure. NOT WIRED: analytics-server.js (valuationFor, pricesFor) and
 * valuation/fetch.js (storedClose) still build their own { price, asOf, source } objects.
 * This adapter produces the same shape they consume, plus the contract's provenance, so the
 * 6.5 session can switch callers one at a time behind SONAR_PRICE_CONTRACT=1.
 *
 * Rules (each is tested in scripts/check-6-4-compat.mjs):
 *   - a missing, zero or non-numeric price is unavailable, never 0
 *   - sample (demonstration) prices are rejected
 *   - a close older than the methodology's window is rejected (valuation: 10 calendar
 *     days, the window storedClose already uses; screens may pass their own)
 *   - a quote is labelled a last trade, never an adjusted close
 *   - currency and provider are carried through; a non-USD price is rejected for ratios
 *     computed against USD filings rather than silently mixed
 */
import {
  fromCacheRow,
  fromFmpQuote,
  usableForValuation,
  normalizeTicker,
} from './price-contract.js';

/** Calendar days a stored close may be old for valuation (matches storedClose). */
export const VALUATION_MAX_AGE_DAYS = 10;

/** The flag a caller checks before using this adapter. Off unless set to '1'. */
export const priceContractEnabled = (env = {}) => env.SONAR_PRICE_CONTRACT === '1';

function accept(p, { maxAgeDays, currency }) {
  if (!p || p.state === 'sample')
    return { ok: false, reason: 'sample data is never used for valuation' };
  if (p.state === 'unavailable' || p.price == null)
    return { ok: false, reason: p?.reason || 'no price' };
  if (p.ageDays != null && p.ageDays > maxAgeDays)
    return { ok: false, reason: `price is ${p.ageDays} days old (limit ${maxAgeDays})` };
  if (currency && p.currency !== currency)
    return { ok: false, reason: `price in ${p.currency}, filings in ${currency}` };
  if (!usableForValuation(p, { allowStale: true })) return { ok: false, reason: 'not usable' };
  return { ok: true, reason: null };
}

/** The legacy shape callers consume, with provenance added. */
const legacy = (p, source) => ({
  price: p.price,
  asOf: p.priceDate,
  source,
  provider: p.via ? `${p.provider}:${p.via}` : p.provider,
  kind: p.kind,
  adjustment: p.adjustment,
  currency: p.currency,
  ageDays: p.ageDays,
  contract: p.cacheVersion,
});

/**
 * Build { prices, rejected } for valuation from cache rows and live quotes.
 * @param {object} input
 * @param {object[]} [input.cacheRows]  price_data_cache rows, any order
 * @param {object} [input.quotes]       { TICKER: fmp quote row } (live)
 * @param {string} input.asOf           YYYY-MM-DD
 * @param {number} [input.maxAgeDays]
 * @param {string} [input.currency]     currency of the filings ('USD')
 */
export function valuationPrices({
  cacheRows = [],
  quotes = {},
  asOf,
  maxAgeDays = VALUATION_MAX_AGE_DAYS,
  currency = 'USD',
} = {}) {
  const prices = {};
  const rejected = {};
  /* newest close per ticker, never a row dated after asOf */
  const newest = new Map();
  for (const r of cacheRows || []) {
    const t = normalizeTicker(r?.ticker);
    const d = String(r?.date || '').slice(0, 10);
    if (!t || !d || d > asOf) continue;
    const cur = newest.get(t);
    if (!cur || d > String(cur.date).slice(0, 10)) newest.set(t, r);
  }
  for (const [t, r] of newest) {
    const p = fromCacheRow(r, { asOf });
    const a = accept(p, { maxAgeDays, currency });
    if (a.ok) prices[t] = legacy(p, 'cache');
    else rejected[t] = a.reason;
  }
  /* a live quote fills a gap; it never replaces a usable stored close */
  for (const [k, q] of Object.entries(quotes || {})) {
    const t = normalizeTicker(k);
    if (prices[t]) continue;
    const p = fromFmpQuote({ ...q, symbol: q?.symbol || t }, { asOf });
    const a = accept(p, { maxAgeDays: Math.min(maxAgeDays, 4), currency });
    if (a.ok) {
      prices[t] = legacy(p, 'live');
      delete rejected[t];
    } else if (!rejected[t]) rejected[t] = a.reason;
  }
  return { prices, rejected };
}
