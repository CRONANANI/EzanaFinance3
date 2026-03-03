import { Router } from "express";
import quiverService from "../services/quiver.service";
import { optionalAuth } from "../middleware/auth.middleware";
import pool from "../config/postgres";

const router = Router();

router.use(optionalAuth);

router.get("/trades", async (req, res) => {
  try {
    const { limit = "100", offset = "0", politician, symbol } = req.query;

    const trades = await quiverService.getCongressionalTrades({
      limit: parseInt(limit as string, 10) || 100,
      offset: parseInt(offset as string, 10) || 0,
      politician: politician as string,
      symbol: symbol as string,
    });

    res.json(trades);
  } catch (error) {
    console.error("Get congress trades error:", error);
    res.status(500).json({ error: "Failed to get congressional trades" });
  }
});

router.get("/trades/trending", async (_req, res) => {
  try {
    const trending = await quiverService.getTrendingStocks();
    res.json(trending);
  } catch (error) {
    console.error("Get trending error:", error);
    res.status(500).json({ error: "Failed to get trending stocks" });
  }
});

router.get("/lobbying", async (req, res) => {
  try {
    const { limit = "100", client } = req.query;
    const data = await quiverService.getLobbyingData({
      limit: parseInt(limit as string, 10) || 100,
      client: client as string,
    });
    res.json(data);
  } catch (error) {
    console.error("Get lobbying error:", error);
    res.status(500).json({ error: "Failed to get lobbying data" });
  }
});

router.get("/contracts", async (req, res) => {
  try {
    const { limit = "100", ticker } = req.query;
    const data = await quiverService.getGovernmentContracts({
      limit: parseInt(limit as string, 10) || 100,
      ticker: ticker as string,
    });
    res.json(data);
  } catch (error) {
    console.error("Get contracts error:", error);
    res.status(500).json({ error: "Failed to get government contracts" });
  }
});

// Fallback: get from PostgreSQL if Quiver API fails
router.get("/trades/db", async (req, res) => {
  try {
    const { symbol, limit = "50" } = req.query;
    let query = `
      SELECT * FROM congressional_trades
      WHERE transaction_date >= CURRENT_DATE - INTERVAL '90 days'
    `;
    const params: unknown[] = [];
    if (symbol) {
      params.push(symbol);
      query += ` AND symbol = $${params.length}`;
    }
    query += ` ORDER BY transaction_date DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit as string, 10) || 50);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Get congress trades from DB error:", error);
    res.status(500).json({ error: "Failed to get trades" });
  }
});

export default router;
