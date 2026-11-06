/**
 * Central Bank of the Republic of Turkey (CBRT), EVDS data delivery system. Optional: skipped
 * until EVDS_API_KEY is set (a free key: register at https://evds3.tcmb.gov.tr, then "My
 * Profile" -> copy the API key).
 *
 * API (EVDS3; the evds2.tcmb.gov.tr/service/evds URLs were retired in 2025 and now redirect
 * to the web app): GET https://evds3.tcmb.gov.tr/igmevdsms-dis/series={CODE}&startDate=DD-MM-YYYY
 * &endDate=DD-MM-YYYY&type=json, path-style parameters (no '?'). The key goes in a `key` HTTP
 * header (since April 2024 it is refused as a query parameter). Response:
 * { totalCount, items: [{ Tarih, TP_DK_USD_A_YTL, UNIXTIME }] }: the series code with dots as
 * underscores is the value column; Tarih is DD-MM-YYYY for daily and weekly data and YYYY-M
 * for monthly. A missing or bad key answers an HTML page, not JSON.
 * evds3.tcmb.gov.tr could not be reached from the environment this was written in. The URL,
 * header and response shape are those of working public clients (2026); the series codes
 * are from the EVDS3 series catalogue (serieList, Sep 2026). EVDS_POLICY_QUOTE is held but not
 * stated by Sonar until it is checked against the CBRT one-week repo table (see below).
 */
import { toNum, normPeriod, assertNotHtml, BROWSER_HEADERS, yearsBefore } from '../formats.js';

const BASE = 'https://evds3.tcmb.gov.tr/igmevdsms-dis';

/** USD/TRY, CBRT indicative buying rate (bie_dkdovytl, daily). */
export const EVDS_USDTRY = 'TP.DK.USD.A.YTL';
/** CBRT gross official reserves, total, million USD (bie_abres2, weekly, Friday). */
export const EVDS_RESERVES = 'TP.AB.TOPLAM';
/** CPI general index, 2025=100 (bie_tukfiy2025, monthly). TP.FG.J0 (2003=100) is archived. */
export const EVDS_CPI = 'TP.TUKFIY2025.GENEL';
/**
 * CBRT interbank money market quotation, one week, OFFER (bie_pyintbnk, business days): the
 * rate at which the CBRT lends for one week, which should be the one-week repo policy rate.
 * EVDS has no series named "policy rate"; this equivalence is not verified, so the catalogue
 * does not state it (BIS WS_CBPOL:D.TR is Turkey's daily policy rate there).
 */
export const EVDS_POLICY_QUOTE = 'TP.PY.P02.1H';

export const EVDS_SERIES = [
  {
    code: EVDS_USDTRY,
    name: 'Turkish lira per US dollar (CBRT indicative buying rate)',
    unit: 'TRY per USD',
    frequency: 'D',
    years: 2,
  },
  {
    code: EVDS_RESERVES,
    name: 'CBRT gross official reserves, total (weekly)',
    unit: 'USD millions',
    frequency: 'W',
    years: 3,
  },
  {
    code: EVDS_CPI,
    name: 'Consumer price index (TurkStat, 2025=100)',
    unit: 'index',
    frequency: 'M',
    years: 3,
  },
  {
    code: EVDS_POLICY_QUOTE,
    name: 'CBRT one-week lending quotation (interbank money market)',
    unit: '% a year',
    frequency: 'D',
    years: 2,
  },
];

const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' -> 'DD-MM-YYYY', the date form EVDS takes. */
export const evdsDate = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
};

/** An EVDS Tarih -> a stored period: '04-11-2026' -> '2026-11-04', '2026-9' -> '2026-09'. */
export function evdsPeriod(tarih) {
  const s = String(tarih ?? '').trim();
  let m;
  if ((m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s))) return `${m[3]}-${m[2]}-${m[1]}`;
  if ((m = /^(\d{4})-(\d{1,2})$/.exec(s)))
    return Number(m[2]) >= 1 && Number(m[2]) <= 12 ? `${m[1]}-${pad(m[2])}` : null;
  return normPeriod(s);
}

/** An EVDS JSON response for one series -> macro rows. Pure; exported for the test. */
export function parseEvds(json, s) {
  const col = s.code.replace(/\./g, '_');
  const items = Array.isArray(json?.items) ? json.items : [];
  const out = [];
  for (const it of items) {
    const period = evdsPeriod(it?.Tarih);
    const value = toNum(it?.[col]);
    if (!period || value === null) continue;
    out.push({
      series_key: `EVDS:${s.code}`,
      country_iso3: 'TUR',
      period,
      value,
      series_name: s.name,
      unit: s.unit,
      frequency: s.frequency,
      dataset: 'EVDS',
    });
  }
  return out;
}

export const cbrt = {
  source: 'cbrt',
  minIntervalMs: 1500,
  refreshAfterDays: 1,
  requiresEnv: ['EVDS_API_KEY'],
  attribution: 'Central Bank of the Republic of Turkey, EVDS (evds3.tcmb.gov.tr)',
  buildBatches(passDate) {
    const end = new Date(passDate).toISOString().slice(0, 10);
    return EVDS_SERIES.map((s) => ({
      ...s,
      since: yearsBefore(passDate, s.years),
      until: end,
      label: s.code,
    }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `${BASE}/series=${b.code}&startDate=${evdsDate(b.since)}&endDate=${evdsDate(b.until)}&type=json`;
    const res = await fetchWithRetry(url, {
      headers: {
        'User-Agent': BROWSER_HEADERS['User-Agent'],
        Accept: 'application/json',
        key: process.env.EVDS_API_KEY || '',
      },
    });
    const text = await res.text();
    assertNotHtml(text, 'evds3.tcmb.gov.tr');
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('evds3.tcmb.gov.tr: response is not JSON');
    }
    return parseEvds(json, b);
  },
};
