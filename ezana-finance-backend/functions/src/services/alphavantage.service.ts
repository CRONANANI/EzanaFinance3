import axios from "axios";
import { apiConfig } from "../config/apis";

const BASE = apiConfig.alphaVantage.baseUrl;
const KEY = apiConfig.alphaVantage.apiKey;

function qs(params: Record<string, string | number>) {
  return new URLSearchParams(
    Object.fromEntries(Object.entries({ ...params, apikey: KEY }).map(([k, v]) => [k, String(v)]))
  ).toString();
}

class AlphaVantageService {
  async getGlobalQuote(symbol: string) {
    const { data } = await axios.get(`${BASE}?${qs({ function: "GLOBAL_QUOTE", symbol })}`);
    const q = data["Global Quote"];
    if (!q) return null;
    return {
      symbol: q["01. symbol"],
      open: parseFloat(q["02. open"]),
      high: parseFloat(q["03. high"]),
      low: parseFloat(q["04. low"]),
      price: parseFloat(q["05. price"]),
      volume: parseInt(q["06. volume"], 10),
      latestTradingDay: q["07. latest trading day"],
      previousClose: parseFloat(q["08. previous close"]),
      change: parseFloat(q["09. change"]),
      changePercent: parseFloat(q["10. change percent"]),
    };
  }

  async getDailyTimeSeries(symbol: string, outputsize = "compact") {
    const { data } = await axios.get(
      `${BASE}?${qs({ function: "TIME_SERIES_DAILY_ADJUSTED", symbol, outputsize })}`
    );
    const ts = data["Time Series (Daily)"];
    if (!ts) return [];
    return Object.entries(ts).map(([date, v]: [string, any]) => ({
      date,
      open: parseFloat(v["1. open"]),
      high: parseFloat(v["2. high"]),
      low: parseFloat(v["3. low"]),
      close: parseFloat(v["4. close"]),
      adjustedClose: parseFloat(v["5. adjusted close"]),
      volume: parseInt(v["6. volume"], 10),
    }));
  }

  async getIntraday(symbol: string, interval = "5min") {
    const { data } = await axios.get(
      `${BASE}?${qs({ function: "TIME_SERIES_INTRADAY", symbol, interval, outputsize: "compact" })}`
    );
    const key = `Time Series (${interval})`;
    const ts = data[key];
    if (!ts) return [];
    return Object.entries(ts).map(([datetime, v]: [string, any]) => ({
      datetime,
      open: parseFloat(v["1. open"]),
      high: parseFloat(v["2. high"]),
      low: parseFloat(v["3. low"]),
      close: parseFloat(v["4. close"]),
      volume: parseInt(v["5. volume"], 10),
    }));
  }

  async getCompanyOverview(symbol: string) {
    const { data } = await axios.get(`${BASE}?${qs({ function: "OVERVIEW", symbol })}`);
    return data && data.Symbol ? data : null;
  }

  async getTopMovers() {
    const { data } = await axios.get(`${BASE}?${qs({ function: "TOP_GAINERS_LOSERS" })}`);
    return {
      top_gainers: data.top_gainers || [],
      top_losers: data.top_losers || [],
      most_actively_traded: data.most_actively_traded || [],
    };
  }

  async getNewsSentiment(tickers?: string, topics?: string) {
    const params: Record<string, string> = { function: "NEWS_SENTIMENT" };
    if (tickers) params.tickers = tickers;
    if (topics) params.topics = topics;
    const { data } = await axios.get(`${BASE}?${qs(params)}`);
    return data && data.feed ? data.feed : [];
  }

  async getIndicator(symbol: string, indicator: string, opts: Record<string, string | number> = {}) {
    const params = {
      function: indicator,
      symbol,
      interval: "daily",
      time_period: 20,
      series_type: "close",
      ...opts,
    };
    const { data } = await axios.get(`${BASE}?${qs(params)}`);
    const taKey = Object.keys(data).find((k) => k.startsWith("Technical Analysis"));
    if (!taKey) return [];
    return Object.entries(data[taKey]).map(([date, v]: [string, any]) => {
      const values: Record<string, number> = {};
      Object.entries(v).forEach(([k, val]) => {
        values[k] = parseFloat(val as string);
      });
      return { date, ...values };
    });
  }

  async searchSymbol(keywords: string) {
    const { data } = await axios.get(`${BASE}?${qs({ function: "SYMBOL_SEARCH", keywords })}`);
    return (data && data.bestMatches ? data.bestMatches : []).map((m: any) => ({
      symbol: m["1. symbol"],
      name: m["2. name"],
      type: m["3. type"],
      region: m["4. region"],
    }));
  }
}

export default new AlphaVantageService();
