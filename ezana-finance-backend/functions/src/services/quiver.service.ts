import axios from "axios";
import { apiConfig } from "../config/apis";
import pool from "../config/postgres";

interface CongressionalTradeParams {
  limit?: number;
  offset?: number;
  politician?: string;
  symbol?: string;
}

interface QuiverTrade {
  Representative?: string;
  Office?: string;
  Party?: string;
  Ticker?: string;
  Transaction?: string;
  Range?: string;
  TransactionDate?: string;
  FiledDate?: string;
}

class QuiverService {
  private baseUrl = apiConfig.quiver.baseUrl;
  private apiKey = apiConfig.quiver.apiKey;

  async getCongressionalTrades(params: CongressionalTradeParams = {}) {
    try {
      const response = await axios.get<QuiverTrade[]>(`${this.baseUrl}/live/congresstrading`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        params: {
          limit: params.limit || 100,
          offset: params.offset || 0,
        },
      });

      let trades = Array.isArray(response.data) ? response.data : [];

      if (params.politician) {
        trades = trades.filter(
          (t) =>
            (t.Representative || "")
              .toLowerCase()
              .includes(params.politician!.toLowerCase())
        );
      }

      if (params.symbol) {
        trades = trades.filter((t) => (t.Ticker || "").toUpperCase() === params.symbol!.toUpperCase());
      }

      await this.storeCongressionalTrades(trades);

      return trades;
    } catch (error) {
      console.error("Error fetching congressional trades:", error);
      throw error;
    }
  }

  private async storeCongressionalTrades(trades: QuiverTrade[]) {
    for (const trade of trades) {
      try {
        await pool.query(
          `
          INSERT INTO congressional_trades (
            politician_name, office, party, symbol, transaction_type,
            amount_range, transaction_date, filing_date
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (politician_name, symbol, transaction_date, filing_date)
          DO NOTHING
          `,
          [
            trade.Representative || "Unknown",
            trade.Office || "Representative",
            trade.Party || "Unknown",
            trade.Ticker || null,
            trade.Transaction || "Unknown",
            trade.Range || null,
            trade.TransactionDate || null,
            trade.FiledDate || null,
          ]
        );
      } catch (error) {
        console.error("Error storing trade:", error);
      }
    }
  }

  async getLobbyingData(params: { limit?: number; client?: string } = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/live/lobbying`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        params: {
          limit: params.limit || 100,
        },
      });

      let data = Array.isArray(response.data) ? response.data : [];

      if (params.client) {
        data = data.filter((item: { Client?: string }) =>
          (item.Client || "").toLowerCase().includes(params.client!.toLowerCase())
        );
      }

      return data;
    } catch (error) {
      console.error("Error fetching lobbying data:", error);
      throw error;
    }
  }

  async getGovernmentContracts(params: { limit?: number; ticker?: string } = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/live/govcontracts`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        params: {
          limit: params.limit || 100,
        },
      });

      let data = Array.isArray(response.data) ? response.data : [];

      if (params.ticker) {
        data = data.filter(
          (item: { Ticker?: string }) => (item.Ticker || "").toUpperCase() === params.ticker!.toUpperCase()
        );
      }

      return data;
    } catch (error) {
      console.error("Error fetching government contracts:", error);
      throw error;
    }
  }

  async getTrendingStocks() {
    try {
      const result = await pool.query(
        `
        SELECT 
          symbol,
          COUNT(*)::int as trade_count,
          COUNT(DISTINCT politician_name)::int as politician_count,
          MAX(transaction_date) as latest_trade
        FROM congressional_trades
        WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
          AND symbol IS NOT NULL
        GROUP BY symbol
        ORDER BY trade_count DESC
        LIMIT 20
        `
      );

      return result.rows;
    } catch (error) {
      console.error("Error getting trending stocks:", error);
      throw error;
    }
  }
}

export default new QuiverService();
