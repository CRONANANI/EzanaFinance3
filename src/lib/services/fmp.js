/**
 * Financial Modeling Prep (FMP) API Service
 */

import { ApiCache } from '@/lib/api-cache';

// Read the key at REQUEST time (not from the frozen API_CONFIG snapshot) and
// accept either env var name. API_CONFIG.fmp.key only reads NEXT_PUBLIC_FMP_API_KEY
// and is frozen at module load, so a server-only FMP_API_KEY — or a key set or
// rotated after cold start — never reached this service. That silently broke
// every FmpAPI-backed surface (market-data hooks, company search, the org
// pitch-hindsight engine) while route-level getFmpKey() callers kept working.
function fmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

// FMP deprecated the /api/v3 endpoints on 2025-08-31; accounts that subscribed
// after the cutoff get a 403 on every /v3 call. All paths below target /stable,
// so the base is the bare host and each path starts with /stable.
function fmpBase() {
  return 'https://financialmodelingprep.com';
}

function buildUrl(path, params = {}) {
  const key = fmpKey();
  const base = fmpBase();
  if (!base || !key) return null;
  const qs = new URLSearchParams({ ...params, apikey: key });
  return `${base}${path}?${qs}`;
}

async function fetchJson(path, params, cacheKey, ttl) {
  const url = buildUrl(path, params);
  if (!url) return null;
  const fetcher = async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);
    return res.json();
  };
  return ApiCache.get(cacheKey, fetcher, ttl);
}

const TTL = {
  PROFILE: 86400,
  QUOTE: 120,
  FINANCIALS: 86400,
  METRICS: 86400,
  DCF: 3600,
  MOVERS: 600,
  NEWS: 900,
  CALENDAR: 3600,
  ANALYST: 3600,
  CONGRESS: 1800,
  INSIDER: 1800,
  PEERS: 86400,
  SCREENER: 1800,
  SEARCH: 86400,
};

export const FmpAPI = {
  async getCompanyProfile(symbol) {
    const data = await fetchJson('/stable/profile', { symbol }, `fmp:profile:${symbol}`, TTL.PROFILE);
    return Array.isArray(data) && data.length ? data[0] : data;
  },
  async getStockPeers(symbol) {
    const data = await fetchJson('/stable/stock-peers', { symbol }, `fmp:peers:${symbol}`, TTL.PEERS);
    // Stable returns a flat array of peer companies; v4 wrapped them in
    // [{ peersList: [...] }]. Handle both and return an array of symbols.
    if (!Array.isArray(data) || data.length === 0) return [];
    if (Array.isArray(data[0]?.peersList)) return data[0].peersList;
    return data.map((p) => p.symbol).filter(Boolean);
  },
  async getQuote(symbol) {
    const data = await fetchJson('/stable/quote', { symbol }, `fmp:quote:${symbol}`, TTL.QUOTE);
    return Array.isArray(data) && data.length ? data[0] : data;
  },
  async getBatchQuote(symbols) {
    const list = Array.isArray(symbols) ? symbols.join(',') : symbols;
    const data = await fetchJson('/stable/batch-quote', { symbols: list }, `fmp:batchquote:${list}`, TTL.QUOTE);
    return Array.isArray(data) ? data : [];
  },
  async getIncomeStatement(symbol, period = 'annual', limit = 5) {
    return fetchJson(
      '/stable/income-statement',
      { symbol, period, limit },
      `fmp:income:${symbol}:${period}:${limit}`,
      TTL.FINANCIALS,
    );
  },
  async getBalanceSheet(symbol, period = 'annual', limit = 5) {
    return fetchJson(
      '/stable/balance-sheet-statement',
      { symbol, period, limit },
      `fmp:balance:${symbol}:${period}:${limit}`,
      TTL.FINANCIALS,
    );
  },
  async getCashFlow(symbol, period = 'annual', limit = 5) {
    return fetchJson(
      '/stable/cash-flow-statement',
      { symbol, period, limit },
      `fmp:cashflow:${symbol}:${period}:${limit}`,
      TTL.FINANCIALS,
    );
  },
  async getKeyMetrics(symbol, period = 'annual', limit = 5) {
    return fetchJson(
      '/stable/key-metrics',
      { symbol, period, limit },
      `fmp:metrics:${symbol}:${period}:${limit}`,
      TTL.METRICS,
    );
  },
  async getFinancialRatios(symbol, period = 'annual', limit = 5) {
    return fetchJson(
      '/stable/ratios',
      { symbol, period, limit },
      `fmp:ratios:${symbol}:${period}:${limit}`,
      TTL.METRICS,
    );
  },
  async getDCF(symbol) {
    const data = await fetchJson(
      '/stable/discounted-cash-flow',
      { symbol },
      `fmp:dcf:${symbol}`,
      TTL.DCF,
    );
    return Array.isArray(data) && data.length ? data[0] : data;
  },
  async getRating(symbol) {
    const data = await fetchJson('/stable/ratings-snapshot', { symbol }, `fmp:rating:${symbol}`, TTL.ANALYST);
    return Array.isArray(data) && data.length ? data[0] : null;
  },
  async getGainers() {
    return fetchJson('/stable/biggest-gainers', {}, 'fmp:gainers', TTL.MOVERS);
  },
  async getLosers() {
    return fetchJson('/stable/biggest-losers', {}, 'fmp:losers', TTL.MOVERS);
  },
  async getMostActive() {
    return fetchJson('/stable/most-actives', {}, 'fmp:actives', TTL.MOVERS);
  },
  async getStockNews(tickers, limit = 20) {
    const params = { limit };
    if (tickers) params.symbols = Array.isArray(tickers) ? tickers.join(',') : tickers;
    return fetchJson(
      '/stable/news/stock',
      params,
      `fmp:stocknews:${params.symbols || 'all'}:${limit}`,
      TTL.NEWS,
    );
  },
  async searchSymbol(query, limit = 10) {
    return fetchJson('/stable/search-symbol', { query, limit }, `fmp:search:${query}`, TTL.SEARCH);
  },
  async getHistoricalPrice(symbol) {
    const data = await fetchJson(
      '/stable/historical-price-eod/full',
      { symbol },
      `fmp:histprice:${symbol}`,
      TTL.FINANCIALS,
    );
    // Stable returns a flat array; v3 wrapped it in { historical: [...] }.
    return Array.isArray(data) ? data : data?.historical || [];
  },
};
