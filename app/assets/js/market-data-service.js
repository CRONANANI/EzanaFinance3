/**
 * Unified Market Data Service
 * Orchestrates Alpha Vantage, FMP, News API, and Finnhub into a single
 * interface that UI pages consume. Falls back gracefully when a provider
 * is unavailable or rate-limited.
 */
(function (global) {
  'use strict';

  const av  = () => global.AlphaVantageAPI;
  const fmp = () => global.FmpAPI;
  const news = () => global.NewsApiService;
  const fh  = () => global.FinnhubAPI;

  const MarketDataService = {

    /* ──────────────── Quotes ──────────────── */

    async getQuote(symbol) {
      const s = symbol.toUpperCase();
      try {
        const q = fmp() && await fmp().getQuote(s);
        if (q && q.price != null) return {
          symbol: q.symbol, price: q.price, change: q.change,
          changePercent: q.changesPercentage, dayHigh: q.dayHigh,
          dayLow: q.dayLow, open: q.open, previousClose: q.previousClose,
          volume: q.volume, marketCap: q.marketCap, name: q.name,
          exchange: q.exchange, source: 'fmp'
        };
      } catch (_) {}
      try {
        const q = av() && await av().getGlobalQuote(s);
        if (q && q.price != null) return {
          symbol: q.symbol, price: q.price, change: q.change,
          changePercent: q.changePercent, dayHigh: q.high,
          dayLow: q.low, open: q.open, previousClose: q.previousClose,
          volume: q.volume, source: 'alphavantage'
        };
      } catch (_) {}
      try {
        const q = fh() && await fh().getQuote(s);
        if (q && q.c != null) return {
          symbol: s, price: q.c, change: q.d, changePercent: q.dp,
          dayHigh: q.h, dayLow: q.l, open: q.o, previousClose: q.pc,
          source: 'finnhub'
        };
      } catch (_) {}
      return null;
    },

    async getBatchQuotes(symbols) {
      const list = symbols.map(s => s.toUpperCase());
      try {
        if (fmp()) {
          const quotes = await fmp().getBatchQuote(list);
          if (quotes && quotes.length) return quotes.map(q => ({
            symbol: q.symbol, price: q.price, change: q.change,
            changePercent: q.changesPercentage, dayHigh: q.dayHigh,
            dayLow: q.dayLow, volume: q.volume, marketCap: q.marketCap,
            name: q.name, source: 'fmp'
          }));
        }
      } catch (_) {}
      const results = [];
      for (const s of list) {
        const q = await this.getQuote(s);
        if (q) results.push(q);
      }
      return results;
    },

    /* ──────────────── Historical / Charts ──────────────── */

    async getChartData(symbol, range) {
      range = range || '3M';
      const s = symbol.toUpperCase();

      if (range === '1D') {
        try {
          const pts = av() && await av().getIntraday(s, '5min');
          if (pts && pts.length) return {
            labels: pts.map(p => new Date(p.datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })),
            prices: pts.map(p => p.close)
          };
        } catch (_) {}
      }

      try {
        const daily = av() && await av().getDailyTimeSeries(s, range === '5Y' ? 'full' : 'compact');
        if (daily && daily.length) {
          const sliced = sliceByRange(daily, range);
          return { labels: sliced.map(p => p.date), prices: sliced.map(p => p.adjustedClose || p.close) };
        }
      } catch (_) {}

      try {
        const hist = fmp() && await fmp().getHistoricalPrice(s);
        if (hist && hist.length) {
          const sorted = hist.sort((a, b) => a.date.localeCompare(b.date));
          const sliced = sliceByRange(sorted, range);
          return { labels: sliced.map(p => p.date), prices: sliced.map(p => p.close) };
        }
      } catch (_) {}
      return null;
    },

    /* ──────────────── Company Fundamentals ──────────────── */

    async getCompanyProfile(symbol) {
      const s = symbol.toUpperCase();
      var profile = null, overview = null;
      try { profile = fmp() && await fmp().getCompanyProfile(s); } catch (_) {}
      try { overview = av() && await av().getCompanyOverview(s); } catch (_) {}
      if (!profile && !overview) {
        try {
          const fhp = fh() && await fh().getCompanyProfile(s);
          if (fhp) return { symbol: s, name: fhp.name || s, sector: fhp.finnhubIndustry || '', industry: fhp.finnhubIndustry || '', marketCap: fhp.marketCapitalization || 0, source: 'finnhub' };
        } catch (_) {}
        return null;
      }
      return {
        symbol: s,
        name: (profile && profile.companyName) || (overview && overview.Name) || s,
        description: (profile && profile.description) || (overview && overview.Description) || '',
        sector: (profile && profile.sector) || (overview && overview.Sector) || '',
        industry: (profile && profile.industry) || (overview && overview.Industry) || '',
        ceo: (profile && profile.ceo) || '',
        website: (profile && profile.website) || '',
        exchange: (profile && profile.exchangeShortName) || (overview && overview.Exchange) || '',
        marketCap: (profile && profile.mktCap) || (overview && parseFloat(overview.MarketCapitalization)) || 0,
        beta: (profile && profile.beta) || (overview && parseFloat(overview.Beta)) || 0,
        price: (profile && profile.price) || 0,
        changes: (profile && profile.changes) || 0,
        image: (profile && profile.image) || '',
        ipoDate: (profile && profile.ipoDate) || '',
        employees: (profile && profile.fullTimeEmployees) || (overview && overview.FullTimeEmployees) || '',
        pe: (overview && parseFloat(overview.PERatio)) || 0,
        eps: (overview && parseFloat(overview.EPS)) || 0,
        dividendYield: (overview && parseFloat(overview.DividendYield)) || (profile && profile.lastDiv) || 0,
        high52: (overview && parseFloat(overview['52WeekHigh'])) || 0,
        low52: (overview && parseFloat(overview['52WeekLow'])) || 0,
        source: profile ? 'fmp' : 'alphavantage'
      };
    },

    async getFinancials(symbol) {
      const s = symbol.toUpperCase();
      if (!fmp()) return null;
      const results = await Promise.all([
        fmp().getIncomeStatement(s),
        fmp().getBalanceSheet(s),
        fmp().getCashFlow(s),
        fmp().getKeyMetrics(s),
        fmp().getFinancialRatios(s)
      ]);
      return { income: results[0], balance: results[1], cashflow: results[2], metrics: results[3], ratios: results[4] };
    },

    async getDCFValuation(symbol) {
      if (!fmp()) return null;
      return fmp().getDCF(symbol.toUpperCase());
    },

    async getAnalystData(symbol) {
      const s = symbol.toUpperCase();
      if (!fmp()) return null;
      const results = await Promise.all([
        fmp().getAnalystEstimates(s),
        fmp().getRating(s),
        fmp().getPriceTarget(s)
      ]);
      return { estimates: results[0], rating: results[1], priceTarget: results[2] };
    },

    async getPeers(symbol) {
      if (!fmp()) return [];
      return fmp().getStockPeers(symbol.toUpperCase());
    },

    /* ──────────────── Market Movers ──────────────── */

    async getMarketMovers() {
      try {
        if (fmp()) {
          const results = await Promise.all([fmp().getGainers(), fmp().getLosers(), fmp().getMostActive()]);
          if (results[0] || results[1] || results[2]) return {
            gainers: (results[0] || []).slice(0, 10),
            losers: (results[1] || []).slice(0, 10),
            actives: (results[2] || []).slice(0, 10),
            source: 'fmp'
          };
        }
      } catch (_) {}
      try {
        if (av()) {
          const movers = await av().getTopMovers();
          return { gainers: movers.top_gainers.slice(0, 10), losers: movers.top_losers.slice(0, 10), actives: movers.most_actively_traded.slice(0, 10), source: 'alphavantage' };
        }
      } catch (_) {}
      return { gainers: [], losers: [], actives: [] };
    },

    /* ──────────────── News ──────────────── */

    async getMarketNews(limit) {
      limit = limit || 15;
      var articles = [];
      try {
        if (fmp()) {
          var fmpNews = await fmp().getStockNews(null, limit);
          if (fmpNews && fmpNews.length) fmpNews.forEach(function(a) {
            articles.push({ title: a.title, description: a.text, url: a.url, image: a.image, publishedAt: a.publishedDate, source: a.site || 'FMP', symbol: a.symbol, provider: 'fmp' });
          });
        }
      } catch (_) {}
      if (articles.length < 5) {
        try {
          var headlines = news() && await news().getBusinessNews(limit);
          if (headlines && headlines.length) headlines.forEach(function(a) {
            articles.push({ title: a.title, description: a.description, url: a.url, image: a.urlToImage, publishedAt: a.publishedAt, source: a.source, provider: 'newsapi' });
          });
        } catch (_) {}
      }
      articles.sort(function(a, b) { return new Date(b.publishedAt) - new Date(a.publishedAt); });
      return articles.slice(0, limit);
    },

    async getStockNews(symbols, limit) {
      limit = limit || 10;
      var tickers = Array.isArray(symbols) ? symbols : [symbols];
      var articles = [];
      try {
        if (fmp()) {
          var fn = await fmp().getStockNews(tickers, limit);
          if (fn) fn.forEach(function(a) {
            articles.push({ title: a.title, description: a.text, url: a.url, image: a.image, publishedAt: a.publishedDate, source: a.site || 'FMP', symbol: a.symbol, provider: 'fmp' });
          });
        }
      } catch (_) {}
      try {
        if (av()) {
          var an = await av().getNewsSentiment(tickers);
          if (an) an.forEach(function(a) {
            articles.push({ title: a.title, description: a.summary, url: a.url, image: a.bannerImage, publishedAt: a.publishedAt, source: a.source, sentiment: a.overallSentiment, sentimentScore: a.sentimentScore, provider: 'alphavantage' });
          });
        }
      } catch (_) {}
      articles.sort(function(a, b) { return new Date(b.publishedAt) - new Date(a.publishedAt); });
      return articles.slice(0, limit);
    },

    /* ──────────────── Technical Indicators ──────────────── */

    async getTechnicalIndicators(symbol) {
      if (!av()) return null;
      var s = symbol.toUpperCase();
      var results = await Promise.all([
        av().getSMA(s, 20), av().getSMA(s, 50), av().getEMA(s, 20), av().getRSI(s, 14), av().getBBands(s, 20)
      ]);
      return { sma20: results[0], sma50: results[1], ema20: results[2], rsi: results[3], bbands: results[4] };
    },

    /* ──────────────── Calendars ──────────────── */

    async getEarningsCalendar() {
      if (!fmp()) return [];
      var now = new Date();
      var from = now.toISOString().split('T')[0];
      var to = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
      return fmp().getEarningsCalendar(from, to);
    },

    async getDividendsCalendar() {
      if (!fmp()) return [];
      var now = new Date();
      var from = now.toISOString().split('T')[0];
      var to = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
      return fmp().getDividendsCalendar(from, to);
    },

    /* ──────────────── Congress & Insider ──────────────── */

    async getCongressTrading(limit) { if (!fmp()) return []; return fmp().getSenateDisclosures(limit || 30); },
    async getInsiderTrading(symbol, limit) { if (!fmp()) return []; return fmp().getInsiderTrading(symbol, limit || 30); },

    /* ──────────────── Search ──────────────── */

    async searchSymbol(query) {
      var results = [];
      try {
        if (fmp()) {
          var fr = await fmp().searchSymbol(query);
          if (fr) fr.forEach(function(r) { results.push({ symbol: r.symbol, name: r.name, exchange: r.stockExchange || r.exchangeShortName, source: 'fmp' }); });
        }
      } catch (_) {}
      if (results.length < 3) {
        try {
          if (av()) {
            var ar = await av().searchSymbol(query);
            if (ar) ar.forEach(function(r) {
              if (!results.find(function(x) { return x.symbol === r.symbol; })) {
                results.push({ symbol: r.symbol, name: r.name, exchange: r.region, source: 'alphavantage' });
              }
            });
          }
        } catch (_) {}
      }
      return results.slice(0, 15);
    }
  };

  function sliceByRange(data, range) {
    var days = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '5Y': 1825 }[range] || 90;
    var cutoff = new Date(Date.now() - days * 86400000);
    var cutStr = cutoff.toISOString().split('T')[0];
    return data.filter(function(p) { return p.date >= cutStr; });
  }

  global.MarketDataService = MarketDataService;
})(typeof window !== 'undefined' ? window : this);
