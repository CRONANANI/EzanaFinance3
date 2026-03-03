import "dotenv/config";
import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import portfolioRoutes from "./routes/portfolio.routes";
import marketRoutes from "./routes/market.routes";
import congressRoutes from "./routes/congress.routes";
import dataRoutes from "./routes/data.routes";
import subscriptionRoutes from "./routes/subscription.routes";

import finnhubService from "./services/finnhub.service";
import quiverService from "./services/quiver.service";
import plaidService from "./services/plaid.service";
import fmpService from "./services/fmp.service";

import { defaultRateLimit, strictRateLimit } from "./middleware/rate-limit.middleware";

import { db } from "./config/firebase";
import pool from "./config/postgres";

// Initialize Express app
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Request logging middleware
app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  _res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});

// Security headers middleware
app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// Rate limiting
app.use("/auth/login", strictRateLimit);
app.use("/auth/register", strictRateLimit);
app.use(defaultRateLimit);

app.use("/auth", authRoutes);
app.use("/portfolio", portfolioRoutes);
app.use("/market", marketRoutes);
app.use("/congress", congressRoutes);
app.use("/data", dataRoutes);
app.use("/subscription", subscriptionRoutes);

app.get("/health", (_req: express.Request, res: express.Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "3.6.0",
    services: {
      finnhub: !!process.env.FINNHUB_API_KEY,
      quiver: !!process.env.QUIVER_API_KEY,
      alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
      fmp: !!process.env.FMP_API_KEY,
      newsApi: !!process.env.NEWS_API_KEY,
      fred: !!process.env.FRED_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      sendgrid: !!process.env.SENDGRID_API_KEY,
    },
  });
});

app.get("/health/db", async (_req: express.Request, res: express.Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ database: "healthy" });
  } catch (error) {
    res.status(503).json({ database: "unhealthy", error: String(error) });
  }
});

export const api = functions.https.onRequest(app);

/**
 * Update stock prices every 5 minutes during market hours (9am-4pm ET, Mon-Fri)
 */
export const updatePrices = functions.pubsub
  .schedule("*/5 9-16 * * 1-5")
  .timeZone("America/New_York")
  .onRun(async () => {
    console.log("Updating stock prices...");
    try {
      const result = await pool.query("SELECT DISTINCT symbol FROM holdings WHERE symbol IS NOT NULL");
      const symbols = result.rows.map((row) => row.symbol);
      if (symbols.length > 0) {
        await finnhubService.getQuotes(symbols);
        console.log(`Updated ${symbols.length} stock prices`);
      }
    } catch (error) {
      console.error("updatePrices error:", error);
    }
  });

/**
 * Sync congressional trades daily at midnight (Quiver + FMP)
 */
export const syncCongressionalTrades = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone("America/New_York")
  .onRun(async () => {
    console.log("Syncing congressional trades...");
    try {
      await quiverService.getCongressionalTrades({ limit: 500 });
      console.log("Congressional trades synced (Quiver)");
    } catch (error) {
      console.error("syncCongressionalTrades Quiver error:", error);
    }
    try {
      const fmpSenate = await fmpService.getSenateDisclosures(100);
      console.log(`FMP senate disclosures fetched: ${Array.isArray(fmpSenate) ? fmpSenate.length : 0}`);
    } catch (error) {
      console.error("syncCongressionalTrades FMP error:", error);
    }
  });

/**
 * Sync user portfolios every hour during market hours
 */
export const syncPortfolios = functions.pubsub
  .schedule("0 9-16 * * 1-5")
  .timeZone("America/New_York")
  .onRun(async () => {
    console.log("Syncing user portfolios...");
    let syncCount = 0;
    try {
      const usersSnapshot = await db.collection("users").get();

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const plaidItems = user.plaidItems || [];

        for (const item of plaidItems) {
          try {
            await plaidService.syncAccounts(
              userDoc.id,
              item.accessToken,
              item.institutionName
            );
            syncCount++;
          } catch (error) {
            console.error(`Error syncing user ${userDoc.id}:`, error);
          }
        }
      }

      console.log(`Synced ${syncCount} portfolios`);
    } catch (error) {
      console.error("syncPortfolios error:", error);
    }
  });

/**
 * Fetch historical price data weekly (Sunday 2am ET)
 */
export const fetchHistoricalData = functions.pubsub
  .schedule("0 2 * * 0")
  .timeZone("America/New_York")
  .onRun(async () => {
    console.log("Fetching historical price data...");
    try {
      const result = await pool.query(
        "SELECT DISTINCT symbol FROM holdings WHERE symbol IS NOT NULL"
      );
      const symbols = result.rows.map((row) => row.symbol);
      const to = Math.floor(Date.now() / 1000);
      const from = to - 365 * 24 * 60 * 60;

      for (const row of symbols) {
        const symbol = row.symbol;
        try {
          await finnhubService.getCandles(symbol, "D", from, to);
          console.log(`Fetched data for ${symbol}`);
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error);
        }
      }

      console.log("Historical data fetch complete");
    } catch (error) {
      console.error("fetchHistoricalData error:", error);
    }
  });

/**
 * Sync market movers and earnings calendar every 30 minutes during market hours
 */
export const syncMarketData = functions.pubsub
  .schedule("*/30 9-16 * * 1-5")
  .timeZone("America/New_York")
  .onRun(async () => {
    console.log("Syncing market movers and earnings...");
    try {
      const [gainers, losers, actives] = await Promise.all([
        fmpService.getGainers().catch(() => []),
        fmpService.getLosers().catch(() => []),
        fmpService.getMostActive().catch(() => []),
      ]);
      console.log(
        `Market movers: ${Array.isArray(gainers) ? gainers.length : 0} gainers, ` +
        `${Array.isArray(losers) ? losers.length : 0} losers, ` +
        `${Array.isArray(actives) ? actives.length : 0} active`
      );
    } catch (error) {
      console.error("syncMarketData error:", error);
    }
  });

/**
 * Create user in PostgreSQL when Firebase Auth user is created
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    await pool.query(
      `
      INSERT INTO users (id, email, display_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO NOTHING
      `,
      [user.uid, user.email || "", user.displayName || ""]
    );
    console.log(`Created user ${user.uid} in PostgreSQL`);
  } catch (error) {
    console.error("Error creating user in PostgreSQL:", error);
  }
});

/**
 * Delete user data when Firebase Auth user is deleted
 */
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [user.uid]);
    await db.collection("users").doc(user.uid).delete();
    console.log(`Deleted user ${user.uid} from all databases`);
  } catch (error) {
    console.error("Error deleting user:", error);
  }
});
