/**
 * African and Asian central banks and statistics offices with a usable public API.
 *
 * sarb      South African Reserve Bank Web API (keyless; send a browser User-Agent). Always pass
 *           a date range: the bare /{code} form returns only the last 25 observations.
 *           /SarbWebApi/WebIndicators/Shared/GetTimeseriesObservations/{code}/{from}/{to}
 *           -> [{ Period, Value, ... }] newest first.
 * cbn       Central Bank of Nigeria, undocumented REST (keyless): GET /api/GetAll{Dataset}
 *           returns the FULL history (FX ~8 MB). Redistribution allowed with attribution.
 *           FX fields: currency, ratedate, centralrate. Other datasets (InflationRates,
 *           MoneyMarketIndicators, ...) have their own fields: inspect one response, then add a
 *           parser entry to CBN_DATASETS.
 * boj       Bank of Japan Time-Series Data Search API (launched 18 Feb 2026, keyless):
 *           /api/v1/getDataCode?format=json&lang=en&db=&code=&startDate=YYYYMM
 *           Up to 250 series/60k points per call, one frequency per call, at least 1 s between calls.
 *           TERMS: show the credit line in BOJ_CREDIT wherever the data appears, and email
 *           post.rsd17@boj.or.jp when the feature that uses it is released.
 * singstat  SingStat Table Builder (keyless; browser UA): /api/table/tabledata/{tableId}
 *           ~5,000 cells per response, silently truncated; 403 after ~200 rapid calls.
 * mospi     India MoSPI eSankhyiki API (keyless in practice): https://api.mospi.gov.in/api/cpi/getCPIIndex
 *           Throttling returns HTTP 200 with an EMPTY body (treated as retryable). The server
 *           needs legacy TLS renegotiation: if Node's fetch fails with an SSL error, route these
 *           calls through an undici Agent with
 *           connect: { secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT }.
 */
import { toNum, normPeriod, freqOf, assertNotHtml, BROWSER_HEADERS } from '../formats.js';

/* ------------------------------------------------------------------ SARB */

export const SARB_SERIES = [
  { code: 'EXCX135D', name: 'USD/ZAR exchange rate', unit: 'ZAR per USD' },
  { code: 'MMRD002A', name: 'Repo rate', unit: '%' },
  { code: 'MMRD403A', name: 'JIBAR 3-month rate', unit: '%' },
];

export function parseSarb(json, s) {
  return (Array.isArray(json) ? json : [])
    .map((o) => {
      const period = normPeriod(String(o.Period || o.Date || '').slice(0, 10));
      const value = toNum(o.Value);
      return period && value !== null
        ? {
            series_key: `SARB:${s.code}`,
            country_iso3: 'ZAF',
            period,
            value,
            series_name: s.name,
            unit: s.unit,
            frequency: freqOf(period),
            dataset: 'SarbWebApi',
          }
        : null;
    })
    .filter(Boolean);
}

export const sarb = {
  source: 'sarb',
  minIntervalMs: 1500,
  attribution: 'South African Reserve Bank',
  buildBatches(passDate) {
    const to = passDate.toISOString().slice(0, 10);
    return SARB_SERIES.map((s) => ({ ...s, from: '2015-01-01', to, label: `SARB ${s.code}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://custom.resbank.co.za/SarbWebApi/WebIndicators/Shared/GetTimeseriesObservations/${b.code}/${b.from}/${b.to}`;
    const res = await fetchWithRetry(url, { headers: BROWSER_HEADERS });
    const text = await res.text();
    assertNotHtml(text, 'custom.resbank.co.za');
    return parseSarb(JSON.parse(text), b);
  },
};

/* ------------------------------------------------------------------ CBN (Nigeria) */

const CBN_FX_KEEP = /dollar|euro|pound|yuan|yen|franc|riyal|rand/i;

/**
 * The full history lists some currencies twice on the same date (a rate posted again, or the
 * same currency spelt with different case or spacing, which share one key). That is one
 * series with one central rate per day, so one row is kept per currency and date: the
 * record posted last (highest id), or, without ids, the first listed, as the feed runs
 * newest first. Two rows for one key and date used to fail the whole upsert.
 */
export function parseCbnFx(json) {
  const byKey = new Map();
  for (const r of Array.isArray(json) ? json : []) {
    const currency = String(r.currency || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!currency || !CBN_FX_KEEP.test(currency)) continue;
    const period = normPeriod(String(r.ratedate || '').slice(0, 10));
    const value = toNum(r.centralrate);
    if (!period || value === null) continue;
    const series_key = `CBN.FX:${currency.toUpperCase().replace(/\s+/g, '_')}`;
    const id = Number(r.id);
    const k = `${series_key}|${period}`;
    const prev = byKey.get(k);
    if (prev && !(Number.isFinite(id) && Number.isFinite(prev.id) && id > prev.id)) continue;
    byKey.set(k, {
      id,
      row: {
        series_key,
        country_iso3: 'NGA',
        period,
        value,
        series_name: `NGN per ${currency.toUpperCase()} (CBN central rate)`,
        unit: 'NGN',
        frequency: 'D',
        dataset: 'ExchangeRates',
      },
    });
  }
  return [...byKey.values()].map((e) => e.row);
}

export const CBN_DATASETS = [{ name: 'ExchangeRates', parse: parseCbnFx, sinceYear: 2015 }];

export const cbn = {
  source: 'cbn',
  minIntervalMs: 3000,
  attribution: 'Central Bank of Nigeria',
  buildBatches() {
    return CBN_DATASETS.map((d) => ({ name: d.name, label: `CBN ${d.name}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const def = CBN_DATASETS.find((d) => d.name === b.name);
    const res = await fetchWithRetry(`https://www.cbn.gov.ng/api/GetAll${b.name}`, {
      headers: BROWSER_HEADERS,
    });
    const text = await res.text();
    assertNotHtml(text, 'cbn.gov.ng');
    return def.parse(JSON.parse(text)).filter((r) => Number(r.period.slice(0, 4)) >= def.sinceYear);
  },
};

/* ------------------------------------------------------------------ Bank of Japan */

export const BOJ_CREDIT =
  'This service uses the API provided by the "Bank of Japan Time-Series Data Search". The content of this service is not guaranteed by the Bank of Japan.';

/* db/code pairs: browse https://www.stat-search.boj.or.jp (or getMetadata?db=) and add. One
   frequency per entry. FM08/FXERD04 is the example used in BOJ's own documentation. */
export const BOJ_QUERIES = [
  { db: 'FM08', codes: ['FXERD04'], name: 'BOJ FM08 foreign exchange series', start: '201501' },
];

export function parseBoj(json, q) {
  const out = [];
  for (const s of json?.RESULTSET || []) {
    const dates = s?.VALUES?.SURVEY_DATES || [];
    const vals = s?.VALUES?.VALUES || [];
    dates.forEach((d, i) => {
      const period = normPeriod(String(d));
      const value = toNum(vals[i]);
      if (!period || value === null) return;
      out.push({
        series_key: `BOJ.${q.db}:${s.SERIES_CODE}`,
        country_iso3: 'JPN',
        period,
        value,
        series_name: s.NAME_OF_TIME_SERIES || s.NAME || `${q.name} ${s.SERIES_CODE}`,
        unit: s.UNIT || null,
        frequency: freqOf(period),
        dataset: q.db,
      });
    });
  }
  return out;
}

export const boj = {
  source: 'boj',
  minIntervalMs: 1500,
  attribution: BOJ_CREDIT,
  buildBatches() {
    return BOJ_QUERIES.map((q) => ({ ...q, label: `BOJ ${q.db}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const out = [];
    let position = null;
    for (let i = 0; i < 20; i += 1) {
      const qs = new URLSearchParams({
        format: 'json',
        lang: 'en',
        db: b.db,
        code: b.codes.join(','),
        startDate: b.start,
      });
      if (position) qs.set('startPosition', String(position));
      const json = await (
        await fetchWithRetry(`https://www.stat-search.boj.or.jp/api/v1/getDataCode?${qs}`, {
          headers: { Accept: 'application/json' },
        })
      ).json();
      if (json?.MESSAGEID === 'M181030I') break; // no data
      out.push(...parseBoj(json, b));
      position = json?.NEXTPOSITION;
      if (!position) break;
    }
    return out;
  },
};

/* ------------------------------------------------------------------ SingStat */

/* Table ids from tablebuilder.singstat.gov.sg (the id is in the table URL). M213751 = CPI. */
export const SINGSTAT_TABLES = [{ id: 'M213751', name: 'Consumer price index' }];

export function parseSingstat(json, t) {
  const out = [];
  for (const row of json?.Data?.row || []) {
    for (const c of row.columns || []) {
      const period = normPeriod(String(c.key || '').trim());
      const value = toNum(c.value);
      if (!period || value === null) continue;
      out.push({
        series_key: `SINGSTAT.${t.id}:${row.seriesNo}`,
        country_iso3: 'SGP',
        period,
        value,
        series_name: `${t.name}: ${row.rowText}`,
        unit: row.uoM || null,
        frequency: freqOf(period),
        dataset: t.id,
      });
    }
  }
  return out;
}

export const singstat = {
  source: 'singstat',
  minIntervalMs: 3000,
  attribution: 'Department of Statistics Singapore, SingStat Table Builder',
  buildBatches() {
    return SINGSTAT_TABLES.map((t) => ({ ...t, label: `SingStat ${t.id}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const res = await fetchWithRetry(
      `https://tablebuilder.singstat.gov.sg/api/table/tabledata/${b.id}`,
      { headers: { ...BROWSER_HEADERS, Accept: 'application/json' } },
    );
    const text = await res.text();
    assertNotHtml(text, 'tablebuilder.singstat.gov.sg');
    return parseSingstat(JSON.parse(text), b);
  },
};

/* ------------------------------------------------------------------ MoSPI (India) */

export function parseMospiCpi(json) {
  const out = [];
  for (const r of json?.data || []) {
    // Keep the all-India headline only; state and item detail can be added later.
    if (!/all india/i.test(String(r.state || ''))) continue;
    if (r.group && !/general/i.test(String(r.group))) continue;
    const period = normPeriod(`${r.month} ${r.year}`);
    if (!period) continue;
    const sector = String(r.sector || 'Combined').trim();
    for (const [field, label, unit] of [
      ['index', 'CPI index', 'index (2012=100)'],
      ['inflation', 'CPI inflation', '% y/y'],
    ]) {
      const value = toNum(r[field]);
      if (value === null) continue;
      out.push({
        series_key: `MOSPI.CPI.${field}:${sector.toUpperCase()}`,
        country_iso3: 'IND',
        period,
        value,
        series_name: `${label}, ${sector}`,
        unit,
        frequency: 'M',
        dataset: 'cpi',
      });
    }
  }
  return out;
}

export const mospi = {
  source: 'mospi',
  minIntervalMs: 3000,
  attribution: 'Ministry of Statistics and Programme Implementation (MoSPI), Government of India',
  buildBatches(passDate) {
    const y = passDate.getUTCFullYear();
    return [y - 1, y].map((year) => ({ year, label: `MoSPI CPI ${year}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://api.mospi.gov.in/api/cpi/getCPIIndex?base_year=2012&series=Current&year=${b.year}&Format=JSON&limit=40000`;
    const res = await fetchWithRetry(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    if (!text.trim()) {
      const err = new Error('MoSPI: empty body (throttled)');
      err.retryable = true;
      throw err;
    }
    return parseMospiCpi(JSON.parse(text));
  },
};
