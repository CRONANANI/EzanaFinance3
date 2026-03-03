import axios from "axios";
import { apiConfig } from "../config/apis";

const BASE = apiConfig.fmp.baseUrl;
const KEY = apiConfig.fmp.apiKey;

function url(path: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams({ ...params, apikey: KEY } as Record<string, string>);
  return `${BASE}${path}?${qs}`;
}

async function get(path: string, params: Record<string, string | number> = {}) {
  const { data } = await axios.get(url(path, params));
  return data;
}

class FmpService {
  async getProfile(symbol: string) {
    const data = await get(`/v3/profile/${symbol}`);
    return Array.isArray(data) && data.length ? data[0] : null;
  }

  async getQuote(symbol: string) {
    const data = await get(`/v3/quote/${symbol}`);
    return Array.isArray(data) && data.length ? data[0] : null;
  }

  async getBatchQuote(symbols: string[]) {
    return get(`/v3/quote/${symbols.join(",")}`);
  }

  async getPriceChange(symbol: string) {
    const data = await get(`/v3/stock-price-change/${symbol}`);
    return Array.isArray(data) && data.length ? data[0] : null;
  }

  async getIncomeStatement(symbol: string, period = "annual", limit = 5) {
    return get(`/v3/income-statement/${symbol}`, { period, limit });
  }

  async getBalanceSheet(symbol: string, period = "annual", limit = 5) {
    return get(`/v3/balance-sheet-statement/${symbol}`, { period, limit });
  }

  async getCashFlow(symbol: string, period = "annual", limit = 5) {
    return get(`/v3/cash-flow-statement/${symbol}`, { period, limit });
  }

  async getKeyMetrics(symbol: string, period = "annual", limit = 5) {
    return get(`/v3/key-metrics/${symbol}`, { period, limit });
  }

  async getFinancialRatios(symbol: string, period = "annual", limit = 5) {
    return get(`/v3/ratios/${symbol}`, { period, limit });
  }

  async getDCF(symbol: string) {
    const data = await get(`/v3/discounted-cash-flow/${symbol}`);
    return Array.isArray(data) && data.length ? data[0] : data;
  }

  async getAnalystEstimates(symbol: string, period = "annual", limit = 4) {
    return get(`/v3/analyst-estimates/${symbol}`, { period, limit });
  }

  async getRating(symbol: string) {
    const data = await get(`/v3/rating/${symbol}`);
    return Array.isArray(data) && data.length ? data[0] : null;
  }

  async getPriceTarget(symbol: string) {
    return get("/v4/price-target-summary", { symbol });
  }

  async getGainers() { return get("/v3/stock_market/gainers"); }
  async getLosers() { return get("/v3/stock_market/losers"); }
  async getMostActive() { return get("/v3/stock_market/actives"); }

  async getEarningsCalendar(from?: string, to?: string) {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return get("/v3/earning_calendar", params);
  }

  async getDividendsCalendar(from?: string, to?: string) {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return get("/v3/stock_dividend_calendar", params);
  }

  async getSenateDisclosures(limit = 50) {
    return get("/v4/senate-disclosure", { limit });
  }

  async getInsiderTrading(symbol?: string, limit = 50) {
    const params: Record<string, string | number> = { limit };
    if (symbol) params.symbol = symbol;
    return get("/v4/insider-trading", params);
  }

  async getStockNews(tickers?: string, limit = 20) {
    const params: Record<string, string | number> = { limit };
    if (tickers) params.tickers = tickers;
    return get("/v3/stock_news", params);
  }

  async getGeneralNews(limit = 20) {
    return get("/v4/general_news", { limit });
  }

  async searchSymbol(query: string, limit = 10) {
    return get("/v3/search", { query, limit });
  }

  async getStockPeers(symbol: string) {
    const data = await get("/v4/stock_peers", { symbol });
    return Array.isArray(data) && data.length ? data[0]?.peersList || [] : [];
  }

  async getHistoricalPrice(symbol: string) {
    const data = await get(`/v3/historical-price-full/${symbol}`, { serietype: "line" });
    return data?.historical || [];
  }

  async screenStocks(params: Record<string, string | number> = {}) {
    return get("/v3/stock-screener", params);
  }
}

export default new FmpService();
