/**
 * Alpha Vantage API Service
 * Provides real-time quotes, historical price data, technical indicators,
 * market movers, and news sentiment.
 *
 * Free-tier: ~25 requests/day (standard) or 5/min with premium key.
 * Cache aggressively to stay within limits.
 */
(function (global) {
  'use strict';

  function cfg() {
    return (global.API_CONFIG && global.API_CONFIG.alphaVantage) || {};
  }

  function buildUrl(params) {
    const { base, key } = cfg();
    if (!base || !key) return null;
    const qs = new URLSearchParams({ ...params, apikey: key });
    return `${base}?${qs}`;
  }

  async function fetchJson(params, cacheKey, ttl) {
    const url = buildUrl(params);
    if (!url) return null;
    if (global.ApiCache) {
      return global.ApiCache.get(cacheKey, async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`AV HTTP ${res.status}`);
        const data = await res.json();
        if (data['Note'] || data['Information']) {
          console.warn('Alpha Vantage rate limit hit:', data['Note'] || data['Information']);
          return null;
        }
        return data;
      }, ttl);
    }
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data['Note'] || data['Information']) return null;
      return data;
    } catch (e) {
      console.warn('AlphaVantage fetch failed:', e);
      return null;
    }
  }

  const TTL = {
    QUOTE: 120,
    DAILY: 3600,
    INTRADAY: 300,
    INDICATOR: 3600,
    NEWS: 900,
    MOVERS: 600,
    OVERVIEW: 86400,
    SEARCH: 86400
  };

  const AlphaVantageAPI = {
    /**
     * Real-time quote for a single symbol.
     * Returns { symbol, open, high, low, price, volume, latestTradingDay, previousClose, change, changePercent }
     */
    async getGlobalQuote(symbol) {
      const data = await fetchJson(
        { function: 'GLOBAL_QUOTE', symbol },
        `av:quote:${symbol}`,
        TTL.QUOTE
      );
      if (!data || !data['Global Quote']) return null;
      const q = data['Global Quote'];
      return {
        symbol: q['01. symbol'],
        open: parseFloat(q['02. open']),
        high: parseFloat(q['03. high']),
        low: parseFloat(q['04. low']),
        price: parseFloat(q['05. price']),
        volume: parseInt(q['06. volume'], 10),
        latestTradingDay: q['07. latest trading day'],
        previousClose: parseFloat(q['08. previous close']),
        change: parseFloat(q['09. change']),
        changePercent: parseFloat(q['10. change percent'])
      };
    },

    /**
     * Daily adjusted time series (up to 20 years).
     * Returns array of { date, open, high, low, close, adjustedClose, volume }
     */
    async getDailyTimeSeries(symbol, outputsize = 'compact') {
      const data = await fetchJson(
        { function: 'TIME_SERIES_DAILY_ADJUSTED', symbol, outputsize },
        `av:daily:${symbol}:${outputsize}`,
        TTL.DAILY
      );
      const ts = data && data['Time Series (Daily)'];
      if (!ts) return [];
      return Object.entries(ts).map(([date, v]) => ({
        date,
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        adjustedClose: parseFloat(v['5. adjusted close']),
        volume: parseInt(v['6. volume'], 10)
      })).sort((a, b) => a.date.localeCompare(b.date));
    },

    /**
     * Intraday time series (1min, 5min, 15min, 30min, 60min).
     * Returns array of { datetime, open, high, low, close, volume }
     */
    async getIntraday(symbol, interval = '5min') {
      const data = await fetchJson(
        { function: 'TIME_SERIES_INTRADAY', symbol, interval, outputsize: 'compact' },
        `av:intraday:${symbol}:${interval}`,
        TTL.INTRADAY
      );
      const key = `Time Series (${interval})`;
      const ts = data && data[key];
      if (!ts) return [];
      return Object.entries(ts).map(([datetime, v]) => ({
        datetime,
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        volume: parseInt(v['5. volume'], 10)
      })).sort((a, b) => a.datetime.localeCompare(b.datetime));
    },

    /**
     * Technical indicator (SMA, EMA, RSI, BBANDS, MACD, etc.)
     * Returns array of { date, value } (or { date, ...bands } for multi-output indicators).
     */
    async getIndicator(symbol, indicator, params = {}) {
      const defaults = { interval: 'daily', time_period: 20, series_type: 'close' };
      const merged = { function: indicator, symbol, ...defaults, ...params };
      const cacheKey = `av:ind:${indicator}:${symbol}:${JSON.stringify(params)}`;
      const data = await fetchJson(merged, cacheKey, TTL.INDICATOR);
      if (!data) return [];
      const taKey = Object.keys(data).find(k => k.startsWith('Technical Analysis'));
      if (!taKey) return [];
      return Object.entries(data[taKey]).map(([date, v]) => {
        const values = {};
        Object.entries(v).forEach(([k, val]) => { values[k] = parseFloat(val); });
        return { date, ...values };
      }).sort((a, b) => a.date.localeCompare(b.date));
    },

    async getSMA(symbol, timePeriod = 20) {
      return this.getIndicator(symbol, 'SMA', { time_period: timePeriod });
    },

    async getEMA(symbol, timePeriod = 20) {
      return this.getIndicator(symbol, 'EMA', { time_period: timePeriod });
    },

    async getRSI(symbol, timePeriod = 14) {
      return this.getIndicator(symbol, 'RSI', { time_period: timePeriod });
    },

    async getBBands(symbol, timePeriod = 20) {
      return this.getIndicator(symbol, 'BBANDS', { time_period: timePeriod });
    },

    async getMACD(symbol) {
      return this.getIndicator(symbol, 'MACD', { series_type: 'close' });
    },

    /**
     * Top gainers, losers, and most active tickers.
     * Returns { top_gainers: [], top_losers: [], most_actively_traded: [] }
     */
    async getTopMovers() {
      const data = await fetchJson(
        { function: 'TOP_GAINERS_LOSERS' },
        'av:movers',
        TTL.MOVERS
      );
      if (!data) return { top_gainers: [], top_losers: [], most_actively_traded: [] };
      return {
        top_gainers: (data.top_gainers || []).map(t => ({
          ticker: t.ticker,
          price: parseFloat(t.price),
          changeAmount: parseFloat(t.change_amount),
          changePercent: parseFloat(t.change_percentage),
          volume: parseInt(t.volume, 10)
        })),
        top_losers: (data.top_losers || []).map(t => ({
          ticker: t.ticker,
          price: parseFloat(t.price),
          changeAmount: parseFloat(t.change_amount),
          changePercent: parseFloat(t.change_percentage),
          volume: parseInt(t.volume, 10)
        })),
        most_actively_traded: (data.most_actively_traded || []).map(t => ({
          ticker: t.ticker,
          price: parseFloat(t.price),
          changeAmount: parseFloat(t.change_amount),
          changePercent: parseFloat(t.change_percentage),
          volume: parseInt(t.volume, 10)
        }))
      };
    },

    /**
     * News & sentiment for specific tickers or topics.
     * Returns array of { title, url, summary, source, publishedAt, sentiment, tickers }
     */
    async getNewsSentiment(tickers, topics) {
      const params = { function: 'NEWS_SENTIMENT' };
      if (tickers) params.tickers = Array.isArray(tickers) ? tickers.join(',') : tickers;
      if (topics) params.topics = Array.isArray(topics) ? topics.join(',') : topics;
      const cacheKey = `av:news:${params.tickers || 'all'}:${params.topics || ''}`;
      const data = await fetchJson(params, cacheKey, TTL.NEWS);
      if (!data || !data.feed) return [];
      return data.feed.slice(0, 20).map(item => ({
        title: item.title,
        url: item.url,
        summary: item.summary,
        source: item.source,
        publishedAt: item.time_published,
        bannerImage: item.banner_image,
        overallSentiment: item.overall_sentiment_label,
        sentimentScore: parseFloat(item.overall_sentiment_score),
        tickers: (item.ticker_sentiment || []).map(t => ({
          ticker: t.ticker,
          relevance: parseFloat(t.relevance_score),
          sentiment: t.ticker_sentiment_label,
          score: parseFloat(t.ticker_sentiment_score)
        }))
      }));
    },

    /**
     * Company overview / fundamentals.
     */
    async getCompanyOverview(symbol) {
      const data = await fetchJson(
        { function: 'OVERVIEW', symbol },
        `av:overview:${symbol}`,
        TTL.OVERVIEW
      );
      if (!data || !data.Symbol) return null;
      return data;
    },

    /**
     * Symbol search / autocomplete.
     */
    async searchSymbol(keywords) {
      const data = await fetchJson(
        { function: 'SYMBOL_SEARCH', keywords },
        `av:search:${keywords}`,
        TTL.SEARCH
      );
      if (!data || !data.bestMatches) return [];
      return data.bestMatches.map(m => ({
        symbol: m['1. symbol'],
        name: m['2. name'],
        type: m['3. type'],
        region: m['4. region'],
        currency: m['8. currency']
      }));
    }
  };

  global.AlphaVantageAPI = AlphaVantageAPI;
})(typeof window !== 'undefined' ? window : this);
