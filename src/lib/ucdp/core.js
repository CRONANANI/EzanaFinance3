/**
 * UCDP Georeferenced Event Dataset (GED): release versions, batches, and the event rows
 * stored in public.ucdp_ged_events. Pure apart from resolveUcdpVersions(), which reads the
 * public API docs page (not the API, so it costs none of the 5,000 daily requests).
 *
 * Releases (ucdp.uu.se/apidocs):
 *   stable     "26.1": every year up to the year before its major (26.1 covers to 2025).
 *              A new one comes out about once a year.
 *   candidate  "26.0.9": the current year, month by month (26.0.9 = data through September
 *              2026). A new one comes out every month and is revised later, so its events are
 *              marked preliminary.
 * Each date range keeps one release: when a newer release for a range lands, the older
 * release's rows for that range are replaced (writeGedEvents).
 *
 * Relative imports carry .js so scripts/macro-sync-backfill.mjs runs under plain node.
 */
import { nameToIso3 } from '../macro-sync/formats.js';

export const UCDP_API = 'https://ucdpapi.pcr.uu.se/api/gedevents';
export const UCDP_DOCS = 'https://ucdp.uu.se/apidocs/';
/* Used when the docs page cannot be read or parsed. Bump when UCDP publishes. */
export const UCDP_FALLBACK = Object.freeze({ stable: '26.1', candidates: { 26: '26.0.9' } });
/* Years kept: the current year and the two before it. */
export const UCDP_YEARS = 3;
export const UCDP_PAGE_SIZE = 1000;

/** Parse the docs page: { stable, candidates: { [major]: 'MM.0.N' } } or null. */
export function parseUcdpVersions(text) {
  const t = String(text || '');
  const stable = /latest version of UCDP GED:?\s*(\d{2}\.1)\b/i.exec(t)?.[1] || null;
  const candidates = {};
  for (const m of t.matchAll(/\b(\d{2})\.0\.(\d{1,2})\b/g)) {
    const major = Number(m[1]);
    const minor = Number(m[2]);
    const cur = candidates[major] ? Number(candidates[major].split('.')[2]) : -1;
    if (minor > cur) candidates[major] = `${m[1]}.0.${minor}`;
  }
  if (!stable && !Object.keys(candidates).length) return null;
  return { stable, candidates };
}

/** The newer of two parsed version sets (a parse never moves a release backwards). */
export function mergeVersions(base, parsed) {
  const out = { stable: base.stable, candidates: { ...base.candidates } };
  if (parsed?.stable && Number(parsed.stable) > Number(out.stable)) out.stable = parsed.stable;
  for (const [major, v] of Object.entries(parsed?.candidates || {})) {
    const cur = out.candidates[major];
    if (!cur || Number(v.split('.')[2]) > Number(cur.split('.')[2])) out.candidates[major] = v;
  }
  return out;
}

/** Last year the stable release covers: 26.1 -> 2025. */
export const stableThrough = (stable) => 2000 + Math.floor(Number(stable)) - 1;

/** The release that holds a year, or null when none has reached it yet. */
export function versionForYear(year, versions) {
  if (year <= stableThrough(versions.stable)) return { version: versions.stable, candidate: false };
  const c = versions.candidates?.[year - 2000];
  return c ? { version: c, candidate: true } : null;
}

let cached = null;
let cachedAt = 0;

/** Current releases, read from the docs page at most every 12 hours; fallback on failure. */
export async function resolveUcdpVersions({ fetchImpl = fetch, now = Date.now() } = {}) {
  if (cached && now - cachedAt < 12 * 3600e3) return cached;
  let parsed = null;
  try {
    const res = await fetchImpl(UCDP_DOCS, { cache: 'no-store' });
    if (res.ok) parsed = parseUcdpVersions(await res.text());
  } catch {
    parsed = null;
  }
  cached = mergeVersions(UCDP_FALLBACK, parsed);
  cachedAt = now;
  return cached;
}

/** One batch per quarter, by date_end (what the API's StartDate and EndDate filter on). */
export function gedBatches(passDate, years = UCDP_YEARS) {
  const y = passDate.getUTCFullYear();
  const out = [];
  for (let year = y - years + 1; year <= y; year += 1) {
    for (let q = 1; q <= 4; q += 1) {
      const from = `${year}-${String(q * 3 - 2).padStart(2, '0')}-01`;
      const endMonth = q * 3;
      const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
      const to = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`;
      if (from > passDate.toISOString().slice(0, 10)) continue; // a quarter not begun
      out.push({ year, quarter: q, from, to, label: `GED ${year} Q${q}` });
    }
  }
  return out;
}

/* UCDP names the country lookup misses (Gleditsch and Ward style or historical names). */
const NAME_FIXES = {
  'kingdom of eswatini': 'SWZ',
  'bosnia-herzegovina': 'BIH',
  'united states of america': 'USA',
};

/** UCDP country name ("Yemen (North Yemen)", "DR Congo (Zaire)") -> ISO3 or null. */
export function ucdpIso3(name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  const base = raw.replace(/\s*\(.*\)$/, '').trim();
  return NAME_FIXES[base.toLowerCase()] || nameToIso3(base) || nameToIso3(raw) || null;
}

const int = (v) =>
  v == null || v === '' || !Number.isFinite(Number(v)) ? null : Math.round(Number(v));
const real = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const day = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 10) : null);
const text = (v, max = 300) => (v == null || v === '' ? null : String(v).slice(0, max));

/** An API event -> a ucdp_ged_events row (null when it lacks an id, type or end date). */
export function gedRow(e, { version, candidate }) {
  const id = int(e?.id);
  const type = int(e?.type_of_violence);
  const dateEnd = day(e?.date_end) || day(e?.date_start);
  if (id == null || ![1, 2, 3].includes(type) || !dateEnd) return null;
  return {
    version,
    id,
    relid: text(e.relid, 80),
    year: int(e.year) ?? Number(dateEnd.slice(0, 4)),
    type_of_violence: type,
    conflict_new_id: int(e.conflict_new_id),
    conflict_name: text(e.conflict_name),
    dyad_new_id: int(e.dyad_new_id),
    dyad_name: text(e.dyad_name),
    side_a: text(e.side_a),
    side_b: text(e.side_b),
    country: text(e.country, 120),
    country_id: int(e.country_id),
    iso3: ucdpIso3(e.country),
    region: text(e.region, 60),
    adm_1: text(e.adm_1, 160),
    where_description: text(e.where_description, 300),
    latitude: real(e.latitude),
    longitude: real(e.longitude),
    date_start: day(e.date_start),
    date_end: dateEnd,
    deaths_a: int(e.deaths_a),
    deaths_b: int(e.deaths_b),
    deaths_civilians: int(e.deaths_civilians),
    deaths_unknown: int(e.deaths_unknown),
    best: int(e.best) ?? 0,
    low: int(e.low),
    high: int(e.high),
    event_clarity: int(e.event_clarity),
    date_prec: int(e.date_prec),
    where_prec: int(e.where_prec),
    candidate: Boolean(candidate),
  };
}

const CHUNK = 500;

/**
 * Store one quarter's events. When the quarter came back non-empty, rows from any other
 * release for the same date range are deleted first, so each range holds one release. An
 * empty answer never deletes (an outage must not wipe a quarter). A missing table is
 * reported, never thrown, so the monthly totals still land before the migration runs.
 */
export async function writeGedEvents(db, { from, to, version }, rows) {
  if (!rows.length) return { written: 0, replaced: false };
  const del = await db
    .from('ucdp_ged_events')
    .delete()
    .gte('date_end', from)
    .lte('date_end', to)
    .neq('version', version);
  if (del.error) {
    if (/does not exist|PGRST205|42P01/i.test(`${del.error.code} ${del.error.message}`))
      return { written: 0, replaced: false, missingTable: true };
    throw new Error(`ucdp_ged_events: ${del.error.message}`);
  }
  let written = 0;
  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map((r) => ({ ...r, fetched_at: now }));
    const { error } = await db.from('ucdp_ged_events').upsert(chunk, { onConflict: 'version,id' });
    if (error) throw new Error(`ucdp_ged_events: ${error.message}`);
    written += chunk.length;
  }
  return { written, replaced: true };
}
