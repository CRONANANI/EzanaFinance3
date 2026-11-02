/**
 * CEPALSTAT (UN ECLAC). One request per indicator, all countries and years.
 * Indicator ids come from https://api-cepalstat.cepal.org/cepalstat/api/v1/thematic-tree?lang=en&format=json
 * Indicator 365 is the consumer price index. The response field names could not be checked
 * from the environment this was written in: parseCepal reads the CEPALSTAT export columns
 * (Country__ESTANDAR, Years__ESTANDAR, value, unit) and common alternatives. Call one
 * indicator, inspect the response and adjust parseCepal before relying on it.
 */
import { num } from '../engine.js';

export const INDICATORS = [
  { id: 365, name: 'Consumer price index' },
  // Add ids from the thematic tree: GDP growth, unemployment, current account, external debt,
  // exports by product group, remittances. Keep this list to what Sonar actually cites.
];

/* ECLAC's 33 Latin American and Caribbean member countries plus the regional aggregates it
   publishes under English names. A static map, so no locale data is bundled. */
const NAME_TO_ISO3 = {
  'antigua and barbuda': 'ATG',
  argentina: 'ARG',
  bahamas: 'BHS',
  barbados: 'BRB',
  belize: 'BLZ',
  bolivia: 'BOL',
  'bolivia (plurinational state of)': 'BOL',
  brazil: 'BRA',
  chile: 'CHL',
  colombia: 'COL',
  'costa rica': 'CRI',
  cuba: 'CUB',
  dominica: 'DMA',
  'dominican republic': 'DOM',
  ecuador: 'ECU',
  'el salvador': 'SLV',
  grenada: 'GRD',
  guatemala: 'GTM',
  guyana: 'GUY',
  haiti: 'HTI',
  honduras: 'HND',
  jamaica: 'JAM',
  mexico: 'MEX',
  nicaragua: 'NIC',
  panama: 'PAN',
  paraguay: 'PRY',
  peru: 'PER',
  'saint kitts and nevis': 'KNA',
  'saint lucia': 'LCA',
  'saint vincent and the grenadines': 'VCT',
  suriname: 'SUR',
  'trinidad and tobago': 'TTO',
  uruguay: 'URY',
  venezuela: 'VEN',
  'venezuela (bolivarian republic of)': 'VEN',
};

const iso3FromName = (name) => {
  if (!name) return null;
  const s = String(name).trim().toLowerCase();
  return NAME_TO_ISO3[s] || NAME_TO_ISO3[s.replace(/\s*\(.*?\)\s*/g, ' ').trim()] || null;
};

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

export function parseCepal(json, ind) {
  const rows = json?.body?.data || json?.data || (Array.isArray(json) ? json : []);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((o) => {
      const country = o.iso3 || o.Country__ESTANDAR || o.country || o.country_estandar;
      const year = o.Years__ESTANDAR || o.years || o.year;
      const month = o.Months || o.month;
      const dimParts = Object.entries(o)
        .filter(
          ([k]) =>
            !/^(value|unit|notes?_ids?|source_id|indicator|iso3|years?__estandar|years?|months?|country__estandar|country)$/i.test(
              k,
            ),
        )
        .map(([, v]) => v)
        .filter((v) => v !== null && v !== '' && typeof v !== 'object');
      const iso3 =
        typeof country === 'string' && /^[A-Z]{3}$/.test(country) ? country : iso3FromName(country);
      const monthNo = month
        ? MONTHS.indexOf(String(month).trim().toLowerCase()) + 1 || Number(month) || null
        : null;
      return {
        series_key: `CEPAL.${ind.id}:${[iso3 || country, ...dimParts].join('.')}`,
        country_iso3: iso3,
        period: year
          ? monthNo
            ? `${year}-${String(monthNo).padStart(2, '0')}`
            : String(year)
          : null,
        value: num(o.value),
        series_name: ind.name,
        unit: o.unit || null,
        frequency: monthNo ? 'M' : 'A',
        dataset: String(ind.id),
      };
    })
    .filter((r) => r.period);
}

export const cepal = {
  source: 'cepal',
  minIntervalMs: 3000,
  attribution: 'ECLAC, CEPALSTAT (statistics.cepal.org)',
  buildBatches() {
    return INDICATORS.map((i) => ({ ...i, label: `indicator ${i.id}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://api-cepalstat.cepal.org/cepalstat/api/v1/indicator/${b.id}/data?lang=en&format=json`;
    const res = await fetchWithRetry(url, { headers: { Accept: 'application/json' } });
    return parseCepal(await res.json(), b);
  },
};
