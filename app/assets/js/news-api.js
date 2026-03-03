/**
 * News API Service
 * Top headlines, everything search, and source discovery.
 *
 * Free-tier: 100 requests/day, 24-hour delay, CORS only on localhost.
 * For production, proxy through backend or use FMP/AlphaVantage news instead.
 */
(function (global) {
  'use strict';

  function cfg() {
    return (global.API_CONFIG && global.API_CONFIG.newsApi) || {};
  }

  function buildUrl(endpoint, params) {
    const { base, key } = cfg();
    if (!base || !key) return null;
    const qs = new URLSearchParams({ ...params, apiKey: key });
    return `${base}${endpoint}?${qs}`;
  }

  async function fetchJson(endpoint, params, cacheKey, ttl) {
    const url = buildUrl(endpoint, params);
    if (!url) return null;
    const fetcher = async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);
      return res.json();
    };
    if (global.ApiCache) {
      return global.ApiCache.get(cacheKey, fetcher, ttl);
    }
    try { return await fetcher(); }
    catch (e) { console.warn('NewsAPI fetch failed:', e); return null; }
  }

  const TTL = {
    HEADLINES: 900,
    EVERYTHING: 900,
    SOURCES: 86400
  };

  function normalizeArticles(data) {
    if (!data || data.status !== 'ok' || !data.articles) return [];
    return data.articles
      .filter(a => a.title && a.title !== '[Removed]')
      .map(a => ({
        title: a.title,
        description: a.description,
        url: a.url,
        urlToImage: a.urlToImage,
        publishedAt: a.publishedAt,
        source: a.source ? a.source.name : 'Unknown',
        author: a.author,
        content: a.content
      }));
  }

  const NewsApiService = {
    /**
     * Top headlines filtered by country and/or category.
     * category: business, entertainment, general, health, science, sports, technology
     */
    async getTopHeadlines(opts = {}) {
      const params = {
        country: opts.country || 'us',
        pageSize: opts.pageSize || 20
      };
      if (opts.category) params.category = opts.category;
      if (opts.q) params.q = opts.q;
      const cacheKey = `news:headlines:${params.country}:${params.category || ''}:${params.q || ''}`;
      const data = await fetchJson('/top-headlines', params, cacheKey, TTL.HEADLINES);
      return normalizeArticles(data);
    },

    /**
     * Business / finance headlines (convenience wrapper).
     */
    async getBusinessNews(pageSize = 15) {
      return this.getTopHeadlines({ category: 'business', pageSize });
    },

    /**
     * Search all articles by keyword, domain, date range, etc.
     */
    async searchEverything(opts = {}) {
      if (!opts.q && !opts.domains) return [];
      const params = {
        sortBy: opts.sortBy || 'publishedAt',
        pageSize: opts.pageSize || 20,
        language: opts.language || 'en'
      };
      if (opts.q) params.q = opts.q;
      if (opts.domains) params.domains = opts.domains;
      if (opts.from) params.from = opts.from;
      if (opts.to) params.to = opts.to;
      const cacheKey = `news:everything:${params.q || ''}:${params.domains || ''}`;
      const data = await fetchJson('/everything', params, cacheKey, TTL.EVERYTHING);
      return normalizeArticles(data);
    },

    /**
     * Search for stock/market-related news by ticker or company name.
     */
    async getStockNews(query, pageSize = 10) {
      return this.searchEverything({
        q: query + ' stock OR shares OR market',
        pageSize
      });
    },

    /**
     * List available news sources, optionally filtered by category.
     */
    async getSources(category) {
      const params = { language: 'en' };
      if (category) params.category = category;
      const data = await fetchJson('/top-headlines/sources', params, `news:sources:${category || 'all'}`, TTL.SOURCES);
      return data && data.sources ? data.sources : [];
    }
  };

  global.NewsApiService = NewsApiService;
})(typeof window !== 'undefined' ? window : this);
