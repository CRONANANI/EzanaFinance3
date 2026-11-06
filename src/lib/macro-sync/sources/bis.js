/**
 * BIS statistics via the SDMX REST API (v1). One request per dataflow, returned as SDMX-CSV.
 * Keys restrict frequency where a flow carries daily data; '.'-separated positions follow each
 * flow's dimension order. CONFIRM each key against the flow's data structure:
 *   https://stats.bis.org/api/v1/dataflow/BIS/{flow}/latest?references=datastructure
 * (stats.bis.org could not be reached from the environment this was written in; a wrong key
 * fails that one batch, which is logged and skipped, never the run.)
 * The big banking-statistics flows (WS_LBS_D_PUB, WS_CBS_PUB) are better taken from the bulk
 * CSV files at https://data.bis.org/bulkdownload than through this per-request path.
 */
import Papa from 'papaparse';
import countries from 'i18n-iso-countries';
import { num } from '../engine.js';
import { yearsBefore } from '../formats.js';

const START = '2000';
/* Daily policy rates (WS_CBPOL key D.) for the last few years, next to the monthly series: the
   level set at a decision shows the day it takes effect instead of in the next monthly print. */
export const CBPOL_DAILY_YEARS = 3;
export const FLOWS = [
  { flow: 'WS_CBPOL', key: 'M.', name: 'Central bank policy rates' },
  { flow: 'WS_XRU', key: 'M...', name: 'US dollar exchange rates' },
  { flow: 'WS_EER', key: 'M...', name: 'Effective exchange rates' },
  { flow: 'WS_TC', key: 'all', name: 'Total credit to the non-financial sector' },
  { flow: 'WS_CREDIT_GAP', key: 'all', name: 'Credit-to-GDP gaps' },
  { flow: 'WS_DSR', key: 'all', name: 'Debt service ratios' },
  { flow: 'WS_SPP', key: 'all', name: 'Residential property prices' },
  /* Last, so a pass already in progress keeps its cursor. `since` is set per pass. */
  {
    flow: 'WS_CBPOL',
    key: 'D.',
    name: 'Central bank policy rates',
    sinceYears: CBPOL_DAILY_YEARS,
  },
];

const COUNTRY_DIMS = ['REF_AREA', 'BORROWERS_CTY', 'L_REP_CTY'];
const SKIP_COLS = new Set([
  'DATAFLOW',
  'STRUCTURE',
  'STRUCTURE_ID',
  'ACTION',
  'TIME_PERIOD',
  'OBS_VALUE',
  'OBS_STATUS',
  'OBS_CONF',
  'OBS_PRE_BREAK',
]);

/** SDMX-CSV text to rows. Exported for the test. */
export function parseBisCsv(text, b) {
  const { data } = Papa.parse(String(text || ''), { header: true, skipEmptyLines: true });
  return data
    .map((r) => {
      const dims = Object.keys(r).filter(
        (k) => !SKIP_COLS.has(k) && !k.includes(':') && r[k] !== '',
      );
      const iso2 = COUNTRY_DIMS.map((d) => r[d]).find(Boolean);
      return {
        series_key: `${b.flow}:${dims.map((d) => r[d]).join('.')}`,
        country_iso3:
          iso2 && /^[A-Z]{2}$/.test(iso2) ? countries.alpha2ToAlpha3(iso2) || null : null,
        period: r.TIME_PERIOD,
        value: num(r.OBS_VALUE),
        series_name: b.name,
        unit: r.UNIT_MEASURE || r.UNIT_TYPE || null,
        frequency: r.FREQ || null,
        dataset: b.flow,
      };
    })
    .filter((r) => r.period);
}

export const bis = {
  source: 'bis',
  minIntervalMs: 3000, // 20 requests/minute
  attribution: 'Bank for International Settlements, BIS Statistics (data.bis.org)',
  buildBatches(passDate) {
    return FLOWS.map(({ sinceYears, ...f }) => ({
      ...f,
      since: sinceYears ? yearsBefore(passDate, sinceYears) : START,
      label: sinceYears ? `${f.flow}/${f.key}` : f.flow,
    }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://stats.bis.org/api/v1/data/${b.flow}/${b.key}/all?startPeriod=${b.since || START}&detail=dataonly`;
    const res = await fetchWithRetry(url, {
      headers: { Accept: 'application/vnd.sdmx.data+csv;version=1.0.0' },
      okStatuses: [404],
    });
    if (res.status === 404) return [];
    return parseBisCsv(await res.text(), b);
  },
};
