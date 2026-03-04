/**
 * Financial Modeling Prep (FMP) API Service
 * Company profiles, financial statements, DCF valuations, analyst data,
 * market movers, earnings calendar, congressional/insider trading, and news.
 *
 * Free-tier: 250 API calls/day, end-of-day data only, no intraday.
 */
(function (global) {
  'use strict';

  function cfg() {
    return (global.API_CONFIG && global.API_CONFIG.fmp) || {};
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
    if (global.ApiCache) {
      return global.ApiCache.get(cacheKey, fetcher, ttl);
    }
    try { return await fetcher(); }
    catch (e) { console.warn('FMP fetch failed:', e); return null; }
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
    SEARCH: 86400
  };

  const FmpAPI = {
    /* ─── Company Information ─── */

    async getCompanyProfile(symbol) {
      const data = await fetchJson(`/v3/profile/${symbol}`, {}, `fmp:profile:${symbol}`, TTL.PROFILE);
      return Array.isArray(data) && data.length ? data[0] : data;
    },

    async getStockPeers(symbol) {
      const data = await fetchJson(`/v4/stock_peers`, { symbol }, `fmp:peers:${symbol}`, TTL.PEERS);
      return Array.isArray(data) && data.length ? data[0].peersList || [] : [];
    },

    async getExecutives(symbol) {
      return fetchJson(`/v3/key-executives/${symbol}`, {}, `fmp:exec:${symbol}`, TTL.PROFILE);
    },

    /* ─── Stock Quotes ─── */

    async getQuote(symbol) {
      const data = await fetchJson(`/v3/quote/${symbol}`, {}, `fmp:quote:${symbol}`, TTL.QUOTE);
      return Array.isArray(data) && data.length ? data[0] : data;
    },

    async getBatchQuote(symbols) {
      const list = Array.isArray(symbols) ? symbols.join(',') : symbols;
      const data = await fetchJson(`/v3/quote/${list}`, {}, `fmp:batchquote:${list}`, TTL.QUOTE);
      return Array.isArray(data) ? data : [];
    },

    async getPriceChange(symbol) {
      const data = await fetchJson(`/v3/stock-price-change/${symbol}`, {}, `fmp:pricechange:${symbol}`, TTL.QUOTE);
      return Array.isArray(data) && data.length ? data[0] : null;
    },

    /* ─── Financial Statements ─── */

    async getIncomeStatement(symbol, period = 'annual', limit = 5) {
      return fetchJson(
        `/v3/income-statement/${symbol}`,
        { period, limit },
        `fmp:income:${symbol}:${period}:${limit}`,
        TTL.FINANCIALS
      );
    },

    async getBalanceSheet(symbol, period = 'annual', limit = 5) {
      return fetchJson(
        `/v3/balance-sheet-statement/${symbol}`,
        { period, limit },
        `fmp:balance:${symbol}:${period}:${limit}`,
        TTL.FINANCIALS
      );
    },

    async getCashFlow(symbol, period = 'annual', limit = 5) {
      return fetchJson(
        `/v3/cash-flow-statement/${symbol}`,
        { period, limit },
        `fmp:cashflow:${symbol}:${period}:${limit}`,
        TTL.FINANCIALS
      );
    },

    /* ─── Key Metrics & Ratios ─── */

    async getKeyMetrics(symbol, period = 'annual', limit = 5) {
      return fetchJson(
        `/v3/key-metrics/${symbol}`,
        { period, limit },
        `fmp:metrics:${symbol}:${period}:${limit}`,
        TTL.METRICS
      );
    },

    async getFinancialRatios(symbol, period = 'annual', limit = 5) {
      return fetchJson(
        `/v3/ratios/${symbol}`,
        { period, limit },
        `fmp:ratios:${symbol}:${period}:${limit}`,
        TTL.METRICS
      );
    },

    /* ─── Valuations ─── */

    async getDCF(symbol) {
      const data = await fetchJson(`/v3/discounted-cash-flow/${symbol}`, {}, `fmp:dcf:${symbol}`, TTL.DCF);
      return Array.isArray(data) && data.length ? data[0] : data;
    },

    /**
     * Custom DCF Advanced API - accepts detailed parameters for tailored valuation.
     * Params: symbol, revenueGrowthPct, ebitdaPct, depreciationAndAmortizationPct, etc.
     * Returns equity value per share (stock price).
     */
    async getCustomDCF(params) {
      const { base, key } = cfg();
      if (!base || !key) return null;
      const qs = new URLSearchParams({ apikey: key, ...params });
      const url = `https://financialmodelingprep.com/stable/custom-discounted-cash-flow?${qs}`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`FMP Custom DCF HTTP ${res.status}`);
        return res.json();
      } catch (e) {
        console.warn('FMP Custom DCF fetch failed:', e);
        return null;
      }
    },

    /* ─── Analyst Data ─── */

    async getAnalystEstimates(symbol, period = 'annual', limit = 4) {
      return fetchJson(
        `/v3/analyst-estimates/${symbol}`,
        { period, limit },
        `fmp:estimates:${symbol}:${period}`,
        TTL.ANALYST
      );
    },

    async getRating(symbol) {
      const data = await fetchJson(`/v3/rating/${symbol}`, {}, `fmp:rating:${symbol}`, TTL.ANALYST);
      return Array.isArray(data) && data.length ? data[0] : null;
    },

    async getPriceTarget(symbol) {
      return fetchJson(`/v4/price-target-summary`, { symbol }, `fmp:pricetarget:${symbol}`, TTL.ANALYST);
    },

    /* ─── Market Movers ─── */

    async getGainers() {
      return fetchJson('/v3/stock_market/gainers', {}, 'fmp:gainers', TTL.MOVERS);
    },

    async getLosers() {
      return fetchJson('/v3/stock_market/losers', {}, 'fmp:losers', TTL.MOVERS);
    },

    async getMostActive() {
      return fetchJson('/v3/stock_market/actives', {}, 'fmp:actives', TTL.MOVERS);
    },

    /* ─── Earnings & Events Calendar ─── */

    async getEarningsCalendar(from, to) {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      return fetchJson('/v3/earning_calendar', params, `fmp:earnings:${from || ''}:${to || ''}`, TTL.CALENDAR);
    },

    async getDividendsCalendar(from, to) {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      return fetchJson('/v3/stock_dividend_calendar', params, `fmp:divcal:${from || ''}:${to || ''}`, TTL.CALENDAR);
    },

    /* ─── Congress & Insider Trading ─── */

    async getSenateDisclosures(limit = 50) {
      return fetchJson('/v4/senate-disclosure', { limit }, `fmp:senate:${limit}`, TTL.CONGRESS);
    },

    async getHouseDisclosures(limit = 50) {
      return fetchJson('/v4/senate-disclosure-rss', { limit }, `fmp:house:${limit}`, TTL.CONGRESS);
    },

    async getInsiderTrading(symbol, limit = 50) {
      const params = { limit };
      if (symbol) params.symbol = symbol;
      return fetchJson('/v4/insider-trading', params, `fmp:insider:${symbol || 'all'}:${limit}`, TTL.INSIDER);
    },

    /* ─── News ─── */

    async getStockNews(tickers, limit = 20) {
      const params = { limit };
      if (tickers) params.tickers = Array.isArray(tickers) ? tickers.join(',') : tickers;
      return fetchJson('/v3/stock_news', params, `fmp:stocknews:${params.tickers || 'all'}:${limit}`, TTL.NEWS);
    },

    async getGeneralNews(limit = 20) {
      return fetchJson('/v4/general_news', { limit }, `fmp:generalnews:${limit}`, TTL.NEWS);
    },

    async getPressReleases(symbol, limit = 10) {
      return fetchJson(`/v3/press-releases/${symbol}`, { limit }, `fmp:press:${symbol}:${limit}`, TTL.NEWS);
    },

    /* ─── Search & Screener ─── */

    async searchSymbol(query, limit = 10) {
      return fetchJson('/v3/search', { query, limit }, `fmp:search:${query}`, TTL.SEARCH);
    },

    async screenStocks(params = {}) {
      return fetchJson('/v3/stock-screener', params, `fmp:screen:${JSON.stringify(params)}`, TTL.SCREENER);
    },

    /* ─── Historical Chart (end-of-day) ─── */

    async getHistoricalChart(symbol, range = '1month') {
      return fetchJson(
        `/v3/historical-chart/4hour/${symbol}`,
        {},
        `fmp:chart:${symbol}:${range}`,
        TTL.FINANCIALS
      );
    },

    async getHistoricalPrice(symbol) {
      const data = await fetchJson(
        `/v3/historical-price-full/${symbol}`,
        { serietype: 'line' },
        `fmp:histprice:${symbol}`,
        TTL.FINANCIALS
      );
      return data && data.historical ? data.historical : [];
    }
  };

  global.FmpAPI = FmpAPI;
})(typeof window !== 'undefined' ? window : this);
