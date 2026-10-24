/**
 * World Bank WDI into macro_countries / macro_indicators (weekly). Same API
 * and response shape the existing lighthouse ingest parses
 * (src/app/api/cron/ingest-worldbank): `[meta, rows]`, rows carrying
 * countryiso3code, date and value. Aggregates are kept but flagged
 * (region.id 'NA', region "Aggregates") so they can never rank;
 * territories are flagged from a static ISO list.
 */
import { TERRITORIES, METRICS, POPULATION } from '@/lib/sonar/macro/rank';

const WB = 'https://api.worldbank.org/v2';
const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'EzanaFinance/1.0 (+https://ezana.world)',
};
export const MACRO_INDICATORS = [...Object.values(METRICS).map((m) => m.indicator), POPULATION];
export const MACRO_FROM_YEAR = 1990;

async function getJson(url, fetchImpl) {
  const res = await fetchImpl(url, { headers: HEADERS, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/** One row of /v2/country -> a macro_countries row. */
export function countryRow(c) {
  const iso3 = String(c?.id || '').toUpperCase();
  if (!/^[A-Z0-9]{3}$/.test(iso3)) return null;
  const aggregate = c?.region?.id === 'NA' || c?.region?.value === 'Aggregates';
  return {
    iso3,
    iso2: c?.iso2Code ? String(c.iso2Code).toUpperCase() : null,
    name: String(c?.name || iso3),
    region: aggregate ? null : c?.region?.value || null,
    income_group: aggregate ? null : c?.incomeLevel?.value || null,
    is_aggregate: aggregate,
    is_territory: TERRITORIES.has(iso3),
  };
}

/** One indicator row -> a macro_indicators row (null when unusable). */
export function indicatorRow(r, indicator, known, stamp) {
  const iso3 = String(r?.countryiso3code || '').toUpperCase();
  if (!iso3 || !known.has(iso3)) return null;
  const v = r?.value;
  if (v == null || !Number.isFinite(Number(v))) return null;
  const y = Number(r?.date);
  if (!Number.isInteger(y)) return null;
  return {
    iso3,
    indicator,
    year: y,
    value: Number(v),
    source: 'world_bank',
    measure_type: 'observed',
    fetched_at: stamp,
  };
}

export async function fetchCountries({ fetchImpl = fetch } = {}) {
  const json = await getJson(`${WB}/country?format=json&per_page=400`, fetchImpl);
  return (Array.isArray(json) ? json[1] || [] : []).map(countryRow).filter(Boolean);
}

/** Every page of one indicator from MACRO_FROM_YEAR to this year. */
export async function fetchIndicator(indicator, known, { fetchImpl = fetch, stamp } = {}) {
  const year = new Date().getUTCFullYear();
  const out = [];
  for (let page = 1; page <= 20; page += 1) {
    const url = `${WB}/country/all/indicator/${encodeURIComponent(indicator)}?format=json&date=${MACRO_FROM_YEAR}:${year}&per_page=20000&page=${page}`;
    // eslint-disable-next-line no-await-in-loop
    const json = await getJson(url, fetchImpl);
    const meta = Array.isArray(json) ? json[0] : null;
    for (const r of Array.isArray(json) ? json[1] || [] : []) {
      const row = indicatorRow(r, indicator, known, stamp);
      if (row) out.push(row);
    }
    if (!meta || page >= Number(meta.pages || 1)) break;
  }
  return out;
}
