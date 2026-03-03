import axios from "axios";
import { apiConfig } from "../config/apis";
import { realtimeDb } from "../config/firebase";
import pool from "../config/postgres";

interface FinnhubQuote {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
}

class FinnhubService {
  private baseUrl = apiConfig.finnhub.baseUrl;
  private apiKey = apiConfig.finnhub.apiKey;

  async getQuote(symbol: string) {
    try {
      const cached = await realtimeDb.ref(`quotes/${symbol}`).once("value");
      const cachedData = cached.val();

      if (cachedData && Date.now() - (cachedData.timestamp || 0) < 5000) {
        return cachedData;
      }

      const response = await axios.get<FinnhubQuote>(`${this.baseUrl}/quote`, {
        params: {
          symbol,
          token: this.apiKey,
        },
      });

      const quote = {
        symbol,
        price: response.data.c,
        change: response.data.d,
        changePercent: response.data.dp,
        high: response.data.h,
        low: response.data.l,
        open: response.data.o,
        previousClose: response.data.pc,
        timestamp: Date.now(),
      };

      await realtimeDb.ref(`quotes/${symbol}`).set(quote);

      return quote;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  async getQuotes(symbols: string[]) {
    const quotes = await Promise.all(symbols.map((symbol) => this.getQuote(symbol)));
    return quotes;
  }

  async getCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ) {
    try {
      const response = await axios.get(`${this.baseUrl}/stock/candle`, {
        params: {
          symbol,
          resolution,
          from,
          to,
          token: this.apiKey,
        },
      });

      if (response.data.s === "no_data") {
        return [];
      }

      const candles = response.data.t.map((timestamp: number, index: number) => ({
        symbol,
        date: new Date(timestamp * 1000),
        open: response.data.o[index],
        high: response.data.h[index],
        low: response.data.l[index],
        close: response.data.c[index],
        volume: response.data.v[index],
      }));

      if (resolution === "D") {
        for (const candle of candles) {
          await pool.query(
            `
            INSERT INTO price_history (symbol, date, open, high, low, close, volume)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (symbol, date) DO UPDATE SET
              open = $3, high = $4, low = $5, close = $6, volume = $7
            `,
            [
              candle.symbol,
              candle.date.toISOString().split("T")[0],
              candle.open,
              candle.high,
              candle.low,
              candle.close,
              candle.volume,
            ]
          );
        }
      }

      return candles;
    } catch (error) {
      console.error(`Error fetching candles for ${symbol}:`, error);
      throw error;
    }
  }

  async getCompanyProfile(symbol: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/stock/profile2`, {
        params: {
          symbol,
          token: this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching profile for ${symbol}:`, error);
      throw error;
    }
  }

  async getNews(category = "general", limit = 20) {
    try {
      const response = await axios.get(`${this.baseUrl}/news`, {
        params: {
          category,
          token: this.apiKey,
        },
      });
      return Array.isArray(response.data) ? response.data.slice(0, limit) : [];
    } catch (error) {
      console.error("Error fetching news:", error);
      throw error;
    }
  }

  async getCompanyNews(symbol: string, from: string, to: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/company-news`, {
        params: {
          symbol,
          from,
          to,
          token: this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      throw error;
    }
  }

  async getRecommendations(symbol: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/stock/recommendation`, {
        params: {
          symbol,
          token: this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching recommendations for ${symbol}:`, error);
      throw error;
    }
  }
}

export default new FinnhubService();
