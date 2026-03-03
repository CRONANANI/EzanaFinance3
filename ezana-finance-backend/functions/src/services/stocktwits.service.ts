import axios from "axios";

/**
 * StockTwits API Service Stub
 * Social sentiment from the trader community.
 * Free tier available at https://api.stocktwits.com/
 *
 * No API key needed for basic endpoints.
 */
const BASE = "https://api.stocktwits.com/api/2";

class StockTwitsService {
  async getSentiment(symbol: string) {
    try {
      const { data } = await axios.get(`${BASE}/streams/symbol/${symbol}.json`);
      if (!data || !data.messages) return null;
      let bullish = 0;
      let bearish = 0;
      data.messages.forEach((msg: any) => {
        if (msg.entities?.sentiment?.basic === "Bullish") bullish++;
        if (msg.entities?.sentiment?.basic === "Bearish") bearish++;
      });
      const total = bullish + bearish;
      return {
        symbol,
        bullish,
        bearish,
        total: data.messages.length,
        bullishPercent: total > 0 ? Math.round((bullish / total) * 100) : 50,
        bearishPercent: total > 0 ? Math.round((bearish / total) * 100) : 50,
        messages: data.messages.slice(0, 10).map((m: any) => ({
          id: m.id,
          body: m.body,
          user: m.user?.username,
          sentiment: m.entities?.sentiment?.basic,
          createdAt: m.created_at,
        })),
      };
    } catch (error) {
      console.error(`StockTwits error for ${symbol}:`, error);
      return null;
    }
  }

  async getTrending() {
    try {
      const { data } = await axios.get(`${BASE}/trending/symbols.json`);
      return data?.symbols || [];
    } catch (error) {
      console.error("StockTwits trending error:", error);
      return [];
    }
  }
}

export default new StockTwitsService();
