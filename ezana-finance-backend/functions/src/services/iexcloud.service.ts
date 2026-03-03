import axios from "axios";
import { apiConfig } from "../config/apis";

/**
 * IEX Cloud Service Stub
 * Sign up at https://iexcloud.io/ for an API key.
 * Free: 50K messages/month | Growth: $19/month (500K messages)
 */
class IexCloudService {
  private get base() {
    return apiConfig.iexCloud.baseUrl;
  }

  private get key() {
    return apiConfig.iexCloud.apiKey;
  }

  private get hasKey() {
    return !!this.key;
  }

  private url(path: string) {
    return `${this.base}${path}?token=${this.key}`;
  }

  async getQuote(symbol: string) {
    if (!this.hasKey) return null;
    const { data } = await axios.get(this.url(`/stock/${symbol}/quote`));
    return data;
  }

  async getBatchQuotes(symbols: string[]) {
    if (!this.hasKey) return [];
    const list = symbols.join(",");
    const { data } = await axios.get(
      `${this.base}/stock/market/batch?symbols=${list}&types=quote&token=${this.key}`
    );
    return data;
  }

  async getCompanyInfo(symbol: string) {
    if (!this.hasKey) return null;
    const { data } = await axios.get(this.url(`/stock/${symbol}/company`));
    return data;
  }

  async getFinancials(symbol: string, period = "annual", last = 4) {
    if (!this.hasKey) return null;
    const { data } = await axios.get(
      `${this.base}/stock/${symbol}/financials?period=${period}&last=${last}&token=${this.key}`
    );
    return data;
  }

  async getEarnings(symbol: string, last = 4) {
    if (!this.hasKey) return null;
    const { data } = await axios.get(
      `${this.base}/stock/${symbol}/earnings?last=${last}&token=${this.key}`
    );
    return data;
  }

  async getAnalystRatings(symbol: string) {
    if (!this.hasKey) return null;
    const { data } = await axios.get(this.url(`/stock/${symbol}/recommendation-trends`));
    return data;
  }

  async getNews(symbol: string, last = 10) {
    if (!this.hasKey) return [];
    const { data } = await axios.get(this.url(`/stock/${symbol}/news/last/${last}`));
    return data;
  }

  async getHistoricalPrices(symbol: string, range = "1m") {
    if (!this.hasKey) return [];
    const { data } = await axios.get(this.url(`/stock/${symbol}/chart/${range}`));
    return data;
  }
}

export default new IexCloudService();
