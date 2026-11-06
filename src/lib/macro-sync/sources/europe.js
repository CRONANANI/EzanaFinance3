/**
 * European official statistics. All free, no key, reuse with attribution.
 *
 * eurostat  JSON-stat 2.0 dissemination API (named filters, so no dimension order to get wrong):
 *           https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}?{dim}={code}&sinceTimePeriod=
 *           Eurostat uses EL for Greece and UK for the UK (handled by toIso3).
 * ecb       ECB Data Portal SDMX, csvdata: https://data-api.ecb.europa.eu/service/data/{FLOW}/{KEY}
 *           Also carries AMECO (dataset AME), the easiest machine route to the Commission's
 *           forecasts database (the ECB copy can lag a release), and the daily euro reference
 *           rates (EXR D..EUR.SP00.A), stored as local-currency-per-USD crosses
 *           (ECB.EXRUSD:D.{CCY}) for the last two years.
 * ons       ONS API v1 (the v0 API is being retired): search by CDID for the series URI, then
 *           /v1/data?uri=... ; JSON with years[], quarters[], months[] of { date, value }.
 * boe       Bank of England IADB CSV. Rejects library user agents (403), and answers errors as
 *           HTML with status 200, so the content is checked. Wide CSV: DATE, then one column per code.
 * insee     INSEE BDM SDMX on bdm.insee.fr (keyless; the api.insee.fr mirror needs a portal account).
 *           SDMX-ML: Series[@IDBANK] / Obs[@TIME_PERIOD, @OBS_VALUE]; up to 400 idbanks per call.
 * istat     Istat SDMX. Documented limit: 5 queries per minute per IP, and going over blocks the IP
 *           for 1-2 days, so requests are spaced 20 s apart and there are few batches.
 */
import { XMLParser } from 'fast-xml-parser';
import {
  decodeJsonStat,
  parseSdmxCsv,
  toIso3,
  toNum,
  normPeriod,
  freqOf,
  assertNotHtml,
  BROWSER_HEADERS,
  yearsBefore,
} from '../formats.js';

/* ------------------------------------------------------------------ Eurostat */

export const EUROSTAT_QUERIES = [
  {
    dataset: 'nama_10_gdp',
    params: { unit: 'CLV_PCH_PRE', na_item: 'B1GQ' },
    name: 'Real GDP growth',
    unit: '% change on previous year',
    since: '2010',
  },
  {
    dataset: 'prc_hicp_manr',
    params: { coicop: 'CP00', unit: 'RCH_A' },
    name: 'HICP inflation',
    unit: '% annual rate',
    since: '2015-01',
  },
  {
    dataset: 'une_rt_m',
    params: { s_adj: 'SA', age: 'TOTAL', sex: 'T', unit: 'PC_ACT' },
    name: 'Unemployment rate',
    unit: '% of active population',
    since: '2015-01',
  },
  {
    dataset: 'gov_10dd_edpt1',
    params: { na_item: 'GD', sector: 'S13', unit: 'PC_GDP' },
    name: 'General government gross debt',
    unit: '% of GDP',
    since: '2010',
  },
  // Confirm the base year in `unit` (I21 = 2021=100) on the dataset page before relying on it.
  {
    dataset: 'sts_inpr_m',
    params: { indic_bt: 'PRD', nace_r2: 'B-D', s_adj: 'SCA', unit: 'I21' },
    name: 'Industrial production index',
    unit: 'index',
    since: '2015-01',
  },
];

export function parseEurostat(js, q) {
  return decodeJsonStat(js)
    .map(({ coords, value }) => {
      const period = normPeriod(coords.time);
      const iso3 = toIso3(coords.geo);
      if (!period) return null;
      return {
        series_key: `ESTAT.${q.dataset}:${coords.geo}.${Object.values(q.params).join('.')}`,
        country_iso3: iso3,
        period,
        value: toNum(value),
        series_name: q.name,
        unit: q.unit,
        frequency: freqOf(period),
        dataset: q.dataset,
      };
    })
    .filter(Boolean);
}

export const eurostat = {
  source: 'eurostat',
  minIntervalMs: 2000,
  attribution: 'Eurostat (ec.europa.eu/eurostat), reuse authorised with acknowledgement',
  buildBatches() {
    return EUROSTAT_QUERIES.map((q) => ({ ...q, label: q.dataset }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const qs = new URLSearchParams({ ...b.params, sinceTimePeriod: b.since, lang: 'EN' });
    const res = await fetchWithRetry(
      `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${b.dataset}?${qs}`,
      { headers: { Accept: 'application/json' } },
    );
    const json = await res.json();
    if (json?.error)
      throw new Error(`Eurostat ${b.dataset}: ${JSON.stringify(json.error).slice(0, 200)}`);
    return parseEurostat(json, b);
  },
};

/* ------------------------------------------------------------------ ECB (+ AMECO) */

export const ECB_QUERIES = [
  {
    flow: 'EXR',
    key: 'M..EUR.SP00.A',
    name: 'Euro reference exchange rate (monthly average)',
    since: '2010-01',
  },
  {
    flow: 'FM',
    key: 'B.U2.EUR.4F.KR.MRR_FR.LEV',
    name: 'ECB main refinancing rate',
    since: '2000-01',
  },
  {
    flow: 'FM',
    key: 'B.U2.EUR.4F.KR.DFR.LEV',
    name: 'ECB deposit facility rate',
    since: '2000-01',
  },
  { flow: 'ICP', key: 'M..N.000000.4.ANR', name: 'HICP inflation, annual rate', since: '2010-01' },
  // AMECO via the ECB copy: FREQ.COUNTRY(ISO3).<transformation/unit dims>.VARIABLE. The pattern
  // below is from working client code for ZUTN (unemployment rate). Other variables (UDGG gross
  // debt, UBLGE net lending) use different unit dimensions: copy their exact keys from the
  // AME dataset page on data.ecb.europa.eu before adding them.
  { flow: 'AME', key: 'A..1.0.0.0.ZUTN', name: 'AMECO: unemployment rate', since: '2000' },
];

/* AMECO keys carry the country in position 2 (FREQ.COUNTRY...), in AMECO's own ISO3 codes;
   the AME flow has no REF_AREA column, so parseSdmxCsv left country_iso3 null. ROM is
   AMECO's code for Romania. Aggregates (EA20, EU27, ...) stay null. */
const AMECO_FIXES = { ROM: 'ROU' };
export function amecoIso3(seriesKey) {
  const code = String(seriesKey || '')
    .split(':')[1]
    ?.split('.')[1];
  if (!code || !/^[A-Z]{3}$/.test(code)) return null;
  return AMECO_FIXES[code] || toIso3(code) || null;
}

/* ECB daily reference rates, every currency against the euro (EXR D..EUR.SP00.A), for the
   last ECB_DAILY_YEARS years. Each is turned into local currency per US dollar on the same
   day, so the currency framework has a daily rate where BIS has only monthly averages. */
export const ECB_DAILY_YEARS = 2;
export const ECB_DAILY_FX = {
  flow: 'EXR',
  key: 'D..EUR.SP00.A',
  name: 'Euro reference exchange rate (daily)',
  daily: true,
};

/* Reference-rate currency -> the economy it is stated for. USD is the numeraire and EUR the
   base, so neither appears; BGN is left out because Bulgaria uses the euro from 2026 (its
   rows would be a stale lev for a euro member). HRK and other retired euro-area currencies
   are not quoted any more. */
export const ECB_CCY_ISO3 = {
  AUD: 'AUS',
  BRL: 'BRA',
  CAD: 'CAN',
  CHF: 'CHE',
  CNY: 'CHN',
  CZK: 'CZE',
  DKK: 'DNK',
  GBP: 'GBR',
  HKD: 'HKG',
  HUF: 'HUN',
  IDR: 'IDN',
  ILS: 'ISR',
  INR: 'IND',
  ISK: 'ISL',
  JPY: 'JPN',
  KRW: 'KOR',
  MXN: 'MEX',
  MYR: 'MYS',
  NOK: 'NOR',
  NZD: 'NZL',
  PHP: 'PHL',
  PLN: 'POL',
  RON: 'ROU',
  RUB: 'RUS',
  SEK: 'SWE',
  SGD: 'SGP',
  THB: 'THA',
  TRY: 'TUR',
  ZAR: 'ZAF',
};

/**
 * Local currency per US dollar from two euro reference rates on the same day:
 * (local per EUR) / (USD per EUR). TRY 50.0 and USD 1.08 per euro -> 46.296... TRY per USD.
 * Null when either rate is missing or not positive. Rounded to 8 significant digits.
 */
export function usdCross(localPerEur, usdPerEur) {
  const l = Number(localPerEur);
  const u = Number(usdPerEur);
  if (!Number.isFinite(l) || !Number.isFinite(u) || l <= 0 || u <= 0) return null;
  return Number((l / u).toPrecision(8));
}

/**
 * Parsed daily EXR rows (ECB.EXR:D.{CCY}.EUR.SP00.A) -> one ECB.EXRUSD:D.{CCY} row per
 * currency and day with a USD rate the same day. Pure; exported for the test.
 */
export function ecbUsdCrossRows(rows) {
  const byDay = new Map(); // period -> Map(ccy -> local per EUR)
  for (const r of rows || []) {
    const [freq, ccy, base] =
      String(r.series_key || '')
        .split(':')[1]
        ?.split('.') || [];
    if (freq !== 'D' || base !== 'EUR' || !ccy || !r.period) continue;
    if (!byDay.has(r.period)) byDay.set(r.period, new Map());
    byDay.get(r.period).set(ccy, r.value);
  }
  const out = [];
  for (const [period, rates] of byDay) {
    const usd = rates.get('USD');
    if (usd == null) continue;
    for (const [ccy, local] of rates) {
      const iso3 = ECB_CCY_ISO3[ccy];
      if (!iso3) continue; // USD itself, retired euro-area currencies, unknown codes
      const value = usdCross(local, usd);
      if (value == null) continue;
      out.push({
        series_key: `ECB.EXRUSD:D.${ccy}`,
        country_iso3: iso3,
        period,
        value,
        series_name: `${ccy} per US dollar (ECB reference rate cross)`,
        unit: `${ccy} per USD`,
        frequency: 'D',
        dataset: 'EXR',
      });
    }
  }
  return out;
}

export const ecb = {
  source: 'ecb',
  minIntervalMs: 2000,
  /* Daily rates: a full pass a day (the other batches are small). */
  refreshAfterDays: 1,
  attribution: 'European Central Bank, ECB Data Portal (data.ecb.europa.eu)',
  buildBatches(passDate) {
    /* The daily batch goes last so a pass already in progress keeps its cursor. */
    return [...ECB_QUERIES, { ...ECB_DAILY_FX, since: yearsBefore(passDate, ECB_DAILY_YEARS) }].map(
      (q) => ({ ...q, label: `${q.flow}/${q.key}` }),
    );
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://data-api.ecb.europa.eu/service/data/${b.flow}/${b.key}?format=csvdata&detail=dataonly&startPeriod=${b.since}`;
    const res = await fetchWithRetry(url, { headers: { Accept: 'text/csv' }, okStatuses: [404] });
    if (res.status === 404) return [];
    const text = await res.text();
    if (!text.trim()) return [];
    const rows = parseSdmxCsv(text, {
      prefix: `ECB.${b.flow}`,
      dataset: b.flow,
      seriesName: b.name,
      countryDims: ['REF_AREA'],
    });
    /* Only the USD crosses are stored for the daily batch: the raw per-euro rates would
       repeat what the monthly EXR batch and the crosses already state. */
    if (b.daily) return ecbUsdCrossRows(rows);
    if (b.flow !== 'AME') return rows;
    return rows.map((r) => ({ ...r, country_iso3: r.country_iso3 || amecoIso3(r.series_key) }));
  },
};

/* ------------------------------------------------------------------ ONS */

export const ONS_SERIES = [
  { cdid: 'L55O', name: 'CPIH annual rate', unit: '%' },
  { cdid: 'D7G7', name: 'CPI annual rate', unit: '%' },
  { cdid: 'MGSX', name: 'Unemployment rate (16+)', unit: '%' },
  { cdid: 'IHYQ', name: 'GDP quarter-on-quarter growth', unit: '%' },
  { cdid: 'ABMI', name: 'GDP, chained volume measures', unit: 'GBP millions' },
];

export function parseOnsSeries(json, s) {
  const out = [];
  for (const [arr, freq] of [
    [json?.months, 'M'],
    [json?.quarters, 'Q'],
    [json?.years, 'A'],
  ]) {
    for (const p of arr || []) {
      const period = normPeriod(
        String(p.date || '')
          .replace(/\s+/g, ' ')
          .trim(),
      );
      const value = toNum(p.value);
      if (!period || value === null || freqOf(period) !== freq) continue;
      out.push({
        series_key: `ONS:${s.cdid}`,
        country_iso3: 'GBR',
        period,
        value,
        series_name: s.name,
        unit: s.unit,
        frequency: freq,
        dataset: s.cdid,
      });
    }
  }
  return out;
}

export const ons = {
  source: 'ons',
  minIntervalMs: 1500,
  attribution: 'Office for National Statistics (Open Government Licence v3.0)',
  buildBatches() {
    return ONS_SERIES.map((s) => ({ ...s, label: `ONS ${s.cdid}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const search = await (
      await fetchWithRetry(
        `https://api.beta.ons.gov.uk/v1/search?content_type=timeseries&cdids=${b.cdid}`,
        { headers: { Accept: 'application/json' } },
      )
    ).json();
    const uri = (search?.items || []).map((i) => i.uri).find(Boolean);
    if (!uri) throw new Error(`ONS ${b.cdid}: series not found`);
    const res = await fetchWithRetry(
      `https://api.beta.ons.gov.uk/v1/data?uri=${encodeURIComponent(uri)}`,
      { headers: { Accept: 'application/json' } },
    );
    return parseOnsSeries(await res.json(), b);
  },
};

/* ------------------------------------------------------------------ Bank of England */

export const BOE_SERIES = [
  { code: 'IUDBEDR', name: 'Bank Rate', unit: '%' },
  { code: 'XUDLUSS', name: 'USD per GBP, spot', unit: 'USD per GBP' },
  { code: 'XUDLERS', name: 'EUR per GBP, spot', unit: 'EUR per GBP' },
];

export function parseBoeCsv(text) {
  assertNotHtml(text, 'bankofengland.co.uk');
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
  const out = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map((c) => c.trim().replace(/"/g, ''));
    const period = normPeriod(cells[0]);
    if (!period) continue;
    header.forEach((code, i) => {
      if (i === 0) return;
      const meta = BOE_SERIES.find((s) => s.code === code);
      const value = toNum(cells[i]);
      if (value === null) return;
      out.push({
        series_key: `BOE:${code}`,
        country_iso3: 'GBR',
        period,
        value,
        series_name: meta?.name || code,
        unit: meta?.unit || null,
        frequency: freqOf(period),
        dataset: 'IADB',
      });
    });
  }
  return out;
}

export const boe = {
  source: 'boe',
  minIntervalMs: 3000,
  attribution: 'Bank of England Database',
  buildBatches() {
    return [{ codes: BOE_SERIES.map((s) => s.code), label: 'BoE IADB' }];
  },
  async fetchBatch(b, fetchWithRetry) {
    const qs = new URLSearchParams({
      'csv.x': 'yes',
      Datefrom: '01/Jan/2010',
      Dateto: 'now',
      SeriesCodes: b.codes.join(','),
      CSVF: 'TN',
      UsingCodes: 'Y',
      VPD: 'Y',
      VFD: 'N',
    });
    const res = await fetchWithRetry(
      `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?${qs}`,
      { headers: BROWSER_HEADERS },
    );
    return parseBoeCsv(await res.text());
  },
};

/* ------------------------------------------------------------------ INSEE */

/* INSEE idbanks: find each series at https://www.insee.fr/en/statistiques/serie/{idbank} or via
   the BDM search; fill these before enabling (the example idbank is from INSEE's own docs). */
export const INSEE_SERIES = [
  { idbank: '010539365', name: 'INSEE series 010539365 (replace with a named series)', unit: null },
];

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  isArray: (n) => n === 'Series' || n === 'Obs',
});

export function parseInseeXml(text) {
  assertNotHtml(text, 'bdm.insee.fr');
  const doc = xml.parse(text);
  const ds = doc?.StructureSpecificData?.DataSet || doc?.GenericData?.DataSet || {};
  const out = [];
  for (const s of ds.Series || []) {
    const meta = INSEE_SERIES.find((x) => x.idbank === s.IDBANK);
    for (const o of s.Obs || []) {
      const period = normPeriod(o.TIME_PERIOD);
      const value = toNum(o.OBS_VALUE);
      if (!period || value === null) continue;
      out.push({
        series_key: `INSEE:${s.IDBANK}`,
        country_iso3: 'FRA',
        period,
        value,
        series_name: meta?.name || s.TITLE_EN || s.TITLE_FR || s.IDBANK,
        unit: meta?.unit || null,
        frequency: freqOf(period),
        dataset: 'SERIES_BDM',
      });
    }
  }
  return out;
}

export const insee = {
  source: 'insee',
  minIntervalMs: 3000,
  attribution: 'INSEE, Banque de données macroéconomiques (Licence Ouverte)',
  buildBatches() {
    return [{ idbanks: INSEE_SERIES.map((s) => s.idbank), label: 'INSEE BDM' }];
  },
  async fetchBatch(b, fetchWithRetry) {
    const res = await fetchWithRetry(
      `https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/${b.idbanks.join('+')}?startPeriod=2010`,
      { headers: { Accept: 'application/xml' } },
    );
    return parseInseeXml(await res.text());
  },
};

/* ------------------------------------------------------------------ Istat */

/* Discover flows with GET https://esploradati.istat.it/SDMXWS/rest/dataflow/IT1 (one call, cache it);
   narrow `key` once the flow's dimension order is known, so responses stay small. */
export const ISTAT_QUERIES = [
  { flow: '115_333', key: 'all', name: 'Consumer price index (NIC)', since: '2020-01' },
];

export const istat = {
  source: 'istat',
  minIntervalMs: 20000, // 5 queries/minute/IP limit, with margin; exceeding it blocks the IP for days
  attribution: 'Istat, Italian National Institute of Statistics (CC BY 3.0)',
  buildBatches() {
    return ISTAT_QUERIES.map((q) => ({ ...q, label: `Istat ${q.flow}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://esploradati.istat.it/SDMXWS/rest/data/IT1,${b.flow},1.0/${b.key}?startPeriod=${b.since}`;
    const res = await fetchWithRetry(url, {
      headers: { Accept: 'application/vnd.sdmx.data+csv;version=1.0.0' },
    });
    const text = await res.text();
    assertNotHtml(text, 'esploradati.istat.it');
    return parseSdmxCsv(text, {
      prefix: `ISTAT.${b.flow}`,
      dataset: b.flow,
      seriesName: b.name,
      countryDims: ['REF_AREA'],
    }).map((r) => ({ ...r, country_iso3: r.country_iso3 || 'ITA' }));
  },
};
