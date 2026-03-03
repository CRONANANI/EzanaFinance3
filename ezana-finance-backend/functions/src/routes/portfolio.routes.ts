import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import plaidService from "../services/plaid.service";
import pool from "../config/postgres";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const portfoliosResult = await pool.query(
      `SELECT * FROM portfolios WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );

    const portfolios = portfoliosResult.rows;

    for (const p of portfolios) {
      const holdingsResult = await pool.query(
        `SELECT * FROM holdings WHERE portfolio_id = $1`,
        [p.id]
      );
      (p as Record<string, unknown>).holdings = holdingsResult.rows;
    }

    res.json(portfolios);
  } catch (error) {
    console.error("Get portfolios error:", error);
    res.status(500).json({ error: "Failed to get portfolios" });
  }
});

router.post("/link-token", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const linkToken = await plaidService.createLinkToken(userId);
    res.json({ linkToken });
  } catch (error) {
    console.error("Create link token error:", error);
    res.status(500).json({ error: "Failed to create link token" });
  }
});

router.post("/exchange-token", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.uid;
    const { publicToken } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!publicToken) {
      res.status(400).json({ error: "Missing publicToken" });
      return;
    }

    const result = await plaidService.exchangePublicToken(publicToken, userId);
    res.json(result);
  } catch (error) {
    console.error("Exchange token error:", error);
    res.status(500).json({ error: "Failed to exchange token" });
  }
});

router.post("/sync", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { db } = await import("../config/firebase");
    const userDoc = await db.collection("users").doc(userId).get();
    const plaidItems = userDoc.data()?.plaidItems || [];

    if (plaidItems.length === 0) {
      res.status(400).json({ error: "No linked accounts to sync" });
      return;
    }

    for (const item of plaidItems) {
      await plaidService.syncAccounts(userId, item.accessToken, item.institutionName);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Sync portfolio error:", error);
    res.status(500).json({ error: "Failed to sync portfolio" });
  }
});

export default router;
