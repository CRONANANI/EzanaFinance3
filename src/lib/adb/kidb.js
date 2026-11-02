/**
 * ADB Key Indicators Database (KIDB) sync.
 *
 * ADB allows 20 requests/minute. This module never exceeds 18/minute: requests are spaced
 * at least 3.4s apart, 429/5xx responses back off (honouring Retry-After), and a run stops
 * starting new requests when its time budget runs out. The cursor in adb_ingest_state makes
 * every run resume where the last one stopped; upserts make re-runs harmless.
 *
 * Sonar reads public.adb_kidb_values. Nothing at ping time calls ADB.
 *
 * API adapter (Nov 2): KIDB is an SDMX REST API (dataflows such as EO_NA, PPL_POP, MFP_XR;
 * `output_format=JSON` returns SDMX-JSON; ADB economy codes, e.g. PRC, INO, BAN, PHI, not
 * ISO). The request URL follows the SDMX REST data query
 *   {base}/data/{agency},{dataflow},{version}/{FREQ}.{INDICATORS}.{ECONOMIES}?output_format=JSON
 * and the parser reads standard SDMX-JSON (1.0 and 2.0 layouts). The kidb.adb.org docs could
 * not be opened from the environment this was written in, so the base path, the key's
 * dimension order and the work list below must be checked against one live response before
 * the job is turned on. Until ADB_KIDB_API_BASE is set and the work list is filled, the job
 * skips without touching the network or the database.
 *
 * No `@/` imports, so scripts/adb-kidb-backfill.mjs can import this file directly.
 */

export const SOURCE = 'Asian Development Bank, Key Indicators Database (kidb.adb.org)';
const JOB = 'adb-kidb';
const MIN_INTERVAL_MS = 3400; // 60s / 18 requests: a safety margin under ADB's 20/minute
const MAX_RETRIES = 4;
const REFRESH_AFTER_DAYS = 7; // a completed pass is not repeated for a week
const UPSERT_CHUNK = 500;
const AGENCY = 'ADB';
const DATAFLOW_VERSION = process.env.ADB_KIDB_DATAFLOW_VERSION || 'latest';

/** The API root, e.g. the SDMX REST base the KIDB API page documents. Unset = job off. */
function apiBase() {
  return String(process.env.ADB_KIDB_API_BASE || '').replace(/\/+$/, '');
}

/* -------------------------------------------------------------- work list
   One batch = one API request. Group economies and indicators as widely as the API allows.
   Start with the indicators Sonar needs for country-impact answers; extend later. Codes must
   come from the API's own code lists (ADB economy codes are not ISO codes). */
export const ECONOMIES = [
  // e.g. 'PRC', 'IND', 'INO', 'PHI', 'VIE', 'BAN', ...: fill from the economy code list.
];
/** Each group is one dataflow and the indicator ids requested from it together. */
export const INDICATOR_GROUPS = [
  // e.g. { dataflow: 'EO_NA', indicators: ['NGDP_XDC'] }: fill from the dataflow and code lists.
];
const ECONOMIES_PER_REQUEST = 10; // raise to whatever one request accepts
const FREQUENCY = 'A';

export function buildBatches(economies = ECONOMIES, groups = INDICATOR_GROUPS) {
  const out = [];
  for (const g of groups) {
    const group = Array.isArray(g) ? { dataflow: null, indicators: g } : g;
    for (let i = 0; i < economies.length; i += ECONOMIES_PER_REQUEST) {
      out.push({
        dataflow: group.dataflow,
        economies: economies.slice(i, i + ECONOMIES_PER_REQUEST),
        indicators: group.indicators,
      });
    }
  }
  return out;
}

/* -------------------------------------------------------------- API adapter */
/** True once the job has somewhere to call and something to ask for. */
export function isConfigured() {
  return Boolean(apiBase()) && buildBatches().length > 0;
}

/** SDMX REST data query for one batch, all years in one call. */
export function buildRequestUrl({ dataflow, economies, indicators }, base = apiBase()) {
  if (!base) throw new Error('ADB_KIDB_API_BASE is not set');
  if (!dataflow) throw new Error('buildRequestUrl: batch has no dataflow');
  const key = [FREQUENCY, indicators.join('+'), economies.join('+')].join('.');
  const flow = `${AGENCY},${dataflow},${DATAFLOW_VERSION}`;
  return `${base}/data/${encodeURIComponent(flow)}/${encodeURIComponent(key)}?output_format=JSON`;
}

const num = (v) => {
  if (v == null || v === '' || v === 'NaN') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const name = (o) =>
  o == null ? null : typeof o === 'string' ? o : o.en || Object.values(o)[0] || null;

/**
 * SDMX-JSON (1.0: { structure, dataSets }; 2.0: { data: { structures, dataSets } }) to rows
 * of { economy_code, indicator_code, period, value, indicator_name, unit, economy_name,
 * source_updated }. period is a string ('2024', '2024-Q2'); value is a number or null.
 */
export function parseResponse(json) {
  const root = json?.data && json.data.dataSets ? json.data : json;
  const structure = root?.structure || root?.structures?.[0] || null;
  const dataSet = root?.dataSets?.[0];
  if (!structure || !dataSet) return [];
  const seriesDims = structure.dimensions?.series || [];
  const obsDims = structure.dimensions?.observation || [];
  const attrs = structure.attributes?.series || [];
  const idx = (id) => seriesDims.findIndex((d) => d.id === id);
  const econAt = [idx('ECONOMY'), idx('ECONOMY_CODE'), idx('REF_AREA'), idx('COUNTRY')].find(
    (i) => i >= 0,
  );
  const indAt = [idx('INDICATOR'), idx('INDICATOR_CODE'), idx('SERIES')].find((i) => i >= 0);
  const timeDim = obsDims.find((d) => d.id === 'TIME_PERIOD') || obsDims[0];
  const unitAttrAt = attrs.findIndex((a) => /UNIT/.test(a.id));
  const updated = json?.meta?.prepared || root?.header?.prepared || json?.header?.prepared || null;
  if (econAt == null || indAt == null || !timeDim) return [];

  const rows = [];
  for (const [key, series] of Object.entries(dataSet.series || {})) {
    const parts = key.split(':').map(Number);
    const econ = seriesDims[econAt]?.values?.[parts[econAt]];
    const ind = seriesDims[indAt]?.values?.[parts[indAt]];
    if (!econ?.id || !ind?.id) continue;
    const unitIdx = unitAttrAt >= 0 ? series.attributes?.[unitAttrAt] : null;
    const unit = unitIdx != null ? name(attrs[unitAttrAt]?.values?.[unitIdx]?.name) : null;
    for (const [t, obs] of Object.entries(series.observations || {})) {
      const period = timeDim.values?.[Number(t)]?.id;
      if (!period) continue;
      rows.push({
        economy_code: String(econ.id),
        indicator_code: String(ind.id),
        period: String(period),
        value: num(Array.isArray(obs) ? obs[0] : obs),
        indicator_name: name(ind.name),
        unit,
        economy_name: name(econ.name),
        source_updated: updated,
      });
    }
  }
  return rows;
}

/* -------------------------------------------------------------- rate-limited fetch */
let lastRequestAt = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function paced() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

/** Test hook: the pacing clock. */
export function resetPacing() {
  lastRequestAt = 0;
}

export async function fetchKidb(batch, { deadline = Infinity, sleepFn = sleep } = {}) {
  const url = buildRequestUrl(batch);
  const headers = { Accept: 'application/json' };
  /* Only if the API turns out to need one; the scheme must match its docs. Never logged. */
  if (process.env.ADB_KIDB_API_KEY)
    headers.Authorization = `Bearer ${process.env.ADB_KIDB_API_KEY}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    await paced();
    let res;
    try {
      res = await fetch(url, { headers, cache: 'no-store' });
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      await sleepFn(Math.min(60000, 2000 * 2 ** attempt));
      continue;
    }
    if (res.ok) return parseResponse(await res.json());
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(60000, 5000 * 2 ** attempt); // 5s, 10s, 20s, 40s
      if (attempt === MAX_RETRIES || Date.now() + backoff > deadline) {
        const err = new Error(`KIDB ${res.status} after ${attempt + 1} attempts`);
        err.retryable = true;
        throw err;
      }
      await sleepFn(backoff);
      continue;
    }
    throw new Error(`KIDB ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error('KIDB: retries exhausted');
}

/* -------------------------------------------------------------- state + storage */
async function readState(db) {
  const { data, error } = await db
    .from('adb_ingest_state')
    .select('*')
    .eq('job', JOB)
    .maybeSingle();
  if (error) throw new Error(`adb_ingest_state: ${error.message}`);
  return data || { job: JOB, cursor: 0, pass_started_at: null, pass_completed_at: null };
}

async function writeState(db, patch) {
  const { error } = await db
    .from('adb_ingest_state')
    .upsert({ job: JOB, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'job' });
  if (error) throw new Error(`adb_ingest_state: ${error.message}`);
}

async function upsertRows(db, rows) {
  let written = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows
      .slice(i, i + UPSERT_CHUNK)
      .map((r) => ({ ...r, fetched_at: new Date().toISOString() }));
    const { error } = await db
      .from('adb_kidb_values')
      .upsert(chunk, { onConflict: 'economy_code,indicator_code,period' });
    if (error) throw new Error(`adb_kidb_values: ${error.message}`);
    written += chunk.length;
  }
  return written;
}

/* -------------------------------------------------------------- sync */
export async function syncKidb(db, { budgetMs = Infinity, force = false } = {}) {
  const deadline = Date.now() + budgetMs;
  if (!apiBase()) return { skipped: true, reason: 'ADB_KIDB_API_BASE is not set' };
  const batches = buildBatches();
  if (!batches.length) return { skipped: true, reason: 'No economies or indicators configured' };

  let state = await readState(db);
  const fresh =
    state.pass_completed_at &&
    Date.now() - new Date(state.pass_completed_at).getTime() < REFRESH_AFTER_DAYS * 864e5;
  if (fresh && !force && state.cursor === 0) {
    return { skipped: true, reason: `Last full pass ${state.pass_completed_at}` };
  }
  if (state.cursor === 0) {
    state = { ...state, pass_started_at: new Date().toISOString() };
    await writeState(db, { cursor: 0, pass_started_at: state.pass_started_at, last_error: null });
  }

  let cursor = state.cursor;
  let rowsRead = 0;
  let rowsWritten = 0;
  const errors = [];
  /* Leave room for one more request plus its write before the deadline. */
  while (cursor < batches.length && Date.now() + MIN_INTERVAL_MS + 15000 < deadline) {
    try {
      const rows = await fetchKidb(batches[cursor], { deadline });
      rowsRead += rows.length;
      rowsWritten += await upsertRows(db, rows);
      cursor += 1;
      await writeState(db, { cursor }); // checkpoint after every batch
    } catch (e) {
      errors.push(`batch ${cursor}: ${e.message}`);
      await writeState(db, { cursor, last_error: e.message.slice(0, 500) });
      if (e.retryable) break; // rate-limited: stop and resume next run
      cursor += 1; // bad batch: skip it, log it, keep going
      await writeState(db, { cursor });
    }
  }

  const done = cursor >= batches.length;
  if (done) await writeState(db, { cursor: 0, pass_completed_at: new Date().toISOString() });
  return {
    rowsRead,
    rowsWritten,
    batchesDone: cursor,
    batchesTotal: batches.length,
    passComplete: done,
    errors,
  };
}
