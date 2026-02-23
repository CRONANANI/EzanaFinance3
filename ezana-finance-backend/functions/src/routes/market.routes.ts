import { Router } from "express";
import finnhubService from "../services/finnhub.service";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.use(optionalAuth);

router.get("/quote/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      res.status(400).json({ error: "Symbol required" });
      return;
    }

    const quote = await finnhubService.getQuote(symbol.toUpperCase());
    res.json(quote);
  } catch (error) {
    console.error("Get quote error:", error);
    res.status(500).json({ error: "Failed to get quote" });
  }
});

router.post("/quotes", async (req, res) => {
  try {
    const { symbols } = req.body;
    if (!Array.isArray(symbols) || symbols.length === 0) {
      res.status(400).json({ error: "symbols array required" });
      return;
    }

    const quotes = await finnhubService.getQuotes(symbols.map((s: string) => s.toUpperCase()));
    res.json(quotes);
  } catch (error) {
    console.error("Get quotes error:", error);
    res.status(500).json({ error: "Failed to get quotes" });
  }
});

router.get("/history/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { from, to, resolution = "D" } = req.query;

    if (!symbol || !from || !to) {
      res.status(400).json({ error: "symbol, from, and to required" });
      return;
    }

    const fromUnix = Math.floor(new Date(from as string).getTime() / 1000);
    const toUnix = Math.floor(new Date(to as string).getTime() / 1000);

    const candles = await finnhubService.getCandles(
      symbol.toUpperCase(),
      resolution as string,
      fromUnix,
      toUnix
    );

    res.json(candles);
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({ error: "Failed to get history" });
  }
});

router.get("/profile/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const profile = await finnhubService.getCompanyProfile(symbol.toUpperCase());
    res.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

router.get("/news", async (req, res) => {
  try {
    const { category = "general", limit = "20" } = req.query;
    const news = await finnhubService.getNews(
      category as string,
      parseInt(limit as string, 10) || 20
    );
    res.json(news);
  } catch (error) {
    console.error("Get news error:", error);
    res.status(500).json({ error: "Failed to get news" });
  }
});

export default router;
