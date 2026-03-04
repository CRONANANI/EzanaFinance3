/**
 * Financial Modeling Prep (FMP) API Service
 */

import { ApiCache } from './api-cache';
import { API_CONFIG } from './api-config';

function cfg() {
  return API_CONFIG.fmp || {};
}

function buildUrl(path, params = {}) {
  const { base, key } = cfg();
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

const TTL = { PROFILE: 86400, QUOTE: 120, FINANCIALS: 86400, METRICS: 86400, DCF: 3600, MOVERS: 600, NEWS: 900, CALENDAR: 3600, ANALYST: 3600, CONGRESS: 1800, INSIDER: 1800, PEERS: 86400, SCREENER: 1800, SEARCH: 86400 };

export const FmpAPI = {
  async getCompanyProfile(symbol) {
    const data = await fetchJson(`/v3/profile/${symbol}`, {}, `fmp:profile:${symbol}`, TTL.PROFILE);
    return Array.isArray(data) && data.length ? data[0] : data;
  },
  async getStockPeers(symbol) {
    const data = await fetchJson(`/v4/stock_peers`, { symbol }, `fmp:peers:${symbol}`, TTL.PEERS);
    return Array.isArray(data) && data.length ? data[0].peersList || [] : [];
  },
  async getQuote(symbol) {
    const data = await fetchJson(`/v3/quote/${symbol}`, {}, `fmp:quote:${symbol}`, TTL.QUOTE);
    return Array.isArray(data) && data.length ? data[0] : data;
  },
  async getBatchQuote(symbols) {
    const list = Array.isArray(symbols) ? symbols.join(',') : symbols;
    const data = await fetchJson(`/v3/quote/${list}`, {}, `fmp:batchquote:${list}`, TTL.QUOTE);
    return Array.isArray(data) ? data : [];
  },
  async getIncomeStatement(symbol, period = 'annual', limit = 5) {
    return fetchJson(`/v3/income-statement/${symbol}`, { period, limit }, `fmp:income:${symbol}:${period}:${limit}`, TTL.FINANCIALS);
  },
  async getBalanceSheet(symbol, period = 'annual', limit = 5) {
    return fetchJson(`/v3/balance-sheet-statement/${symbol}`, { period, limit }, `fmp:balance:${symbol}:${period}:${limit}`, TTL.FINANCIALS);
  },
  async getCashFlow(symbol, period = 'annual', limit = 5) {
    return fetchJson(`/v3/cash-flow-statement/${symbol}`, { period, limit }, `fmp:cashflow:${symbol}:${period}:${limit}`, TTL.FINANCIALS);
  },
  async getKeyMetrics(symbol, period = 'annual', limit = 5) {
    return fetchJson(`/v3/key-metrics/${symbol}`, { period, limit }, `fmp:metrics:${symbol}:${period}:${limit}`, TTL.METRICS);
  },
  async getFinancialRatios(symbol, period = 'annual', limit = 5) {
    return fetchJson(`/v3/ratios/${symbol}`, { period, limit }, `fmp:ratios:${symbol}:${period}:${limit}`, TTL.METRICS);
  },
  async getDCF(symbol) {
    const data = await fetchJson(`/v3/discounted-cash-flow/${symbol}`, {}, `fmp:dcf:${symbol}`, TTL.DCF);
    return Array.isArray(data) && data.length ? data[0] : data;
  },
  async getRating(symbol) {
    const data = await fetchJson(`/v3/rating/${symbol}`, {}, `fmp:rating:${symbol}`, TTL.ANALYST);
    return Array.isArray(data) && data.length ? data[0] : null;
  },
  async getGainers() { return fetchJson('/v3/stock_market/gainers', {}, 'fmp:gainers', TTL.MOVERS); },
  async getLosers() { return fetchJson('/v3/stock_market/losers', {}, 'fmp:losers', TTL.MOVERS); },
  async getMostActive() { return fetchJson('/v3/stock_market/actives', {}, 'fmp:actives', TTL.MOVERS); },
  async getStockNews(tickers, limit = 20) {
    const params = { limit };
    if (tickers) params.tickers = Array.isArray(tickers) ? tickers.join(',') : tickers;
    return fetchJson('/v3/stock_news', params, `fmp:stocknews:${params.tickers || 'all'}:${limit}`, TTL.NEWS);
  },
  async searchSymbol(query, limit = 10) {
    return fetchJson('/v3/search', { query, limit }, `fmp:search:${query}`, TTL.SEARCH);
  },
  async getHistoricalPrice(symbol) {
    const data = await fetchJson(`/v3/historical-price-full/${symbol}`, { serietype: 'line' }, `fmp:histprice:${symbol}`, TTL.FINANCIALS);
    return data?.historical || [];
  },
};
