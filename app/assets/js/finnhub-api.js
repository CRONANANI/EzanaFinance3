/**
 * Finnhub API - Frontend service to fetch stock data via our backend proxy.
 * Backend stores FINNHUB_API_KEY in .env and proxies requests to Finnhub.
 * Use /api when served from FastAPI (localhost:8000); configurable for other hosts.
 */
(function (global) {
  'use strict';

  function getApiBase() {
    return window.EZANA_API_BASE || (window.location.port === '8000' ? '' : '');
  }

  async function fetchJson(url, opts = {}) {
    const base = getApiBase();
    const fullUrl = base + url;
    try {
      const res = await fetch(fullUrl, { ...opts, headers: { Accept: 'application/json', ...opts.headers } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (e) {
      console.warn('Finnhub API fetch failed:', url, e);
      return null;
    }
  }

  const FinnhubAPI = {
    /** Get real-time quote for one symbol. Returns { c, d, dp, h, l, o, pc, t } or null. */
    async getQuote(symbol) {
      const data = await fetchJson(`/api/finnhub/quote?symbol=${encodeURIComponent(symbol)}`);
      return data;
    },

    /** Get quotes for multiple symbols (comma-separated). Returns { quotes: [{ symbol, c, d, ... }, ...] }. */
    async getQuotes(symbols) {
      const list = Array.isArray(symbols) ? symbols.join(',') : symbols;
      const data = await fetchJson(`/api/finnhub/quotes?symbols=${encodeURIComponent(list)}`);
      return data;
    },

    /** Get company profile (name, industry, etc.). */
    async getCompanyProfile(symbol) {
      return fetchJson(`/api/finnhub/company-profile?symbol=${encodeURIComponent(symbol)}`);
    },

    /** Get market news. */
    async getMarketNews(category = 'general') {
      return fetchJson(`/api/finnhub/market-news?category=${encodeURIComponent(category)}`);
    },

    /** Get company-specific news. */
    async getCompanyNews(symbol) {
      return fetchJson(`/api/finnhub/company-news?symbol=${encodeURIComponent(symbol)}`);
    }
  };

  global.FinnhubAPI = FinnhubAPI;
})(typeof window !== 'undefined' ? window : this);
