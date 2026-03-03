import axios from "axios";
import { apiConfig } from "../config/apis";

const BASE = apiConfig.newsApi.baseUrl;
const KEY = apiConfig.newsApi.apiKey;

interface HeadlineOpts {
  country?: string;
  category?: string;
  q?: string;
  pageSize?: number;
}

interface SearchOpts {
  q?: string;
  domains?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  pageSize?: number;
  language?: string;
}

class NewsApiServiceBackend {
  async getTopHeadlines(opts: HeadlineOpts = {}) {
    const params: Record<string, string | number> = {
      country: opts.country || "us",
      pageSize: opts.pageSize || 20,
      apiKey: KEY,
    };
    if (opts.category) params.category = opts.category;
    if (opts.q) params.q = opts.q;
    const { data } = await axios.get(`${BASE}/top-headlines`, { params });
    return this.normalize(data);
  }

  async getBusinessNews(pageSize = 15) {
    return this.getTopHeadlines({ category: "business", pageSize });
  }

  async searchEverything(opts: SearchOpts = {}) {
    if (!opts.q && !opts.domains) return [];
    const params: Record<string, string | number> = {
      sortBy: opts.sortBy || "publishedAt",
      pageSize: opts.pageSize || 20,
      language: opts.language || "en",
      apiKey: KEY,
    };
    if (opts.q) params.q = opts.q;
    if (opts.domains) params.domains = opts.domains;
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    const { data } = await axios.get(`${BASE}/everything`, { params });
    return this.normalize(data);
  }

  async getStockNews(query: string, pageSize = 10) {
    return this.searchEverything({
      q: query + " stock OR shares OR market",
      pageSize,
    });
  }

  private normalize(data: any) {
    if (!data || data.status !== "ok" || !data.articles) return [];
    return data.articles
      .filter((a: any) => a.title && a.title !== "[Removed]")
      .map((a: any) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        urlToImage: a.urlToImage,
        publishedAt: a.publishedAt,
        source: a.source ? a.source.name : "Unknown",
        author: a.author,
      }));
  }
}

export default new NewsApiServiceBackend();
