/**
 * Shared parsing helpers for macro-sync adapters: SDMX-CSV, JSON-stat 2.0, Excel sheets,
 * period normalisation and country codes. Pure functions (no network, no database) so the
 * adapter tests can feed them fixtures.
 *
 * Periods are stored as text in one of: 'YYYY', 'YYYY-MM', 'YYYY-Qn', 'YYYY-MM-DD'.
 * Countries are ISO 3166-1 alpha-3; regional aggregates map to null.
 */
import Papa from 'papaparse';
import countries from 'i18n-iso-countries';

/* Country names come from Intl.DisplayNames (built into Node), not the i18n-iso-countries
   locale JSON: importing JSON needs different syntax under Next's bundler and plain node
   (scripts/tests), and the existing adapters avoid it for the same reason. */
const DISPLAY = new Intl.DisplayNames(['en'], { type: 'region' });
const normName = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
let NAME_INDEX = null;
function nameIndex() {
  if (NAME_INDEX) return NAME_INDEX;
  NAME_INDEX = new Map();
  for (const a2 of Object.keys(countries.getAlpha2Codes())) {
    const a3 = countries.alpha2ToAlpha3(a2);
    let name;
    try {
      name = DISPLAY.of(a2);
    } catch {
      name = null;
    }
    if (a3 && name && name !== a2) NAME_INDEX.set(normName(name), a3);
  }
  return NAME_INDEX;
}

/* ------------------------------------------------------------------ countries */

/* Codes some publishers use that are not ISO 3166-1 alpha-2. */
const ALPHA2_FIXES = { EL: 'GRC', UK: 'GBR', XK: 'XKX' };

/** ISO2 or ISO3 (any case) -> ISO3, or null for aggregates and unknown codes. */
export function toIso3(code) {
  if (code === null || code === undefined) return null;
  const c = String(code).trim().toUpperCase();
  if (ALPHA2_FIXES[c]) return ALPHA2_FIXES[c];
  if (/^[A-Z]{2}$/.test(c)) return countries.alpha2ToAlpha3(c) || null;
  if (/^[A-Z]{3}$/.test(c)) return countries.isValid(c) ? c : c === 'XKX' ? c : null;
  return null;
}

/* Names that i18n-iso-countries does not resolve but publishers use. */
const NAME_FIXES = {
  us: 'USA',
  usa: 'USA',
  'united states': 'USA',
  uk: 'GBR',
  'united kingdom': 'GBR',
  korea: 'KOR',
  'south korea': 'KOR',
  'korea rep': 'KOR',
  'republic of korea': 'KOR',
  'mainland china': 'CHN',
  china: 'CHN',
  russia: 'RUS',
  'russian federation': 'RUS',
  iran: 'IRN',
  'iran islamic republic of': 'IRN',
  vietnam: 'VNM',
  'viet nam': 'VNM',
  turkey: 'TUR',
  turkiye: 'TUR',
  'hong kong': 'HKG',
  taiwan: 'TWN',
  'czech republic': 'CZE',
  czechia: 'CZE',
  'ivory coast': 'CIV',
  "cote d'ivoire": 'CIV',
  'democratic republic of the congo': 'COD',
  'dr congo': 'COD',
  'republic of the congo': 'COG',
  congo: 'COG',
  syria: 'SYR',
  laos: 'LAO',
  bolivia: 'BOL',
  venezuela: 'VEN',
  tanzania: 'TZA',
  moldova: 'MDA',
  'north korea': 'PRK',
  palestine: 'PSE',
  'west bank and gaza': 'PSE',
  kosovo: 'XKX',
  eswatini: 'SWZ',
  swaziland: 'SWZ',
  myanmar: 'MMR',
  burma: 'MMR',
  'korea dpr': 'PRK',
  'korea dem peoples rep': 'PRK',
  "democratic people's republic of korea": 'PRK',
  'democratic peoples republic of korea': 'PRK',
  'democratic people s republic of korea': 'PRK',
  'cabo verde': 'CPV',
  'cape verde': 'CPV',
};

/** Country name -> ISO3, or null. Strips parenthetical qualifiers ("Bolivia (Plurinational State of)"). */
export function nameToIso3(name) {
  if (!name) return null;
  const raw = String(name).trim();
  const key = normName(raw);
  if (NAME_FIXES[key]) return NAME_FIXES[key];
  const clean = normName(raw.replace(/\s*\(.*?\)\s*/g, ' '));
  if (NAME_FIXES[clean]) return NAME_FIXES[clean];
  const idx = nameIndex();
  return idx.get(key) || idx.get(clean) || idx.get(clean.replace(/^the /, '')) || null;
}

/** ISO3 -> English name (for Sonar copy). */
export function iso3Name(iso3) {
  if (!iso3) return null;
  const a2 = countries.alpha3ToAlpha2(iso3);
  try {
    return (a2 && DISPLAY.of(a2)) || iso3;
  } catch {
    return iso3;
  }
}

/** M49 / ISO numeric ("'004", "4", 4) -> ISO3. */
export function numericToIso3(code) {
  const n = String(code ?? '').replace(/[^0-9]/g, '');
  if (!n) return null;
  return countries.numericToAlpha3(n.padStart(3, '0')) || null;
}

/* ------------------------------------------------------------------ periods */

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  ene: 1,
  abr: 4,
  ago: 8,
  set: 9,
  dic: 12,
  fev: 2,
  mai: 5,
  out: 10,
  dez: 12,
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};
const pad = (n) => String(n).padStart(2, '0');

/**
 * Normalise the many period spellings publishers use.
 *   2024, '2024' -> '2024'          2024-M03, 2024M03, 202403, '2024 MAR', 'Mar.2024', '2024 Jan' -> '2024-03'
 *   2024-Q1, 2024Q1, '2024 Q1', '2024 1Q', 1952q1 -> '2024-Q1'
 *   2024-03-15, 20240315, '15/03/2024', '2024-03-15T00:00:00' -> '2024-03-15'
 * Returns null when nothing matches.
 */
export function normPeriod(p) {
  if (p === null || p === undefined) return null;
  const s = String(p).trim();
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  if ((m = /^(\d{4})$/.exec(s))) return m[1];
  if ((m = /^(\d{4})[-\s]?M(\d{1,2})$/i.exec(s))) return `${m[1]}-${pad(m[2])}`;
  if ((m = /^(\d{4})-(\d{2})$/.exec(s))) return `${m[1]}-${m[2]}`;
  if ((m = /^(\d{4})(\d{2})$/.exec(s)) && Number(m[2]) <= 12) return `${m[1]}-${m[2]}`;
  if ((m = /^(\d{4})[-\s]?Q([1-4])$/i.exec(s))) return `${m[1]}-Q${m[2]}`;
  if ((m = /^(\d{4})\s+([1-4])Q$/i.exec(s))) return `${m[1]}-Q${m[2]}`;
  if ((m = /^(\d{4})[-\s]+([A-Za-zÀ-ÿ]{3,9})\.?$/.exec(s)) && MONTHS[m[2].toLowerCase()])
    return `${m[1]}-${pad(MONTHS[m[2].toLowerCase()])}`;
  if ((m = /^([A-Za-zÀ-ÿ]{3,9})[.\s-]*(\d{4})$/.exec(s)) && MONTHS[m[1].toLowerCase()])
    return `${m[2]}-${pad(MONTHS[m[1].toLowerCase()])}`;
  if ((m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(s)) && MONTHS[m[2].toLowerCase()])
    return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(m[1])}`;
  if ((m = /^(\d{4})-W\d{2}$/.exec(s))) return null;
  return null;
}

/** Frequency letter from a normalised period. */
export function freqOf(period) {
  if (!period) return null;
  if (/^\d{4}$/.test(period)) return 'A';
  if (/-Q[1-4]$/.test(period)) return 'Q';
  if (/^\d{4}-\d{2}$/.test(period)) return 'M';
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return 'D';
  return null;
}

/**
 * 'YYYY-MM-DD' a whole number of years before `date` (UTC). Rolling windows ("the last two
 * years") start here; adapters pass the pass start date so the batch list stays deterministic.
 */
export function yearsBefore(date, years) {
  const d = new Date(date);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

/** Excel serial date (1900 system) -> 'YYYY-MM-DD'. */
export function excelSerialToDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n < 1) return null;
  const ms = Math.round((n - 25569) * 864e5);
  return new Date(ms).toISOString().slice(0, 10);
}

/** A number or null; accepts decimal commas, thousands separators and placeholder strings. */
export function toNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s || /^(n\.?d\.?|na|n\/a|nan|-|x|\.\.|…|null)$/i.test(s)) return null;
  const cleaned = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)
    ? s.replace(/,/g, '')
    : s.replace(',', '.');
  const n = Number(cleaned.replace(/\s/g, ''));
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ SDMX-CSV */

const SDMX_NON_DIM =
  /^(STRUCTURE|STRUCTURE_ID|STRUCTURE_NAME|ACTION|DATAFLOW|KEY|TIME_PERIOD|OBS_VALUE|LAST UPDATE|OBS_.*|.*_STATUS|CONF_.*|UNIT_MULT|DECIMALS|TITLE.*|COMMENT.*|SOURCE.*|COLLECTION|TIME_FORMAT|COMPILATION.*|BREAKS.*|AVAILABILITY|NAT_TITLE|BASE_PER|PUBL_.*|DOM_SER_IDS|UNIT_INDEX_BASE|SERIES_DENOM|EMBARGO.*|FLAG.*|SCALE|UNIT_MEASURE_NAME)$/i;
const COUNTRY_DIMS = [
  'REF_AREA',
  'COUNTRY',
  'GEO',
  'BORROWERS_CTY',
  'JURISDICTION',
  'L_REP_CTY',
  'COUNTERPART_AREA_NOT',
];

/**
 * SDMX-CSV text -> macro rows. Works for BIS, IMF, OECD (format=csvfile), ECB (csvdata),
 * Eurostat (format=SDMX-CSV) and Istat. Dimension columns form the series key; attributes and
 * observation flags are dropped. `opts`:
 *   prefix      series_key prefix, e.g. 'IMF.WEO'
 *   dataset     stored in the dataset column
 *   seriesName  stored in series_name (falls back to the INDICATOR/MEASURE code)
 *   unit        stored in unit (falls back to UNIT/UNIT_MEASURE column)
 *   countryDims override the dimension(s) holding the country
 */
export function parseSdmxCsv(text, opts = {}) {
  const { data, meta } = Papa.parse(String(text || '').replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: true,
  });
  const fields = meta.fields || [];
  const upper = Object.fromEntries(fields.map((f) => [f.toUpperCase(), f]));
  const timeCol = upper.TIME_PERIOD;
  const valCol = upper.OBS_VALUE;
  if (!timeCol || !valCol) return [];
  const dims = fields.filter((f) => !SDMX_NON_DIM.test(f.trim()));
  const cDims = (opts.countryDims || COUNTRY_DIMS)
    .map((d) => upper[d.toUpperCase()])
    .filter(Boolean);
  const unitCol = upper.UNIT_MEASURE || upper.UNIT || upper.UNIT_TYPE;
  const nameCol = upper.INDICATOR || upper.MEASURE || upper.NA_ITEM;
  const out = [];
  for (const r of data) {
    const period = normPeriod(r[timeCol]);
    const value = toNum(r[valCol]);
    if (!period || value === null) continue;
    const country = cDims.map((d) => r[d]).find(Boolean);
    out.push({
      series_key: `${opts.prefix || 'SDMX'}:${dims.map((d) => r[d]).join('.')}`,
      country_iso3: toIso3(country),
      period,
      value,
      series_name: opts.seriesName || (nameCol ? r[nameCol] : null) || null,
      unit: opts.unit || (unitCol ? r[unitCol] : null) || null,
      frequency: freqOf(period),
      dataset: opts.dataset || null,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ JSON-stat 2.0 (Eurostat) */

/**
 * Decode a JSON-stat 2.0 dataset into flat observations:
 *   [{ coords: { geo: 'FR', time: '2024', unit: 'CP_MEUR', ... }, value }]
 * Handles sparse `value` objects and dense arrays (row-major over `id`/`size`).
 */
export function decodeJsonStat(js) {
  const ids = js?.id || [];
  const size = js?.size || [];
  const dims = ids.map((id) => {
    const idx = js.dimension?.[id]?.category?.index || {};
    const byPos = [];
    if (Array.isArray(idx))
      idx.forEach((code, i) => {
        byPos[i] = code;
      });
    else for (const [code, pos] of Object.entries(idx)) byPos[pos] = code;
    return byPos;
  });
  const strides = size.map((_, i) => size.slice(i + 1).reduce((a, b) => a * b, 1));
  const values = js?.value || {};
  const entries = Array.isArray(values)
    ? values.map((v, i) => [i, v])
    : Object.entries(values).map(([k, v]) => [Number(k), v]);
  const out = [];
  for (const [flat, value] of entries) {
    if (value === null || value === undefined) continue;
    const coords = {};
    let rem = flat;
    ids.forEach((id, i) => {
      const pos = Math.floor(rem / strides[i]);
      rem %= strides[i];
      coords[id] = dims[i][pos];
    });
    out.push({ coords, value });
  }
  return out;
}

/* ------------------------------------------------------------------ Excel */

/**
 * Read a workbook (xlsx or legacy xls) into { sheetName: rows[][] }. Requires SheetJS
 * ('xlsx', installed from the npm registry, 0.18.5; the official CDN build, 0.20.3,
 * will replace it once it can be downloaded). Imported lazily so routes that never
 * parse Excel don't load it; only the four spreadsheet adapters (gpr, epu, wui,
 * pinksheet) use it.
 */
export async function readWorkbook(buffer) {
  let XLSX;
  try {
    XLSX = await import(/* webpackIgnore: true */ 'xlsx');
  } catch (e) {
    throw new Error(
      `SheetJS ('xlsx') could not be loaded; run npm install so the xlsx dependency in package.json is present (${e.code || e.message})`,
    );
  }
  const lib = XLSX.read ? XLSX : XLSX.default;
  const wb = lib.read(buffer, { type: 'buffer', cellDates: false });
  const out = {};
  for (const name of wb.SheetNames) {
    out[name] = lib.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
  }
  return out;
}

/** First absolute URL in `html` matching `pattern` (a RegExp source or RegExp). */
export function findLink(html, pattern, base) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
  const hrefs = [...String(html || '').matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const hit = hrefs.find((h) => re.test(h));
  if (!hit) return null;
  try {
    return new URL(hit.replace(/&amp;/g, '&'), base).toString();
  } catch {
    return null;
  }
}

/** Throw a non-retryable error when a "successful" response is actually HTML or empty. */
export function assertNotHtml(text, host) {
  const head = String(text || '')
    .slice(0, 400)
    .trimStart()
    .toLowerCase();
  if (!head) throw new Error(`${host}: empty response`);
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) {
    throw new Error(
      `${host}: returned an HTML page instead of data (blocked, maintenance or bad request)`,
    );
  }
}

/** Browser-like headers for publishers that reject library user agents (BoE, SARB, SingStat, Stats SA). */
export const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; EzanaFinanceDataSync/1.0; +https://ezana.world)',
  Accept: 'application/json, text/csv, text/plain, */*',
};
