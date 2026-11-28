/**
 * Shared price-access contract (Sonar 6.4 final integration, Nov 28 2026). Pure.
 *
 * A PROPOSAL, not yet wired into any caller. Today each surface reads prices its own way
 * (price_data_cache, FMP /quote, Alpaca bars, Alpha Vantage, Finnhub) and keeps a different
 * subset of facts about them. This module defines the one shape every price should travel in
 * and normalizers for each existing source, so callers can migrate one at a time.
 * Nothing here fetches, writes, or turns on SONAR_PRICE_SYNC or an Alpaca batch refresh.
 *
 * PricePoint:
 *   security      ticker as filed (BRK.B, not BRK-B)
 *   price         number > 0, or null when unavailable
 *   currency      ISO 4217, 'USD' unless the source says otherwise
 *   priceDate     YYYY-MM-DD the price describes (the trading day, not the fetch day)
 *   kind          'close' | 'last' | 'intraday'
 *   adjustment    'adjusted' | 'unadjusted' | 'unknown'
 *   provider      'fmp' | 'alpaca' | 'alphavantage' | 'finnhub' | 'cache' | 'sample'
 *   via           the provider behind a cache row when known, else null
 *   freshness     'current' | 'stale' | 'unavailable' (see freshnessOf)
 *   ageDays       whole calendar days between priceDate and asOf
 *   redistribution 'display' (may be shown to the signed-in user) | 'internal' (compute only)
 *   state         'live' | 'sample' | 'unavailable' (lib/market-sample/state.js)
 *   reason        why the price is unavailable, else null
 *   cacheVersion  PRICE_CONTRACT_VERSION at the time the point was made
 */

export const PRICE_CONTRACT_VERSION = 'price-contract-v1';

/* Weekend plus a holiday: a close older than 4 days is stale for "current price" uses. */
export const STALE_AFTER_DAYS = 4;

const dateOnly = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return new Date(v * (v < 1e12 ? 1000 : 1)).toISOString().slice(0, 10);
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
const positive = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
export const normalizeTicker = (t) =>
  String(t || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '.');

export function freshnessOf(priceDate, asOf) {
  if (!priceDate) return { freshness: 'unavailable', ageDays: null };
  const age = Math.round((Date.parse(asOf) - Date.parse(priceDate)) / 86400000);
  if (!Number.isFinite(age)) return { freshness: 'unavailable', ageDays: null };
  return { freshness: age <= STALE_AFTER_DAYS ? 'current' : 'stale', ageDays: age };
}

/** An explicit unavailable point: never a zero, never a guess. */
export function unavailablePrice(security, provider, reason, { asOf } = {}) {
  return {
    security: normalizeTicker(security),
    price: null,
    currency: 'USD',
    priceDate: null,
    kind: 'close',
    adjustment: 'unknown',
    provider,
    via: null,
    freshness: 'unavailable',
    ageDays: null,
    redistribution: 'internal',
    state: 'unavailable',
    reason: reason || 'no price available',
    asOf: asOf || null,
    cacheVersion: PRICE_CONTRACT_VERSION,
  };
}

function point(base, asOf) {
  if (base.price == null || !base.priceDate)
    return unavailablePrice(
      base.security,
      base.provider,
      base.reason || 'no price in the response',
      {
        asOf,
      },
    );
  return {
    currency: 'USD',
    kind: 'close',
    adjustment: 'unknown',
    via: null,
    redistribution: 'display',
    state: 'live',
    reason: null,
    ...base,
    security: normalizeTicker(base.security),
    ...freshnessOf(base.priceDate, asOf),
    asOf,
    cacheVersion: PRICE_CONTRACT_VERSION,
  };
}

const today = () => new Date().toISOString().slice(0, 10);

/** FMP /stable/quote row. A quote is the last trade, unadjusted. Sample rows stay sample. */
export function fromFmpQuote(q, { asOf = today() } = {}) {
  const p = point(
    {
      security: q?.symbol,
      price: positive(q?.price),
      priceDate: dateOnly(q?.timestamp),
      kind: 'last',
      adjustment: 'unadjusted',
      provider: 'fmp',
      currency: q?.currency || 'USD',
    },
    asOf,
  );
  if (q?._sample === true)
    return { ...p, provider: 'sample', state: 'sample', redistribution: 'internal' };
  return p;
}

/** Alpaca v2 bar ({ t, o, h, l, c, v }); the feed's adjustment parameter decides `adjustment`. */
export function fromAlpacaBar(security, bar, { asOf = today(), adjustment = 'raw' } = {}) {
  return point(
    {
      security,
      price: positive(bar?.c),
      priceDate: dateOnly(bar?.t),
      adjustment:
        adjustment === 'raw'
          ? 'unadjusted'
          : adjustment === 'all' || adjustment === 'split'
            ? 'adjusted'
            : 'unknown',
      provider: 'alpaca',
      /* IEX/SIP market data: shown to the signed-in user, not republished. */
      redistribution: 'display',
    },
    asOf,
  );
}

/**
 * price_data_cache row ({ ticker, date, close, adj_close, volume }). The table records no
 * provider: rows with volume null come from the screen-price sync (an FMP quote stored as a
 * close, with adj_close copied from it), so their adjustment is unknown, not adjusted.
 */
export function fromCacheRow(r, { asOf = today(), preferAdjusted = false } = {}) {
  const close = positive(r?.close);
  const adj = positive(r?.adj_close);
  const quoteRow = r?.volume == null;
  const useAdj = preferAdjusted && adj != null && !quoteRow;
  return point(
    {
      security: r?.ticker,
      price: useAdj ? adj : close,
      priceDate: dateOnly(r?.date),
      adjustment: useAdj ? 'adjusted' : quoteRow ? 'unknown' : 'unadjusted',
      provider: 'cache',
      via: quoteRow ? 'fmp' : null,
    },
    asOf,
  );
}

/** Alpha Vantage GLOBAL_QUOTE ("05. price", "07. latest trading day"). */
export function fromAlphaVantageQuote(g, { asOf = today() } = {}) {
  const q = g?.['Global Quote'] || g || {};
  return point(
    {
      security: q['01. symbol'],
      price: positive(q['05. price']),
      priceDate: dateOnly(q['07. latest trading day']),
      kind: 'last',
      adjustment: 'unadjusted',
      provider: 'alphavantage',
      redistribution: 'internal',
    },
    asOf,
  );
}

/** Finnhub /quote ({ c, t }); c = 0 means Finnhub has no price for the symbol. */
export function fromFinnhubQuote(security, q, { asOf = today() } = {}) {
  return point(
    {
      security,
      price: positive(q?.c),
      priceDate: dateOnly(q?.t),
      kind: 'last',
      adjustment: 'unadjusted',
      provider: 'finnhub',
      redistribution: 'internal',
    },
    asOf,
  );
}

/**
 * May this point value a position or feed Sonar? Only live, priced, current points; never
 * sample data, never an unavailable placeholder, never a stale close dressed as current.
 */
export function usableForValuation(p, { allowStale = false } = {}) {
  if (!p || p.state !== 'live' || p.price == null) return false;
  if (p.freshness === 'stale' && !allowStale) return false;
  return p.freshness !== 'unavailable';
}
