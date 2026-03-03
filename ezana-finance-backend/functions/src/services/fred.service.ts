import axios from "axios";
import { apiConfig } from "../config/apis";

const BASE = apiConfig.fred.baseUrl;
const KEY = apiConfig.fred.apiKey;

/**
 * FRED (Federal Reserve Economic Data) Service
 * 800,000+ economic time series. FREE with API key from https://fred.stlouisfed.org/
 *
 * Popular series IDs:
 *   GDP, UNRATE, CPIAUCSL, DFF, DGS10, DGS2, T10Y2Y,
 *   VIXCLS, SP500, UMCSENT, PAYEMS, FEDFUNDS
 */
class FredService {
  private get hasKey() {
    return !!KEY;
  }

  async getSeries(seriesId: string, opts: {
    observationStart?: string;
    observationEnd?: string;
    limit?: number;
    sortOrder?: "asc" | "desc";
    frequency?: string;
  } = {}) {
    if (!this.hasKey) return [];
    const params: Record<string, string | number> = {
      series_id: seriesId,
      api_key: KEY,
      file_type: "json",
      sort_order: opts.sortOrder || "desc",
    };
    if (opts.observationStart) params.observation_start = opts.observationStart;
    if (opts.observationEnd) params.observation_end = opts.observationEnd;
    if (opts.limit) params.limit = opts.limit;
    if (opts.frequency) params.frequency = opts.frequency;

    const { data } = await axios.get(`${BASE}/fred/series/observations`, { params });
    return (data?.observations || []).map((o: any) => ({
      date: o.date,
      value: o.value === "." ? null : parseFloat(o.value),
    }));
  }

  async getSeriesInfo(seriesId: string) {
    if (!this.hasKey) return null;
    const { data } = await axios.get(`${BASE}/fred/series`, {
      params: { series_id: seriesId, api_key: KEY, file_type: "json" },
    });
    return data?.seriess?.[0] || null;
  }

  async searchSeries(query: string, limit = 10) {
    if (!this.hasKey) return [];
    const { data } = await axios.get(`${BASE}/fred/series/search`, {
      params: { search_text: query, api_key: KEY, file_type: "json", limit },
    });
    return (data?.seriess || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      frequency: s.frequency_short,
      units: s.units_short,
      lastUpdated: s.last_updated,
    }));
  }

  async getEconomicDashboard() {
    if (!this.hasKey) return null;
    const ids = ["GDP", "UNRATE", "CPIAUCSL", "DFF", "DGS10", "DGS2", "T10Y2Y", "VIXCLS", "UMCSENT"];
    const results = await Promise.allSettled(
      ids.map((id) => this.getSeries(id, { limit: 1 }))
    );
    const dashboard: Record<string, any> = {};
    ids.forEach((id, i) => {
      const r = results[i];
      dashboard[id] = r.status === "fulfilled" && r.value?.length ? r.value[0] : null;
    });
    return dashboard;
  }
}

export default new FredService();
