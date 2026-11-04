/**
 * Event-based series: GDELT news coverage and UCDP conflict fatalities, aggregated to
 * country time series so they fit macro_series_values.
 *
 * GDELT DOC 2.0 API, no key, free for commercial use with citation. One request per 5 s per IP;
 * when throttled it answers HTTP 200 with a plain-text notice, so the JSON is checked.
 *   https://api.gdeltproject.org/api/v2/doc/doc?query=...&mode=timelinevol|timelinetone&format=json&timespan=3months
 * For each tracked country: share of global coverage that mentions it (timelinevol) and the
 * average tone of that coverage (timelinetone), daily. A weekly pass refreshes the last 3 months.
 *
 * UCDP GED via the API, which now needs an access token (email the UCDP API maintainer, see
 * ucdp.uu.se/apidocs; 5,000 requests/day). Header: x-ucdp-access-token. Without
 * UCDP_ACCESS_TOKEN set, the rotator skips this adapter. CC BY 4.0.
 *   https://ucdpapi.pcr.uu.se/api/gedevents/{version}?pagesize=1000&page=N&StartDate=&EndDate=
 * Each batch pages through one calendar year completely, then sums fatalities ("best") and
 * counts events per country and month, so a batch never writes a partial monthly total.
 */
import { nameToIso3, normPeriod } from '../formats.js';

/* ------------------------------------------------------------------ GDELT */

export const GDELT_COUNTRIES = [
  ['USA', 'United States'],
  ['CHN', 'China'],
  ['RUS', 'Russia'],
  ['UKR', 'Ukraine'],
  ['IRN', 'Iran'],
  ['ISR', 'Israel'],
  ['SAU', 'Saudi Arabia'],
  ['TUR', 'Turkey'],
  ['IND', 'India'],
  ['PAK', 'Pakistan'],
  ['JPN', 'Japan'],
  ['KOR', 'South Korea'],
  ['PRK', 'North Korea'],
  ['TWN', 'Taiwan'],
  ['DEU', 'Germany'],
  ['FRA', 'France'],
  ['GBR', 'United Kingdom'],
  ['ITA', 'Italy'],
  ['BRA', 'Brazil'],
  ['MEX', 'Mexico'],
  ['ARG', 'Argentina'],
  ['VEN', 'Venezuela'],
  ['COL', 'Colombia'],
  ['NGA', 'Nigeria'],
  ['ZAF', 'South Africa'],
  ['EGY', 'Egypt'],
  ['ETH', 'Ethiopia'],
  ['KEN', 'Kenya'],
  ['IDN', 'Indonesia'],
  ['VNM', 'Vietnam'],
  ['PHL', 'Philippines'],
  ['AUS', 'Australia'],
  ['CAN', 'Canada'],
  ['ARE', 'United Arab Emirates'],
  ['QAT', 'Qatar'],
  ['IRQ', 'Iraq'],
  ['SYR', 'Syria'],
  ['LBN', 'Lebanon'],
  ['YEM', 'Yemen'],
  ['SDN', 'Sudan'],
];
const GDELT_MODES = [
  { mode: 'timelinevol', name: 'News coverage share', unit: '% of global coverage' },
  { mode: 'timelinetone', name: 'News coverage tone', unit: 'average tone' },
];

/** GDELT DOC timeline JSON -> rows. Exported for tests. */
export function parseGdeltTimeline(text, b) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const err = new Error(`GDELT: non-JSON response (${String(text).slice(0, 80)})`);
    err.retryable = /limit|please|slow/i.test(String(text));
    throw err;
  }
  const series = json?.timeline?.[0]?.data || [];
  return series
    .map((d) => {
      const period = normPeriod(String(d.date || '').slice(0, 8));
      return (
        period && {
          series_key: `GDELT.${b.mode}:${b.iso3}`,
          country_iso3: b.iso3,
          period,
          value: typeof d.value === 'number' ? d.value : Number(d.value),
          series_name: b.name,
          unit: b.unit,
          frequency: 'D',
          dataset: `doc_${b.mode}`,
        }
      );
    })
    .filter((r) => r && Number.isFinite(r.value));
}

export const gdelt = {
  source: 'gdelt',
  minIntervalMs: 6000,
  attribution: 'The GDELT Project (gdeltproject.org)',
  buildBatches() {
    const out = [];
    for (const [iso3, name] of GDELT_COUNTRIES) {
      for (const m of GDELT_MODES)
        out.push({ iso3, country: name, ...m, label: `${iso3} ${m.mode}` });
    }
    return out;
  },
  async fetchBatch(b, fetchWithRetry) {
    const query = encodeURIComponent(`"${b.country}"`);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=${b.mode}&format=json&timespan=3months`;
    const res = await fetchWithRetry(url, { headers: { Accept: 'application/json' } });
    return parseGdeltTimeline(await res.text(), b);
  },
};

/* ------------------------------------------------------------------ UCDP */

/* Versions change every year: the stable release covers through last year, the candidate
   release covers the current year month by month. Update both when UCDP publishes. */
export const UCDP_VERSIONS = { stable: '26.1', candidate: '26.0.9' };
const VIOLENCE = { 1: 'state-based', 2: 'non-state', 3: 'one-sided' };

/** Aggregate GED events to country-month rows. Exported for tests. */
export function aggregateGed(events) {
  const acc = new Map();
  for (const e of events) {
    const iso3 = nameToIso3(String(e.country || '').replace(/\s*\(.*\)$/, ''));
    const period = normPeriod(String(e.date_start || '').slice(0, 10))?.slice(0, 7);
    if (!iso3 || !period) continue;
    const best = Number(e.best) || 0;
    for (const kind of ['all', VIOLENCE[e.type_of_violence]].filter(Boolean)) {
      const k = `${iso3}|${period}|${kind}`;
      const cur = acc.get(k) || { iso3, period, kind, deaths: 0, events: 0 };
      cur.deaths += best;
      cur.events += 1;
      acc.set(k, cur);
    }
  }
  const rows = [];
  for (const a of acc.values()) {
    const label = a.kind === 'all' ? 'organized violence' : `${a.kind} violence`;
    rows.push(
      {
        series_key: `UCDP.deaths.${a.kind}:${a.iso3}`,
        country_iso3: a.iso3,
        period: a.period,
        value: a.deaths,
        series_name: `Fatalities from ${label} (best estimate)`,
        unit: 'deaths',
        frequency: 'M',
        dataset: 'ged',
      },
      {
        series_key: `UCDP.events.${a.kind}:${a.iso3}`,
        country_iso3: a.iso3,
        period: a.period,
        value: a.events,
        series_name: `Events of ${label}`,
        unit: 'events',
        frequency: 'M',
        dataset: 'ged',
      },
    );
  }
  return rows;
}

export const ucdp = {
  source: 'ucdp',
  minIntervalMs: 1500,
  requiresEnv: ['UCDP_ACCESS_TOKEN'],
  attribution: 'Uppsala Conflict Data Program, UCDP Georeferenced Event Dataset (CC BY 4.0)',
  buildBatches(passDate) {
    const y = passDate.getUTCFullYear();
    return [
      { version: UCDP_VERSIONS.stable, year: y - 2, label: `GED ${y - 2}` },
      { version: UCDP_VERSIONS.stable, year: y - 1, label: `GED ${y - 1}` },
      { version: UCDP_VERSIONS.candidate, year: y, label: `GED candidate ${y}` },
    ];
  },
  async fetchBatch(b, fetchWithRetry) {
    const headers = {
      'x-ucdp-access-token': process.env.UCDP_ACCESS_TOKEN,
      Accept: 'application/json',
    };
    const events = [];
    for (let page = 0; page < 200; page += 1) {
      const url = `https://ucdpapi.pcr.uu.se/api/gedevents/${b.version}?pagesize=1000&page=${page}&StartDate=${b.year}-01-01&EndDate=${b.year}-12-31`;
      const res = await fetchWithRetry(url, { headers, okStatuses: [404] });
      if (res.status === 404) break;
      const json = await res.json();
      events.push(...(json.Result || []));
      if (!json.NextPageUrl || page + 1 >= Number(json.TotalPages || 0)) break;
    }
    return aggregateGed(events);
  },
};
