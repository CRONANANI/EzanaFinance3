/**
 * Energy and food sources.
 *
 * eia       EIA API v2 international data. Free key (EIA_API_KEY), passed as api_key in the URL
 *           (not read from headers). 5,000 rows per request; paged with offset/length.
 *           Facet ids: GET https://api.eia.gov/v2/international/facet/{productId|activityId|unit}?api_key=
 * ember     Ember yearly electricity data, bulk long-format CSV (no key, CC BY 4.0). Monthly data
 *           needs a free API key (api.ember-energy.org); add later if Sonar needs monthly power.
 * jodiOil   JODI oil, yearly CSVs; a weekly pass reads the current and previous year only
 *           (backfill older years with scripts/macro-sync-backfill.mjs after widening YEARS_BACK).
 * jodiGas   JODI gas: a catalogue call names the current publication, whose zip holds one CSV.
 * fewsnet   FEWS NET Data Warehouse market prices, public data without login.
 * faostat   FAOSTAT Prices bulk zip (normalized CSV). The new FAOSTAT query API needs an
 *           account; the bulk files do not.
 * JODI columns: REF_AREA (ISO2), TIME_PERIOD (YYYY-MM), ENERGY_PRODUCT, FLOW_BREAKDOWN,
 * UNIT_MEASURE, OBS_VALUE ('-' or 'x' = missing), ASSESSMENT_CODE.
 */
import Papa from 'papaparse';
import { unzipSync, strFromU8 } from 'fflate';
import { toIso3, toNum, normPeriod, freqOf, numericToIso3, assertNotHtml } from '../formats.js';

const parseCsv = (text) =>
  Papa.parse(String(text).replace(/^﻿/, ''), { header: true, skipEmptyLines: true }).data;

/* ------------------------------------------------------------------ EIA */

/* Confirm product/activity/unit ids with the facet endpoints before adding more; a wrong id
   returns zero rows for that batch, never an error. */
export const EIA_SERIES = [
  {
    label: 'Crude oil production',
    activityId: 1,
    productId: 57,
    unit: 'TBPD',
    frequency: 'monthly',
  },
  // { label: 'Petroleum consumption', activityId: 2, productId: <id>, unit: 'TBPD', frequency: 'annual' },
  // { label: 'Dry natural gas production', activityId: 1, productId: <id>, unit: 'BCF', frequency: 'annual' },
];

export const eia = {
  source: 'eia',
  minIntervalMs: 1500,
  requiresEnv: ['EIA_API_KEY'],
  attribution: 'U.S. Energy Information Administration, International Energy Data (public domain)',
  buildBatches() {
    return EIA_SERIES.map((s) => ({ ...s, label: `EIA ${s.label}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const out = [];
    for (let offset = 0; offset < 500000; offset += 5000) {
      const qs = new URLSearchParams({
        api_key: process.env.EIA_API_KEY,
        frequency: b.frequency,
        'data[0]': 'value',
        start: b.frequency === 'monthly' ? '2010-01' : '2000',
        offset: String(offset),
        length: '5000',
      });
      qs.append('facets[activityId][]', String(b.activityId));
      qs.append('facets[productId][]', String(b.productId));
      qs.append('facets[unit][]', b.unit);
      const res = await fetchWithRetry(`https://api.eia.gov/v2/international/data/?${qs}`, {
        headers: { Accept: 'application/json' },
      });
      const json = await res.json();
      const data = json?.response?.data || [];
      for (const r of data) {
        const iso3 = toIso3(r.countryRegionId);
        const period = normPeriod(r.period);
        if (!period) continue;
        out.push({
          series_key: `EIA.${b.activityId}.${b.productId}.${b.unit}:${r.countryRegionId}`,
          country_iso3: iso3,
          period,
          value: toNum(r.value),
          series_name: b.label,
          unit: r.unitName || b.unit,
          frequency: freqOf(period),
          dataset: 'international',
        });
      }
      if (data.length < 5000) break;
    }
    return out;
  },
};

/* ------------------------------------------------------------------ Ember */

const EMBER_YEARLY =
  'https://storage.googleapis.com/emb-prod-bkt-publicdata/public-downloads/yearly_full_release_long_format.csv';
const EMBER_KEEP = new Set([
  'Electricity generation',
  'Electricity demand',
  'Power sector emissions',
  'Capacity',
]);

export function parseEmberYearly(text) {
  const out = [];
  for (const r of parseCsv(text)) {
    if (r['Area type'] && r['Area type'] !== 'Country') continue;
    if (!EMBER_KEEP.has(r.Category)) continue;
    const iso3 = toIso3(r['ISO 3 code']);
    const period = normPeriod(r.Year);
    if (!iso3 || !period) continue;
    const value = toNum(r.Value);
    if (value === null) continue;
    out.push({
      series_key: `EMBER:${iso3}.${r.Category}.${r.Subcategory || ''}.${r.Variable}.${r.Unit}`,
      country_iso3: iso3,
      period,
      value,
      series_name: `${r.Category}: ${r.Variable}`,
      unit: r.Unit || null,
      frequency: 'A',
      dataset: 'yearly_full_release',
    });
  }
  return out;
}

export const ember = {
  source: 'ember',
  minIntervalMs: 2000,
  attribution: 'Ember, Yearly Electricity Data (CC BY 4.0)',
  buildBatches() {
    return [{ label: 'Ember yearly' }];
  },
  async fetchBatch(b, fetchWithRetry) {
    const res = await fetchWithRetry(EMBER_YEARLY, { headers: { Accept: 'text/csv' } });
    return parseEmberYearly(await res.text());
  },
};

/* ------------------------------------------------------------------ JODI */

const JODI_UNITS = new Set(['KBD', 'TJ', 'M3', 'MTOE', 'KTONS']);

export function parseJodiCsv(text, dataset) {
  const out = [];
  for (const r of parseCsv(text)) {
    if (!JODI_UNITS.has(r.UNIT_MEASURE)) continue;
    const period = normPeriod(r.TIME_PERIOD);
    const value = toNum(r.OBS_VALUE);
    if (!period || value === null) continue;
    out.push({
      series_key: `JODI.${dataset}:${r.REF_AREA}.${r.ENERGY_PRODUCT}.${r.FLOW_BREAKDOWN}.${r.UNIT_MEASURE}`,
      country_iso3: toIso3(r.REF_AREA),
      period,
      value,
      series_name: `${r.ENERGY_PRODUCT} ${r.FLOW_BREAKDOWN}`,
      unit: r.UNIT_MEASURE,
      frequency: 'M',
      dataset: `jodi_${dataset}`,
    });
  }
  return out;
}

const YEARS_BACK = 1;
export const jodiOil = {
  source: 'jodi-oil',
  minIntervalMs: 3000,
  attribution: 'JODI, Joint Organisations Data Initiative Oil World Database',
  buildBatches(passDate) {
    const y = passDate.getUTCFullYear();
    const out = [];
    for (const kind of ['primary', 'secondary']) {
      for (let yr = y - YEARS_BACK; yr <= y; yr += 1)
        out.push({ kind, year: yr, current: yr === y, label: `JODI oil ${kind} ${yr}` });
    }
    return out;
  },
  async fetchBatch(b, fetchWithRetry) {
    const base = `https://www.jodidata.org/_resources/files/downloads/oil-data/annual-csv/${b.kind}`;
    const urls = b.current
      ? [`${base}/${b.kind}year${b.year}.csv`, `${base}/${b.year}.csv`]
      : [`${base}/${b.year}.csv`];
    for (const url of urls) {
      const res = await fetchWithRetry(url, { okStatuses: [404] });
      if (res.status === 404) continue;
      const text = await res.text();
      assertNotHtml(text, 'jodidata.org');
      return parseJodiCsv(text, `oil_${b.kind}`);
    }
    return [];
  },
};

export const jodiGas = {
  source: 'jodi-gas',
  minIntervalMs: 3000,
  attribution: 'JODI, Joint Organisations Data Initiative Gas World Database',
  buildBatches() {
    return [{ label: 'JODI gas current publication' }];
  },
  async fetchBatch(b, fetchWithRetry) {
    const cat = await (
      await fetchWithRetry('https://api.publisher.jodidata.org/web/files/gas', {
        headers: { Accept: 'application/json' },
      })
    ).json();
    const pub = cat?.publicationId;
    if (!pub) throw new Error('JODI gas: no publicationId in catalogue');
    const res = await fetchWithRetry(
      `https://www.jodidata.org/jodi-publisher/gas/${pub}/GAS_world_NewFormat.zip`,
    );
    const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
    const name = Object.keys(files).find((f) => /\.csv$/i.test(f));
    if (!name) throw new Error('JODI gas: no CSV in zip');
    return parseJodiCsv(strFromU8(files[name]), 'gas');
  },
};

/* ------------------------------------------------------------------ FEWS NET */

export const FEWS_COUNTRIES = [
  'ET',
  'KE',
  'SO',
  'SD',
  'SS',
  'NG',
  'NE',
  'ML',
  'BF',
  'TD',
  'YE',
  'AF',
  'HT',
  'MZ',
  'MW',
  'ZW',
  'MG',
  'UG',
  'CD',
  'CF',
];

/* Column names differ between FEWS NET exports; pick whichever is present. */
const pick = (r, names) =>
  names.map((n) => r[n]).find((v) => v !== undefined && v !== null && v !== '');

/* What tells two FEWS NET data series apart beyond market, product, unit, currency and price
   type, in the order a suffix uses them. Whichever columns the export carries are used. */
const FEWS_IDENTITY = [
  ['product_source'],
  ['market_id', 'geographic_unit', 'fnid'],
  ['source_organization', 'source_organisation'],
  ['dataseries_specifier'],
  ['dataseries', 'dataseries_id'],
];

const mean = (xs) => Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 1e6) / 1e6;

/**
 * FEWS NET market prices -> one monthly row per series. Two things used to give two rows the
 * same key and month, which failed the whole batch:
 *   1. Markets surveyed weekly or by dekad (West African market systems, among others) carry
 *      several prices a month for the same series. They are averaged into the month.
 *   2. Different data series can share market, product, unit, currency and price type (local
 *      and imported product, two markets with one name, two reporting organisations). When a
 *      key covers more than one, each gets a suffix from the identity columns that differ, so
 *      both survive. Keys with a single series stay exactly as before.
 */
export function parseFewsCsv(text, iso2) {
  const obs = [];
  for (const r of parseCsv(text)) {
    const period = normPeriod(
      String(pick(r, ['period_date', 'collection_date', 'start_date', 'date']) || '').slice(0, 10),
    );
    const value = toNum(pick(r, ['value', 'price']));
    if (!period || value === null) continue;
    const market = pick(r, ['market', 'market_name', 'geographic_unit_name']) || '';
    const product = pick(r, ['product', 'product_name', 'cpcv2_description']) || '';
    const unit = pick(r, ['unit', 'unit_name']) || '';
    const currency = pick(r, ['currency', 'currency_code']) || '';
    const priceType = pick(r, ['price_type']) || '';
    const identity = FEWS_IDENTITY.map((names) => String(pick(r, names) ?? '').trim());
    obs.push({
      base: `FEWS:${iso2}.${market}.${product}.${unit}.${currency}.${priceType}`,
      identity,
      id: identity.join('\u0000'),
      month: period.slice(0, 7),
      value,
      series_name: `${product} price, ${market}`.trim(),
      unit: [currency, unit && `per ${unit}`].filter(Boolean).join(' ') || null,
    });
  }

  // Which base keys cover more than one data series, and which identity columns differ.
  const seriesByBase = new Map();
  for (const o of obs) {
    if (!seriesByBase.has(o.base)) seriesByBase.set(o.base, new Map());
    seriesByBase.get(o.base).set(o.id, o.identity);
  }
  const keyOf = new Map();
  for (const [base, series] of seriesByBase) {
    if (series.size === 1) {
      for (const id of series.keys()) keyOf.set(`${base}\u0001${id}`, { key: base, label: '' });
      continue;
    }
    // The fewest identity columns, taken in order, that tell the series apart.
    const idents = [...series.values()];
    const use = [];
    for (let j = 0; j < FEWS_IDENTITY.length; j += 1) {
      if (new Set(idents.map((x) => x[j])).size > 1) use.push(j);
      if (new Set(idents.map((x) => use.map((u) => x[u]).join('\u0000'))).size === idents.length)
        break;
    }
    for (const [id, ident] of series) {
      const parts = use.map((j) => ident[j]).filter(Boolean);
      // At most one series has none of the distinguishing values; it keeps the plain key.
      keyOf.set(`${base}\u0001${id}`, {
        key: parts.length ? `${base}.${parts.join('.')}` : base,
        label: parts.join(', '),
      });
    }
  }

  const months = new Map();
  for (const o of obs) {
    const { key, label } = keyOf.get(`${o.base}\u0001${o.id}`);
    const k = `${key}\u0000${o.month}`;
    if (!months.has(k)) months.set(k, { key, label, o, values: [] });
    months.get(k).values.push(o.value);
  }
  return [...months.values()].map(({ key, label, o, values }) => ({
    series_key: key,
    country_iso3: toIso3(iso2),
    period: o.month,
    value: values.length === 1 ? values[0] : mean(values),
    series_name: label ? `${o.series_name} (${label})` : o.series_name,
    unit: o.unit,
    frequency: 'M',
    dataset: 'marketpricefacts',
  }));
}

export const fewsnet = {
  source: 'fewsnet',
  minIntervalMs: 3000,
  attribution: 'FEWS NET Data Warehouse (fews.net)',
  buildBatches(passDate) {
    const start = `${passDate.getUTCFullYear() - 3}-01-01`;
    return FEWS_COUNTRIES.map((c) => ({ iso2: c, start, label: `FEWS ${c}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://fdw.fews.net/api/marketpricefacts.csv?country_code=${b.iso2}&start_date=${b.start}`;
    const res = await fetchWithRetry(url, { headers: { Accept: 'text/csv' } });
    const text = await res.text();
    assertNotHtml(text, 'fdw.fews.net');
    return parseFewsCsv(text, b.iso2);
  },
};

/* ------------------------------------------------------------------ FAOSTAT */

const FAO_HOSTS = [
  'https://bulks-faostat.fao.org/production',
  'https://fenixservices.fao.org/faostat/static/bulkdownloads',
];
const FAO_FROM_YEAR = 2010;

export function parseFaoPrices(text) {
  const out = [];
  for (const r of parseCsv(text)) {
    if (!/USD\/tonne|USD per tonne/i.test(String(r.Element || ''))) continue;
    const year = Number(r.Year);
    if (!Number.isInteger(year) || year < FAO_FROM_YEAR) continue;
    const iso3 = numericToIso3(r['Area Code (M49)']);
    if (!iso3) continue;
    const month = String(r.Months || '').trim();
    const period = /annual/i.test(month) || !month ? String(year) : normPeriod(`${month} ${year}`);
    const value = toNum(r.Value);
    if (!period || value === null) continue;
    out.push({
      series_key: `FAO.PP:${iso3}.${r['Item Code']}`,
      country_iso3: iso3,
      period,
      value,
      series_name: `Producer price: ${r.Item}`,
      unit: r.Unit || 'USD/tonne',
      frequency: freqOf(period),
      dataset: 'Prices',
    });
  }
  return out;
}

export const faostat = {
  source: 'faostat',
  minIntervalMs: 3000,
  refreshAfterDays: 14,
  attribution: 'FAO, FAOSTAT (CC BY 4.0)',
  buildBatches() {
    return [{ file: 'Prices_E_All_Data_(Normalized).zip', label: 'FAOSTAT producer prices' }];
  },
  async fetchBatch(b, fetchWithRetry) {
    let lastErr;
    for (const host of FAO_HOSTS) {
      try {
        const res = await fetchWithRetry(
          `${host}/${encodeURIComponent(b.file).replace(/%28/g, '(').replace(/%29/g, ')')}`,
        );
        const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
        const name = Object.keys(files).find(
          (f) => /All_Data.*\.csv$/i.test(f) && !/Flags|Symbols/i.test(f),
        );
        if (!name) throw new Error('FAOSTAT: data CSV not found in zip');
        return parseFaoPrices(strFromU8(files[name]));
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  },
};
