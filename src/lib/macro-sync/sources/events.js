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
 * UCDP GED via the API, which needs an access token (email the UCDP API maintainer, see
 * ucdp.uu.se/apidocs; 5,000 requests a day, errors included, reset at midnight UTC). Header:
 * x-ucdp-access-token. Without UCDP_ACCESS_TOKEN set, the rotator skips this adapter. CC BY 4.0.
 *   https://ucdpapi.pcr.uu.se/api/gedevents/{version}?pagesize=1000&page=N&StartDate=&EndDate=
 * Nov 7: one batch per quarter (src/lib/ucdp/core.js), by date_end, which is what StartDate
 * and EndDate filter on. Each batch pages through its quarter completely, sums fatalities
 * ("best") and counts events per country and month of date_end (so no month is split across
 * batches), and stores every event in public.ucdp_ged_events (afterBatch) for the Armed
 * Conflict Tracker and Sonar. Release versions are read from the docs page, so a new monthly
 * release is picked up without a code change. A weekly pass is about 120 requests.
 */
import { nameToIso3, normPeriod } from '../formats.js';
import {
  resolveUcdpVersions,
  versionForYear,
  gedBatches,
  gedRow,
  writeGedEvents,
  UCDP_API,
  UCDP_PAGE_SIZE,
  UCDP_FALLBACK,
} from '../../ucdp/core.js';

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

/* The fallback releases (src/lib/ucdp/core.js reads the current ones from the docs page). */
export const UCDP_VERSIONS = {
  stable: UCDP_FALLBACK.stable,
  candidate: Object.values(UCDP_FALLBACK.candidates).at(-1),
};
const VIOLENCE = { 1: 'state-based', 2: 'non-state', 3: 'one-sided' };

/** Aggregate GED events to country-month rows. Exported for tests. */
export function aggregateGed(events) {
  const acc = new Map();
  for (const e of events) {
    const iso3 = nameToIso3(String(e.country || '').replace(/\s*\(.*\)$/, ''));
    /* Month of date_end (date_start when absent): batches are cut by date_end, so a month's
       total always comes from one batch. */
    const period = normPeriod(String(e.date_end || e.date_start || '').slice(0, 10))?.slice(0, 7);
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

/* The events behind each batch's monthly rows, handed from fetchBatch to afterBatch (the
   engine passes afterBatch the same array fetchBatch returned). */
const BATCH_EVENTS = new WeakMap();

export const ucdp = {
  source: 'ucdp',
  minIntervalMs: 1500,
  refreshAfterDays: 7,
  requiresEnv: ['UCDP_ACCESS_TOKEN'],
  attribution: 'Uppsala Conflict Data Program, UCDP Georeferenced Event Dataset (CC BY 4.0)',
  buildBatches(passDate) {
    return gedBatches(passDate);
  },
  async fetchBatch(b, fetchWithRetry) {
    const release = versionForYear(b.year, await resolveUcdpVersions());
    if (!release) return []; // no release covers this year yet
    const headers = {
      'x-ucdp-access-token': process.env.UCDP_ACCESS_TOKEN,
      Accept: 'application/json',
    };
    const events = [];
    let totalPages = 1;
    /* Pages are 0-based; stop at TotalPages, since a page past the end can answer 500. */
    for (let page = 0; page < Math.min(totalPages, 200); page += 1) {
      const url = `${UCDP_API}/${release.version}?pagesize=${UCDP_PAGE_SIZE}&page=${page}&StartDate=${b.from}&EndDate=${b.to}`;
      const res = await fetchWithRetry(url, { headers, okStatuses: [404] });
      if (res.status === 404) break;
      const json = await res.json();
      totalPages = Number(json.TotalPages || 0);
      events.push(...(json.Result || []));
      if (!json.NextPageUrl) break;
    }
    const rows = aggregateGed(events);
    BATCH_EVENTS.set(rows, {
      batch: { ...b, version: release.version },
      rows: events.map((e) => gedRow(e, release)).filter(Boolean),
    });
    return rows;
  },
  async afterBatch(db, rows) {
    const held = BATCH_EVENTS.get(rows);
    if (!held) return;
    BATCH_EVENTS.delete(rows);
    const r = await writeGedEvents(db, held.batch, held.rows);
    if (r.missingTable) console.warn('[ucdp] ucdp_ged_events is not migrated yet; events skipped');
  },
};
