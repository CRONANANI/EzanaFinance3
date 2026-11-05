/**
 * Uncertainty and risk indices published as spreadsheets, plus the World Bank Pink Sheet.
 * All need SheetJS ('xlsx') via readWorkbook.
 *
 *  gpr  Caldara-Iacoviello Geopolitical Risk index (monthly). Stable URL; mirrored on GitHub.
 *       Sheet1: month (Excel serial), GPR, GPRT, GPRA, ..., GPRC_{ISO3} (44 countries).
 *       Also mirrors GPR/GPRC into lighthouse_observations, which the live
 *       /datasets/geopolitical-risk page reads (no loader for it existed in the repo).
 *  epu  Economic Policy Uncertainty, All_Country_Data.xlsx: Year, Month, GEPU_current,
 *       GEPU_ppp, then one column per country NAME. Notes rows at the bottom are dropped.
 *       China has two columns (China, Mainland China): see epuCountryColumns.
 *  wui  World Uncertainty Index (quarterly). The file path changes every release, so the
 *       link is scraped from the site's data page. Wide: a date column then ISO3 columns.
 *  pinksheet  World Bank commodity prices, monthly. The file hash changes yearly, so the link
 *       is scraped from the commodity-markets page. "Monthly Prices": header rows, then
 *       rows of '1960M01', price, price, ...
 * Licences: GPR and EPU ask for citation of the papers; WUI states none; Pink Sheet CC BY 4.0.
 */
import {
  readWorkbook,
  excelSerialToDate,
  toNum,
  nameToIso3,
  toIso3,
  iso3Name,
  findLink,
  normPeriod,
  freqOf,
} from '../formats.js';

const monthOf = (isoDate) => (isoDate ? isoDate.slice(0, 7) : null);

/* ------------------------------------------------------------------ GPR */

const GPR_URLS = [
  'https://www.matteoiacoviello.com/gpr_files/data_gpr_export.xls',
  'https://raw.githubusercontent.com/iacoviel/iacoviel.github.io/master/gpr_files/data_gpr_export.xls',
];
const GPR_GLOBAL = {
  GPR: 'Geopolitical risk index',
  GPRT: 'Geopolitical threats',
  GPRA: 'Geopolitical acts',
};
const GPR_FROM = '1985-01';

/* lighthouse_observations conventions for source 'gpr'. CONFIRM against the rows already in the
   table (select distinct indicator, ref_area, frequency from lighthouse_observations where
   source = 'gpr' limit 20) and adjust before enabling the mirror. */
export const GPR_MIRROR = {
  enabled: true,
  globalRefArea: 'WLD',
  countryRefArea: (iso3) => iso3,
  frequency: 'monthly',
};

export function parseGprSheet(rows) {
  const [header, ...body] = rows;
  if (!header) return [];
  const col = Object.fromEntries(header.map((h, i) => [String(h || '').trim(), i]));
  if (col.month === undefined) throw new Error('GPR: no "month" column');
  const out = [];
  for (const r of body) {
    const date = excelSerialToDate(r[col.month]);
    const period = monthOf(date);
    if (!period || period < GPR_FROM) continue;
    for (const [code, name] of Object.entries(GPR_GLOBAL)) {
      if (col[code] === undefined) continue;
      const value = toNum(r[col[code]]);
      if (value === null) continue;
      out.push({
        series_key: `GPR.${code}:WLD`,
        country_iso3: null,
        period,
        value,
        series_name: name,
        unit: 'index',
        frequency: 'M',
        dataset: 'gpr_monthly',
      });
    }
    for (const [h, i] of Object.entries(col)) {
      const m = /^GPRC_([A-Z]{3})$/.exec(h);
      if (!m) continue;
      const value = toNum(r[i]);
      if (value === null) continue;
      out.push({
        series_key: `GPR.GPRC:${m[1]}`,
        country_iso3: toIso3(m[1]) || m[1],
        period,
        value,
        series_name: 'Country geopolitical risk index',
        unit: 'index (share of articles)',
        frequency: 'M',
        dataset: 'gpr_monthly',
      });
    }
  }
  return out;
}

async function mirrorGprToLighthouse(db, rows) {
  if (!GPR_MIRROR.enabled) return;
  const now = new Date().toISOString();
  const lh = rows
    .filter((r) => r.series_key.startsWith('GPR.GPR:') || r.series_key.startsWith('GPR.GPRC:'))
    .map((r) => {
      const isGlobal = r.series_key.startsWith('GPR.GPR:');
      return {
        source: 'gpr',
        indicator: isGlobal ? 'GPR' : 'GPRC',
        ref_area: isGlobal ? GPR_MIRROR.globalRefArea : GPR_MIRROR.countryRefArea(r.country_iso3),
        ref_area_name: isGlobal ? 'World' : iso3Name(r.country_iso3),
        period: `${r.period}-01`,
        frequency: GPR_MIRROR.frequency,
        value: r.value,
        unit: 'index',
        synced_at: now,
      };
    });
  for (let i = 0; i < lh.length; i += 1000) {
    const { error } = await db
      .from('lighthouse_observations')
      .upsert(lh.slice(i, i + 1000), { onConflict: 'source,indicator,ref_area,period' });
    if (error) throw new Error(`lighthouse_observations (gpr mirror): ${error.message}`);
  }
}

export const gpr = {
  source: 'gpr',
  minIntervalMs: 2000,
  attribution:
    'Caldara, Dario and Matteo Iacoviello (2022), "Measuring Geopolitical Risk," American Economic Review',
  buildBatches() {
    return [{ label: 'GPR monthly' }];
  },
  async fetchBatch(b, fetchWithRetry) {
    let lastErr;
    for (const url of GPR_URLS) {
      try {
        const res = await fetchWithRetry(url);
        const sheets = await readWorkbook(Buffer.from(await res.arrayBuffer()));
        return parseGprSheet(Object.values(sheets)[0]);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  },
  afterBatch: mirrorGprToLighthouse,
};

/* ------------------------------------------------------------------ EPU */

const EPU_URL = 'https://www.policyuncertainty.com/media/All_Country_Data.xlsx';
const EPU_NAME_FIXES = {
  'SCMP China': 'CHN',
  'Mainland China': 'CHN',
  US: 'USA',
  UK: 'GBR',
  Korea: 'KOR',
};

const words = (s) =>
  String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/**
 * Country column -> { key, iso3, name }. Two columns can name the same country: the file
 * carries both "China" (Baker, Bloom and Davis, read from the South China Morning Post) and
 * "Mainland China" (Davis, Liu and Sheng, mainland newspapers, from 2000). Both used to land
 * on EPU.EPU:CHN, which made every batch from 2000 on fail. Each is its own index, so each
 * keeps its own key: the column named plainly after the country keeps EPU.EPU:{ISO3}, and a
 * qualified one gets the qualifier, e.g. EPU.EPU_MAINLAND:CHN. With no plain column the
 * first one keeps the plain key.
 */
export function epuCountryColumns(header) {
  const byIso = new Map();
  header.forEach((h, i) => {
    if (i < 2 || !h || h.startsWith('GEPU')) return;
    const iso3 = h in EPU_NAME_FIXES ? EPU_NAME_FIXES[h] : nameToIso3(h);
    if (!iso3) return;
    if (!byIso.has(iso3)) byIso.set(iso3, []);
    byIso.get(iso3).push({ i, h });
  });
  const cols = new Map();
  for (const [iso3, group] of byIso) {
    const country = new Set(words(iso3Name(iso3)));
    const qualifier = (h) => words(h).filter((w) => !country.has(w));
    const plain = group.find((c) => qualifier(c.h).length === 0) || group[0];
    const used = new Set();
    for (const c of group) {
      let key = `EPU.EPU:${iso3}`;
      let name = 'Economic policy uncertainty index';
      if (c !== plain) {
        const q = (qualifier(c.h).join('_') || words(c.h).join('_')).toUpperCase();
        key = `EPU.EPU_${q}:${iso3}`;
        if (used.has(key)) key = `EPU.EPU_${q}_${c.i}:${iso3}`;
        name = `Economic policy uncertainty index (${c.h})`;
      }
      used.add(key);
      cols.set(c.i, { key, iso3, name });
    }
  }
  return cols;
}

export function parseEpuSheet(rows) {
  const headerIdx = rows.findIndex(
    (r) => r && String(r[0]).trim() === 'Year' && String(r[1]).trim() === 'Month',
  );
  if (headerIdx < 0) throw new Error('EPU: header row (Year, Month) not found');
  const header = rows[headerIdx].map((h) => (h === null ? '' : String(h).trim()));
  const countryCols = epuCountryColumns(header);
  const out = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const y = Number(r[0]);
    const m = Number(r[1]);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) continue;
    const period = `${y}-${String(m).padStart(2, '0')}`;
    header.forEach((h, i) => {
      if (i < 2 || !h) return;
      const value = toNum(r[i]);
      if (value === null) return;
      if (h.startsWith('GEPU')) {
        out.push({
          series_key: `EPU.${h}:WLD`,
          country_iso3: null,
          period,
          value,
          series_name: `Global economic policy uncertainty (${h.endsWith('ppp') ? 'PPP' : 'current'} weights)`,
          unit: 'index',
          frequency: 'M',
          dataset: 'epu_all_country',
        });
        return;
      }
      const col = countryCols.get(i);
      if (!col) return;
      out.push({
        series_key: col.key,
        country_iso3: col.iso3,
        period,
        value,
        series_name: col.name,
        unit: 'index',
        frequency: 'M',
        dataset: 'epu_all_country',
      });
    });
  }
  return out;
}

export const epu = {
  source: 'epu',
  minIntervalMs: 2000,
  attribution: 'Baker, Bloom and Davis, Economic Policy Uncertainty (policyuncertainty.com)',
  buildBatches() {
    return [{ label: 'EPU all countries' }];
  },
  async fetchBatch(b, fetchWithRetry) {
    const res = await fetchWithRetry(EPU_URL);
    const sheets = await readWorkbook(Buffer.from(await res.arrayBuffer()));
    return parseEpuSheet(Object.values(sheets)[0]);
  },
};

/* ------------------------------------------------------------------ WUI */

const WUI_PAGE = 'https://worlduncertaintyindex.com/data/';
const WUI_FALLBACK = 'https://www.policyuncertainty.com/media/WUI_Data.xlsx';

/** Pick the sheet with the most ISO3-looking column headers, and parse it. */
export function parseWuiWorkbook(sheets) {
  let best = null;
  for (const [name, rows] of Object.entries(sheets)) {
    for (let h = 0; h < Math.min(rows.length, 10); h += 1) {
      const hdr = rows[h] || [];
      const isoCols = hdr.filter(
        (c) => typeof c === 'string' && /^[A-Z]{3}$/.test(c.trim()) && toIso3(c.trim()),
      ).length;
      if (!best || isoCols > best.isoCols) best = { name, headerIdx: h, isoCols };
    }
  }
  if (!best || best.isoCols < 20) throw new Error('WUI: no sheet with country columns found');
  const rows = sheets[best.name];
  const header = rows[best.headerIdx].map((c) => (c === null ? '' : String(c).trim()));
  const out = [];
  for (const r of rows.slice(best.headerIdx + 1)) {
    const raw = r[0];
    const period =
      typeof raw === 'number' && raw > 20000 ? monthOf(excelSerialToDate(raw)) : normPeriod(raw);
    if (!period) continue;
    header.forEach((h, i) => {
      if (i === 0) return;
      const iso3 = /^[A-Z]{3}$/.test(h) ? toIso3(h) : null;
      if (!iso3) return;
      const value = toNum(r[i]);
      if (value === null) return;
      out.push({
        series_key: `WUI.WUI:${iso3}`,
        country_iso3: iso3,
        period,
        value,
        series_name: 'World uncertainty index',
        unit: 'index',
        frequency: freqOf(period),
        dataset: best.name,
      });
    });
  }
  return out;
}

export const wui = {
  source: 'wui',
  minIntervalMs: 2000,
  attribution: 'Ahir, Bloom and Furceri, World Uncertainty Index (worlduncertaintyindex.com)',
  buildBatches() {
    return [{ label: 'WUI quarterly' }];
  },
  async fetchBatch(b, fetchWithRetry) {
    let url = null;
    try {
      const page = await fetchWithRetry(WUI_PAGE, { headers: { Accept: 'text/html' } });
      url = findLink(await page.text(), /WUI_Data[^"']*\.xlsx$/i, WUI_PAGE);
    } catch {
      url = null;
    }
    const res = await fetchWithRetry(url || WUI_FALLBACK);
    const sheets = await readWorkbook(Buffer.from(await res.arrayBuffer()));
    return parseWuiWorkbook(sheets);
  },
};

/* ------------------------------------------------------------------ Pink Sheet */

const PINK_PAGE = 'https://www.worldbank.org/en/research/commodity-markets';

export function parsePinkSheet(rows) {
  const firstData = rows.findIndex((r) => r && /^\d{4}M\d{2}$/.test(String(r[0] || '').trim()));
  if (firstData < 2) throw new Error('Pink Sheet: no 1960M01-style rows found');
  // Names sit on the first non-empty header row above the data; units on the row after it.
  let nameRow = null;
  let unitRow = null;
  for (let i = firstData - 1; i >= 0; i -= 1) {
    const filled = (rows[i] || []).filter((c) => c !== null && String(c).trim() !== '').length;
    if (filled > 5) {
      if (!unitRow) unitRow = rows[i];
      else {
        nameRow = rows[i];
        break;
      }
    }
  }
  if (!nameRow) {
    nameRow = unitRow;
    unitRow = null;
  }
  const out = [];
  for (const r of rows.slice(firstData)) {
    const p = String(r?.[0] || '').trim();
    if (!/^\d{4}M\d{2}$/.test(p)) continue;
    const period = normPeriod(p);
    for (let i = 1; i < nameRow.length; i += 1) {
      const name = nameRow[i] === null ? '' : String(nameRow[i]).replace(/\s+/g, ' ').trim();
      if (!name) continue;
      const value = toNum(r[i]);
      if (value === null) continue;
      const unit = unitRow && unitRow[i] ? String(unitRow[i]).replace(/[()]/g, '').trim() : null;
      out.push({
        series_key: `PINK:${name}`,
        country_iso3: null,
        period,
        value,
        series_name: name,
        unit,
        frequency: 'M',
        dataset: 'CMO monthly prices',
      });
    }
  }
  return out;
}

export const pinksheet = {
  source: 'pinksheet',
  minIntervalMs: 2000,
  attribution: 'World Bank, Commodity Markets "Pink Sheet" (CC BY 4.0)',
  buildBatches() {
    return [{ label: 'Pink Sheet monthly prices' }];
  },
  async fetchBatch(b, fetchWithRetry) {
    const page = await fetchWithRetry(PINK_PAGE, { headers: { Accept: 'text/html' } });
    const url = findLink(await page.text(), /CMO-Historical-Data-Monthly\.xlsx$/i, PINK_PAGE);
    if (!url)
      throw new Error('Pink Sheet: monthly file link not found on the commodity-markets page');
    const res = await fetchWithRetry(url);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.slice(0, 2).toString() !== 'PK')
      throw new Error('Pink Sheet: download is not an xlsx file');
    const sheets = await readWorkbook(buf);
    const sheet = sheets['Monthly Prices'] || Object.values(sheets).find(Boolean);
    return parsePinkSheet(sheet);
  },
};
