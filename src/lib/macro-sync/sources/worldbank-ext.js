/**
 * World Bank series beyond the WDI set already ingested by /api/cron/macro-worldbank and
 * /api/cron/ingest-worldbank: governance (WGI, source 3), external debt (IDS, source 6) and
 * remittances (WDI codes, source 2). api.worldbank.org/v2, JSON [meta, rows], no key, CC BY 4.0.
 * WGI codes changed: the bare GE.EST etc. are archived; the live codes are GOV_WGI_*.EST.
 * Regional and income aggregates are dropped (no valid ISO3).
 */
import { toIso3, toNum, normPeriod, freqOf } from '../formats.js';

export const INDICATORS = [
  // Worldwide Governance Indicators, estimate (-2.5 to 2.5)
  { id: 'GOV_WGI_VA.EST', source: 3, name: 'Voice and accountability', unit: 'estimate' },
  {
    id: 'GOV_WGI_PV.EST',
    source: 3,
    name: 'Political stability and absence of violence',
    unit: 'estimate',
  },
  { id: 'GOV_WGI_GE.EST', source: 3, name: 'Government effectiveness', unit: 'estimate' },
  { id: 'GOV_WGI_RQ.EST', source: 3, name: 'Regulatory quality', unit: 'estimate' },
  { id: 'GOV_WGI_RL.EST', source: 3, name: 'Rule of law', unit: 'estimate' },
  { id: 'GOV_WGI_CC.EST', source: 3, name: 'Control of corruption', unit: 'estimate' },
  // International Debt Statistics
  { id: 'DT.DOD.DECT.CD', source: 6, name: 'External debt stocks, total', unit: 'current US$' },
  { id: 'DT.DOD.DECT.GN.ZS', source: 6, name: 'External debt stocks', unit: '% of GNI' },
  { id: 'DT.TDS.DECT.EX.ZS', source: 6, name: 'Total debt service', unit: '% of exports' },
  { id: 'DT.DOD.DSTC.ZS', source: 6, name: 'Short-term debt', unit: '% of total external debt' },
  // Remittances (KNOMAD's headline figures, published through WDI)
  {
    id: 'BX.TRF.PWKR.CD.DT',
    source: 2,
    name: 'Personal remittances, received',
    unit: 'current US$',
  },
  {
    id: 'BX.TRF.PWKR.DT.GD.ZS',
    source: 2,
    name: 'Personal remittances, received',
    unit: '% of GDP',
  },
  { id: 'BM.TRF.PWKR.CD.DT', source: 2, name: 'Personal remittances, paid', unit: 'current US$' },
];

const FROM_YEAR = 2000;
const PER_PAGE = 20000;

export const worldbankExt = {
  source: 'worldbank-ext',
  minIntervalMs: 1000,
  attribution:
    'World Bank, World Development Indicators, WGI and International Debt Statistics (CC BY 4.0)',
  buildBatches(passDate) {
    const to = passDate.getUTCFullYear();
    return INDICATORS.map((i) => ({ ...i, to, label: i.id }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const out = [];
    for (let page = 1; page <= 50; page += 1) {
      const url = `https://api.worldbank.org/v2/country/all/indicator/${encodeURIComponent(b.id)}?source=${b.source}&format=json&per_page=${PER_PAGE}&page=${page}&date=${FROM_YEAR}:${b.to}`;
      const res = await fetchWithRetry(url, { headers: { Accept: 'application/json' } });
      const json = await res.json();
      if (!Array.isArray(json) || !Array.isArray(json[1])) {
        const msg = json?.[0]?.message?.[0]?.value || 'unexpected response';
        throw new Error(`World Bank ${b.id}: ${msg}`);
      }
      for (const r of json[1]) {
        const iso3 = toIso3(r.countryiso3code);
        const period = normPeriod(r.date);
        if (!iso3 || !period) continue;
        out.push({
          series_key: `WB.${b.id}:${iso3}`,
          country_iso3: iso3,
          period,
          value: toNum(r.value),
          series_name: b.name,
          unit: b.unit,
          frequency: freqOf(period),
          dataset: `WB source ${b.source}`,
        });
      }
      if (page >= Number(json[0]?.pages || 1)) break;
    }
    return out.filter((r) => r.value !== null);
  },
};
