import { Router } from "express";
import { optionalAuth } from "../middleware/auth.middleware";
import alphaVantageService from "../services/alphavantage.service";
import fmpService from "../services/fmp.service";
import newsApiService from "../services/newsapi.service";
import fredService from "../services/fred.service";
import cache from "../services/cache.service";

const router = Router();
router.use(optionalAuth);

/* ─────────────── Alpha Vantage ─────────────── */

router.get("/av/quote/:symbol", async (req, res) => {
  try {
    const data = await cache.getOrFetch(
      `av:quote:${req.params.symbol}`,
      () => alphaVantageService.getGlobalQuote(req.params.symbol.toUpperCase()),
      60
    );
    res.json(data);
  } catch (error) {
    console.error("AV quote error:", error);
    res.status(500).json({ error: "Failed to get quote" });
  }
});

router.get("/av/daily/:symbol", async (req, res) => {
  try {
    const outputsize = (req.query.outputsize as string) || "compact";
    const data = await cache.getOrFetch(
      `av:daily:${req.params.symbol}:${outputsize}`,
      () => alphaVantageService.getDailyTimeSeries(req.params.symbol.toUpperCase(), outputsize),
      3600
    );
    res.json(data);
  } catch (error) {
    console.error("AV daily error:", error);
    res.status(500).json({ error: "Failed to get daily data" });
  }
});

router.get("/av/intraday/:symbol", async (req, res) => {
  try {
    const interval = (req.query.interval as string) || "5min";
    const data = await cache.getOrFetch(
      `av:intraday:${req.params.symbol}:${interval}`,
      () => alphaVantageService.getIntraday(req.params.symbol.toUpperCase(), interval),
      300
    );
    res.json(data);
  } catch (error) {
    console.error("AV intraday error:", error);
    res.status(500).json({ error: "Failed to get intraday data" });
  }
});

router.get("/av/overview/:symbol", async (req, res) => {
  try {
    const data = await cache.getOrFetch(
      `av:overview:${req.params.symbol}`,
      () => alphaVantageService.getCompanyOverview(req.params.symbol.toUpperCase()),
      86400
    );
    res.json(data);
  } catch (error) {
    console.error("AV overview error:", error);
    res.status(500).json({ error: "Failed to get company overview" });
  }
});

router.get("/av/movers", async (_req, res) => {
  try {
    const data = await cache.getOrFetch("av:movers", () => alphaVantageService.getTopMovers(), 600);
    res.json(data);
  } catch (error) {
    console.error("AV movers error:", error);
    res.status(500).json({ error: "Failed to get market movers" });
  }
});

router.get("/av/news", async (req, res) => {
  try {
    const tickers = req.query.tickers as string;
    const topics = req.query.topics as string;
    const data = await cache.getOrFetch(
      `av:news:${tickers || ""}:${topics || ""}`,
      () => alphaVantageService.getNewsSentiment(tickers, topics),
      900
    );
    res.json(data);
  } catch (error) {
    console.error("AV news error:", error);
    res.status(500).json({ error: "Failed to get news sentiment" });
  }
});

router.get("/av/indicator/:symbol/:indicator", async (req, res) => {
  try {
    const { symbol, indicator } = req.params;
    const timePeriod = parseInt(req.query.time_period as string, 10) || 20;
    const data = await cache.getOrFetch(
      `av:ind:${indicator}:${symbol}:${timePeriod}`,
      () => alphaVantageService.getIndicator(symbol.toUpperCase(), indicator.toUpperCase(), { time_period: timePeriod }),
      3600
    );
    res.json(data);
  } catch (error) {
    console.error("AV indicator error:", error);
    res.status(500).json({ error: "Failed to get indicator" });
  }
});

router.get("/av/search", async (req, res) => {
  try {
    const keywords = req.query.q as string;
    if (!keywords) { res.status(400).json({ error: "q parameter required" }); return; }
    const data = await alphaVantageService.searchSymbol(keywords);
    res.json(data);
  } catch (error) {
    console.error("AV search error:", error);
    res.status(500).json({ error: "Failed to search" });
  }
});

/* ─────────────── Financial Modeling Prep ─────────────── */

router.get("/fmp/profile/:symbol", async (req, res) => {
  try {
    const data = await cache.getOrFetch(
      `fmp:profile:${req.params.symbol}`,
      () => fmpService.getProfile(req.params.symbol.toUpperCase()),
      86400
    );
    res.json(data);
  } catch (error) {
    console.error("FMP profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

router.get("/fmp/quote/:symbol", async (req, res) => {
  try {
    const data = await cache.getOrFetch(
      `fmp:quote:${req.params.symbol}`,
      () => fmpService.getQuote(req.params.symbol.toUpperCase()),
      120
    );
    res.json(data);
  } catch (error) {
    console.error("FMP quote error:", error);
    res.status(500).json({ error: "Failed to get quote" });
  }
});

router.post("/fmp/quotes", async (req, res) => {
  try {
    const { symbols } = req.body;
    if (!Array.isArray(symbols)) { res.status(400).json({ error: "symbols array required" }); return; }
    const data = await fmpService.getBatchQuote(symbols.map((s: string) => s.toUpperCase()));
    res.json(data);
  } catch (error) {
    console.error("FMP batch quote error:", error);
    res.status(500).json({ error: "Failed to get quotes" });
  }
});

router.get("/fmp/financials/:symbol", async (req, res) => {
  try {
    const s = req.params.symbol.toUpperCase();
    const period = (req.query.period as string) || "annual";
    const [income, balance, cashflow, metrics, ratios] = await Promise.all([
      cache.getOrFetch(`fmp:income:${s}:${period}`, () => fmpService.getIncomeStatement(s, period), 86400),
      cache.getOrFetch(`fmp:balance:${s}:${period}`, () => fmpService.getBalanceSheet(s, period), 86400),
      cache.getOrFetch(`fmp:cashflow:${s}:${period}`, () => fmpService.getCashFlow(s, period), 86400),
      cache.getOrFetch(`fmp:metrics:${s}:${period}`, () => fmpService.getKeyMetrics(s, period), 86400),
      cache.getOrFetch(`fmp:ratios:${s}:${period}`, () => fmpService.getFinancialRatios(s, period), 86400),
    ]);
    res.json({ income, balance, cashflow, metrics, ratios });
  } catch (error) {
    console.error("FMP financials error:", error);
    res.status(500).json({ error: "Failed to get financials" });
  }
});

router.get("/fmp/dcf/:symbol", async (req, res) => {
  try {
    const data = await cache.getOrFetch(
      `fmp:dcf:${req.params.symbol}`,
      () => fmpService.getDCF(req.params.symbol.toUpperCase()),
      3600
    );
    res.json(data);
  } catch (error) {
    console.error("FMP DCF error:", error);
    res.status(500).json({ error: "Failed to get DCF" });
  }
});

router.get("/fmp/analyst/:symbol", async (req, res) => {
  try {
    const s = req.params.symbol.toUpperCase();
    const [estimates, rating, priceTarget] = await Promise.all([
      fmpService.getAnalystEstimates(s),
      fmpService.getRating(s),
      fmpService.getPriceTarget(s),
    ]);
    res.json({ estimates, rating, priceTarget });
  } catch (error) {
    console.error("FMP analyst error:", error);
    res.status(500).json({ error: "Failed to get analyst data" });
  }
});

router.get("/fmp/peers/:symbol", async (req, res) => {
  try {
    const data = await fmpService.getStockPeers(req.params.symbol.toUpperCase());
    res.json(data);
  } catch (error) {
    console.error("FMP peers error:", error);
    res.status(500).json({ error: "Failed to get peers" });
  }
});

router.get("/fmp/movers", async (_req, res) => {
  try {
    const [gainers, losers, actives] = await Promise.all([
      cache.getOrFetch("fmp:gainers", () => fmpService.getGainers(), 600),
      cache.getOrFetch("fmp:losers", () => fmpService.getLosers(), 600),
      cache.getOrFetch("fmp:actives", () => fmpService.getMostActive(), 600),
    ]);
    res.json({ gainers, losers, actives });
  } catch (error) {
    console.error("FMP movers error:", error);
    res.status(500).json({ error: "Failed to get market movers" });
  }
});

router.get("/fmp/earnings-calendar", async (req, res) => {
  try {
    const data = await cache.getOrFetch("fmp:earnings", () => fmpService.getEarningsCalendar(
      req.query.from as string, req.query.to as string
    ), 3600);
    res.json(data);
  } catch (error) {
    console.error("FMP earnings error:", error);
    res.status(500).json({ error: "Failed to get earnings calendar" });
  }
});

router.get("/fmp/insider/:symbol?", async (req, res) => {
  try {
    const data = await fmpService.getInsiderTrading(
      req.params.symbol?.toUpperCase(),
      parseInt(req.query.limit as string, 10) || 50
    );
    res.json(data);
  } catch (error) {
    console.error("FMP insider error:", error);
    res.status(500).json({ error: "Failed to get insider trading" });
  }
});

router.get("/fmp/senate", async (req, res) => {
  try {
    const data = await cache.getOrFetch("fmp:senate", () => fmpService.getSenateDisclosures(
      parseInt(req.query.limit as string, 10) || 50
    ), 1800);
    res.json(data);
  } catch (error) {
    console.error("FMP senate error:", error);
    res.status(500).json({ error: "Failed to get senate disclosures" });
  }
});

router.get("/fmp/news", async (req, res) => {
  try {
    const tickers = req.query.tickers as string;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const data = tickers
      ? await fmpService.getStockNews(tickers, limit)
      : await fmpService.getGeneralNews(limit);
    res.json(data);
  } catch (error) {
    console.error("FMP news error:", error);
    res.status(500).json({ error: "Failed to get news" });
  }
});

router.get("/fmp/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) { res.status(400).json({ error: "q parameter required" }); return; }
    const data = await fmpService.searchSymbol(q);
    res.json(data);
  } catch (error) {
    console.error("FMP search error:", error);
    res.status(500).json({ error: "Failed to search" });
  }
});

router.get("/fmp/historical/:symbol", async (req, res) => {
  try {
    const data = await cache.getOrFetch(
      `fmp:hist:${req.params.symbol}`,
      () => fmpService.getHistoricalPrice(req.params.symbol.toUpperCase()),
      3600
    );
    res.json(data);
  } catch (error) {
    console.error("FMP historical error:", error);
    res.status(500).json({ error: "Failed to get historical data" });
  }
});

router.get("/fmp/screener", async (req, res) => {
  try {
    const params = { ...req.query } as Record<string, string | number>;
    delete params.apikey;
    const data = await fmpService.screenStocks(params);
    res.json(data);
  } catch (error) {
    console.error("FMP screener error:", error);
    res.status(500).json({ error: "Failed to screen stocks" });
  }
});

/* ─────────────── News API ─────────────── */

router.get("/news/headlines", async (req, res) => {
  try {
    const category = (req.query.category as string) || "business";
    const data = await cache.getOrFetch(
      `news:headlines:${category}`,
      () => newsApiService.getTopHeadlines({ category }),
      900
    );
    res.json(data);
  } catch (error) {
    console.error("NewsAPI headlines error:", error);
    res.status(500).json({ error: "Failed to get headlines" });
  }
});

router.get("/news/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) { res.status(400).json({ error: "q parameter required" }); return; }
    const data = await newsApiService.searchEverything({ q });
    res.json(data);
  } catch (error) {
    console.error("NewsAPI search error:", error);
    res.status(500).json({ error: "Failed to search news" });
  }
});

router.get("/news/stock/:symbol", async (req, res) => {
  try {
    const data = await cache.getOrFetch(
      `news:stock:${req.params.symbol}`,
      () => newsApiService.getStockNews(req.params.symbol.toUpperCase()),
      900
    );
    res.json(data);
  } catch (error) {
    console.error("NewsAPI stock news error:", error);
    res.status(500).json({ error: "Failed to get stock news" });
  }
});

/* ─────────────── FRED Economic Data ─────────────── */

router.get("/fred/series/:seriesId", async (req, res) => {
  try {
    const data = await cache.getOrFetch(
      `fred:${req.params.seriesId}`,
      () => fredService.getSeries(req.params.seriesId, {
        limit: parseInt(req.query.limit as string, 10) || 100,
        frequency: req.query.frequency as string,
      }),
      3600
    );
    res.json(data);
  } catch (error) {
    console.error("FRED series error:", error);
    res.status(500).json({ error: "Failed to get FRED data" });
  }
});

router.get("/fred/dashboard", async (_req, res) => {
  try {
    const data = await cache.getOrFetch("fred:dashboard", () => fredService.getEconomicDashboard(), 3600);
    res.json(data);
  } catch (error) {
    console.error("FRED dashboard error:", error);
    res.status(500).json({ error: "Failed to get economic dashboard" });
  }
});

router.get("/fred/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) { res.status(400).json({ error: "q parameter required" }); return; }
    const data = await fredService.searchSeries(q);
    res.json(data);
  } catch (error) {
    console.error("FRED search error:", error);
    res.status(500).json({ error: "Failed to search FRED" });
  }
});

export default router;
