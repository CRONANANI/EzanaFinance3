/**
 * Shared helpers for passing the user's relevance set between the client
 * `useUpcomingEvents` hook and the server upcoming-events route.
 *
 * The relevance set partitions identifiers into four buckets:
 *   - tickers      (AAPL, TSLA, SPY, …)       — uppercased
 *   - politicians  ("Nancy Pelosi", "John Doe") — original casing preserved
 *                  so name-match against FMP firstName/lastName works
 *   - cryptos      (BTC, ETH, SOL, …)         — uppercased
 *   - commodities  (GC, CL, SI, …)            — uppercased
 *
 * Server-side filters are O(1) because each bucket is a Set<string>.
 */

const MAX_ITEMS_PER_KIND = 500;
const MAX_ID_LEN = 64;

function clean(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function toList(set, { upper = true } = {}) {
  if (!set) return [];
  const it = typeof set[Symbol.iterator] === 'function' ? set : [];
  const out = [];
  for (const raw of it) {
    const v = clean(raw);
    if (!v || v.length > MAX_ID_LEN) continue;
    out.push(upper ? v.toUpperCase() : v);
    if (out.length >= MAX_ITEMS_PER_KIND) break;
  }
  return out;
}

/**
 * Encode a relevance object into URLSearchParams for the upcoming-events
 * route. Empty buckets are omitted so SWR-style cache keys stay short.
 *
 * @param {{
 *   tickers?: Set<string>|string[],
 *   politicians?: Set<string>|string[],
 *   cryptos?: Set<string>|string[],
 *   commodities?: Set<string>|string[],
 *   country?: string,
 * }} relevance
 * @returns {URLSearchParams}
 */
export function encodeRelevanceParams(relevance) {
  const params = new URLSearchParams();
  if (!relevance) return params;
  const tl = toList(relevance.tickers);
  const pl = toList(relevance.politicians, { upper: false });
  const cl = toList(relevance.cryptos);
  const ml = toList(relevance.commodities);
  if (tl.length) params.set('tickers', tl.join(','));
  if (pl.length) params.set('politicians', pl.join(','));
  if (cl.length) params.set('cryptos', cl.join(','));
  if (ml.length) params.set('commodities', ml.join(','));
  const country = clean(relevance.country);
  if (country) params.set('country', country.toUpperCase().slice(0, 8));
  return params;
}

/**
 * Parse a comma-separated query-string value into a Set<string>.
 * Uppercases by default — pass { upper: false } to preserve casing (for
 * politician names / slugs).
 */
export function parseSet(value, { upper = true } = {}) {
  const out = new Set();
  if (!value) return out;
  for (const raw of String(value).split(',')) {
    const v = clean(raw);
    if (!v) continue;
    out.add(upper ? v.toUpperCase() : v);
  }
  return out;
}

/**
 * Normalise a politician's full name ("First Last") into a case-insensitive
 * canonical form used for matching. Collapses whitespace; lowercases.
 */
export function canonicalPoliticianKey(name) {
  return clean(name).toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Build a Set<string> of canonical politician keys from a loose list so
 * name matching in the route handler is O(1) per event.
 */
export function canonicalPoliticianSet(values) {
  const out = new Set();
  if (!values) return out;
  const it = typeof values[Symbol.iterator] === 'function' ? values : [];
  for (const raw of it) {
    const key = canonicalPoliticianKey(raw);
    if (key) out.add(key);
  }
  return out;
}
