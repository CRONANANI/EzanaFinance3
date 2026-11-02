/**
 * Banco Central do Brasil, SGS time series. One series per request; daily series are split into
 * windows of at most 10 years (BCB limit for daily series since 2025). A 404 means "no data in
 * this window" and returns no rows.
 * Endpoint and response shape as published by BCB. The series codes below are the commonly
 * used SGS codes; confirm each at https://www3.bcb.gov.br/sgspub (they could not be checked
 * from the environment this was written in).
 */
import { num } from '../engine.js';

const BACKFILL_FROM = '2000-01-01';
export const SERIES = [
  { code: 432, name: 'Selic target rate', unit: '% p.a.', freq: 'D' },
  { code: 11, name: 'Selic daily rate', unit: '% p.d.', freq: 'D' },
  { code: 1, name: 'USD/BRL exchange rate, free market, sell', unit: 'BRL per USD', freq: 'D' },
  { code: 10813, name: 'USD/BRL exchange rate, free market, buy', unit: 'BRL per USD', freq: 'D' },
  {
    code: 13621,
    name: 'International reserves, cash concept, daily',
    unit: 'USD millions',
    freq: 'D',
  },
  { code: 433, name: 'IPCA consumer prices, monthly change', unit: '% m/m', freq: 'M' },
  { code: 24363, name: 'IBC-Br economic activity index', unit: 'index', freq: 'M' },
];

const fmt = (d) =>
  `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

export const bcb = {
  source: 'bcb',
  minIntervalMs: 2000, // 30 requests/minute
  attribution: 'Banco Central do Brasil, SGS (api.bcb.gov.br)',
  buildBatches(passDate) {
    const out = [];
    for (const s of SERIES) {
      let from = new Date(`${BACKFILL_FROM}T00:00:00Z`);
      while (from < passDate) {
        const to = new Date(
          Date.UTC(from.getUTCFullYear() + 10, from.getUTCMonth(), from.getUTCDate() - 1),
        );
        const end = to < passDate ? to : passDate;
        out.push({
          ...s,
          from: fmt(from),
          to: fmt(end),
          label: `SGS ${s.code} ${fmt(from)}-${fmt(end)}`,
        });
        from = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1));
      }
    }
    return out;
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${b.code}/dados?formato=json&dataInicial=${b.from}&dataFinal=${b.to}`;
    const res = await fetchWithRetry(url, {
      headers: { Accept: 'application/json' },
      okStatuses: [404],
    });
    if (res.status === 404) return [];
    const json = await res.json();
    if (!Array.isArray(json)) return [];
    return json
      .map((o) => {
        const [dd, mm, yyyy] = String(o.data).split('/');
        if (!yyyy || !mm || !dd) return null;
        return {
          series_key: `SGS.${b.code}`,
          country_iso3: 'BRA',
          period: b.freq === 'M' ? `${yyyy}-${mm}` : `${yyyy}-${mm}-${dd}`,
          value: num(o.valor),
          series_name: b.name,
          unit: b.unit,
          frequency: b.freq,
          dataset: 'SGS',
        };
      })
      .filter(Boolean);
  },
};
