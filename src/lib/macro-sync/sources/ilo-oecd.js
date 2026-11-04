/**
 * ILOSTAT (labour) and OECD TiVA (trade in value added).
 *
 * ILOSTAT: the rplumber CSV service, no key, CC BY 4.0.
 *   https://rplumber.ilo.org/data/indicator/?id={INDICATOR}_{FREQ}&timefrom=&timeto=&type=code&format=.csv
 *   Columns: ref_area, source, indicator, sex, classif1, (classif2), time, obs_value, obs_status.
 *   Indicator catalogue: https://rplumber.ilo.org/metadata/toc/indicator
 *   Queries over ~300k records return 413, so keep indicators narrow.
 *
 * OECD TiVA principal indicators: SDMX REST, no key, about 60 data queries per hour per IP,
 * so requests are spaced 70 s apart and batched with '+'.
 *   https://sdmx.oecd.org/public/rest/data/OECD.STI.PIE,DSD_TIVA_MAINLV@DF_MAINLV,1.1/{key}
 *   key = MEASURE.REF_AREA.ACTIVITY.COUNTERPART_AREA.UNIT.FREQ
 */
import Papa from 'papaparse';
import { parseSdmxCsv, toIso3, toNum, normPeriod, freqOf, assertNotHtml } from '../formats.js';

/* ------------------------------------------------------------------ ILOSTAT */

export const ILO_INDICATORS = [
  {
    id: 'UNE_DEAP_SEX_AGE_RT_A',
    name: 'Unemployment rate',
    unit: '%',
    keepSex: 'SEX_T',
    classif1: 'AGE_YTHADULT_YGE15',
  },
  {
    id: 'EMP_TEMP_SEX_ECO_NB_A',
    name: 'Employment by economic activity',
    unit: 'thousands',
    keepSex: 'SEX_T',
  },
  {
    id: 'EAR_4MTH_SEX_ECO_CUR_NB_A',
    name: 'Mean monthly earnings by economic activity',
    unit: 'local currency',
    keepSex: 'SEX_T',
  },
];

export function parseIloCsv(text, ind) {
  assertNotHtml(text, 'rplumber.ilo.org');
  const { data } = Papa.parse(String(text).replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: true,
  });
  const out = [];
  for (const r of data) {
    if (ind.keepSex && r.sex && r.sex !== ind.keepSex) continue;
    if (ind.classif1 && r.classif1 && r.classif1 !== ind.classif1) continue;
    const iso3 = toIso3(r.ref_area);
    const period = normPeriod(r.time);
    if (!iso3 || !period) continue;
    const dims = [r.classif1, r.classif2].filter(Boolean);
    out.push({
      series_key: `ILO.${ind.id}:${[iso3, ...dims].join('.')}`,
      country_iso3: iso3,
      period,
      value: toNum(r.obs_value),
      series_name: dims.length ? `${ind.name} (${dims.join(', ')})` : ind.name,
      unit: ind.unit,
      frequency: freqOf(period),
      dataset: ind.id,
    });
  }
  return out;
}

export const ilostat = {
  source: 'ilostat',
  minIntervalMs: 3000,
  attribution: 'International Labour Organization, ILOSTAT (CC BY 4.0)',
  buildBatches(passDate) {
    const to = passDate.getUTCFullYear();
    return ILO_INDICATORS.map((i) => ({ ...i, to, label: i.id }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://rplumber.ilo.org/data/indicator/?id=${b.id}&timefrom=2010&timeto=${b.to}&type=code&format=.csv`;
    const res = await fetchWithRetry(url, { headers: { Accept: 'text/csv' } });
    return parseIloCsv(await res.text(), b);
  },
};

/* ------------------------------------------------------------------ OECD TiVA */

export const TIVA_QUERIES = [
  {
    // Value added, gross exports, domestic value added in final demand; all countries,
    // total economy and manufacturing, counterpart World, USD, annual.
    key: 'VALU+EXGR+FFD_DVA.._T+C.W.USD.A',
    name: 'Trade in value added (TiVA) principal indicators',
  },
];

export const oecdTiva = {
  source: 'oecd-tiva',
  minIntervalMs: 70000, // OECD allows ~60 data queries per hour per IP
  refreshAfterDays: 30, // TiVA is revised once a year
  attribution: 'OECD, Trade in Value Added (TiVA) database (CC BY 4.0)',
  buildBatches() {
    return TIVA_QUERIES.map((q) => ({ ...q, label: `TiVA ${q.key}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://sdmx.oecd.org/public/rest/data/OECD.STI.PIE,DSD_TIVA_MAINLV@DF_MAINLV,1.1/${b.key}?startPeriod=2010&dimensionAtObservation=AllDimensions&format=csvfile`;
    const res = await fetchWithRetry(url, { headers: { Accept: 'text/csv' }, okStatuses: [404] });
    if (res.status === 404) return [];
    const text = await res.text();
    assertNotHtml(text, 'sdmx.oecd.org');
    return parseSdmxCsv(text, {
      prefix: 'OECD.TIVA',
      dataset: 'DF_MAINLV',
      seriesName: b.name,
      countryDims: ['REF_AREA'],
    });
  },
};
