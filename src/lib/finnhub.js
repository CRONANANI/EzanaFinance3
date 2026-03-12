/**
 * Finnhub API client - uses Next.js API proxy to hide API key
 * Base URL: https://finnhub.io/api/v1
 */

const FINNHUB_BASE = '/api/finnhub';

export async function finnhubFetch(endpoint, params = {}) {
  const searchParams = new URLSearchParams(params);
  const url = `${FINNHUB_BASE}/${endpoint}${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Finnhub API error: ${res.status}`);
  }
  return res.json();
}

export const FinnhubAPI = {
  /** Symbol lookup / autocomplete - /search?q= */
  async search(query, exchange = 'US') {
    if (!query || query.trim().length < 2) return [];
    const data = await finnhubFetch('search', { q: query.trim(), exchange });
    const results = Array.isArray(data?.result) ? data.result : [];
    return results.slice(0, 15).map((r) => ({
      symbol: r.symbol || r.displaySymbol,
      name: r.description || r.displaySymbol || r.symbol,
      type: r.type,
    }));
  },

  /** Raw search results (for CompanySearch with type filter) */
  async searchRaw(query, exchange = 'US') {
    if (!query || query.trim().length < 1) return [];
    const data = await finnhubFetch('search', { q: query.trim(), exchange });
    return Array.isArray(data?.result) ? data.result : [];
  },

  /** Company profile - /stock/profile2?symbol= */
  async getCompanyProfile(symbol) {
    if (!symbol) return null;
    return finnhubFetch('stock/profile2', { symbol: symbol.toUpperCase() });
  },

  /** Real-time quote - /quote?symbol= */
  async getQuote(symbol) {
    if (!symbol) return null;
    return finnhubFetch('quote', { symbol: symbol.toUpperCase() });
  },

  /** Company news - /company-news?symbol=&from=&to= */
  async getCompanyNews(symbol, fromDate, toDate) {
    if (!symbol) return [];
    const data = await finnhubFetch('company-news', {
      symbol: symbol.toUpperCase(),
      from: fromDate,
      to: toDate,
    });
    return Array.isArray(data) ? data : [];
  },

  /** Key financials - /stock/metric?symbol=&metric=all */
  async getStockMetric(symbol) {
    if (!symbol) return null;
    return finnhubFetch('stock/metric', { symbol: symbol.toUpperCase(), metric: 'all' });
  },

  /** Analyst recommendations - /stock/recommendation?symbol= */
  async getRecommendation(symbol) {
    if (!symbol) return [];
    const data = await finnhubFetch('stock/recommendation', { symbol: symbol.toUpperCase() });
    return Array.isArray(data) ? data : [];
  },

  /** Earnings history - /stock/earnings?symbol= */
  async getEarnings(symbol, limit = 8) {
    if (!symbol) return [];
    const data = await finnhubFetch('stock/earnings', { symbol: symbol.toUpperCase(), limit });
    return Array.isArray(data) ? data : [];
  },

  /** Peers / competitors - /stock/peers?symbol= */
  async getPeers(symbol) {
    if (!symbol) return [];
    const data = await finnhubFetch('stock/peers', { symbol: symbol.toUpperCase() });
    return Array.isArray(data) ? data : [];
  },

  /** Price target (premium - may return limited data on free tier) */
  async getPriceTarget(symbol) {
    if (!symbol) return null;
    return finnhubFetch('stock/price-target', { symbol: symbol.toUpperCase() });
  },
};
