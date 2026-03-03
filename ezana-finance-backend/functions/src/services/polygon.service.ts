import axios from "axios";
import { apiConfig } from "../config/apis";

/**
 * Polygon.io Service Stub
 * Sign up at https://polygon.io/ for an API key.
 * Free: 5 calls/min | Starter: $29/month | Developer: $99/month
 *
 * Supports: stocks, options, forex, crypto, WebSocket real-time data.
 */
class PolygonService {
  private get base() { return apiConfig.polygon.baseUrl; }
  private get key() { return apiConfig.polygon.apiKey; }
  private get hasKey() { return !!this.key; }

  private url(path: string) {
    return `${this.base}${path}?apiKey=${this.key}`;
  }

  async getAggregates(symbol: string, multiplier: number, timespan: string, from: string, to: string) {
    if (!this.hasKey) return null;
    const { data } = await axios.get(
      this.url(`/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}`)
    );
    return data;
  }

  async getPreviousClose(symbol: string) {
    if (!this.hasKey) return null;
    const { data } = await axios.get(this.url(`/v2/aggs/ticker/${symbol}/prev`));
    return data?.results?.[0] || null;
  }

  async getTickerDetails(symbol: string) {
    if (!this.hasKey) return null;
    const { data } = await axios.get(this.url(`/v3/reference/tickers/${symbol}`));
    return data?.results || null;
  }

  async getMarketStatus() {
    if (!this.hasKey) return null;
    const { data } = await axios.get(this.url("/v1/marketstatus/now"));
    return data;
  }

  async getGroupedDaily(date: string) {
    if (!this.hasKey) return null;
    const { data } = await axios.get(this.url(`/v2/aggs/grouped/locale/us/market/stocks/${date}`));
    return data?.results || [];
  }

  async getOptionsContracts(symbol: string) {
    if (!this.hasKey) return [];
    const { data } = await axios.get(
      `${this.base}/v3/reference/options/contracts?underlying_ticker=${symbol}&apiKey=${this.key}`
    );
    return data?.results || [];
  }

  async getForexRate(from: string, to: string) {
    if (!this.hasKey) return null;
    const { data } = await axios.get(this.url(`/v1/last/crypto/${from}/${to}`));
    return data;
  }

  getWebSocketUrl() {
    return `wss://socket.polygon.io/stocks`;
  }
}

export default new PolygonService();
