/**
 * Shared sync engine for official macro sources (AfDB, BCB, BIS, CEPALSTAT).
 *
 * An adapter describes a source:
 *   { source, minIntervalMs, refreshAfterDays?, attribution,
 *     buildBatches(passDate) -> Batch[],          // deterministic for a given pass date
 *     fetchBatch(batch, fetchWithRetry) -> Row[] }
 * Row = { series_key, country_iso3, period, value, series_name, unit, frequency, dataset }
 * Optional adapter fields: requiresEnv (string[]; the rotator skips the adapter when any is
 * unset), enabled (false = registered but never run), dedicatedCron (true = has its own cron
 * route, so the rotator leaves it alone), afterBatch(db, rows) (mirror rows elsewhere).
 *
 * The batch list depends only on config and the pass start date, so the cursor stays valid
 * across runs. Every batch is checkpointed; rate-limit responses stop the run and the next
 * run resumes at the same batch. Upserts make re-runs harmless. Sonar reads
 * public.macro_series_values; nothing at ping time calls these sources.
 *
 * Relative imports carry .js so scripts/macro-sync-backfill.mjs runs under plain node.
 */

const MAX_RETRIES = 4;
const UPSERT_CHUNK = 500;
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function makeFetcher(minIntervalMs, { sleep = defaultSleep } = {}) {
  let last = 0;
  return async function fetchWithRetry(
    url,
    { headers = {}, deadline = Infinity, okStatuses = [] } = {},
  ) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const wait = last + minIntervalMs - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      let res;
      try {
        res = await fetch(url, { headers, cache: 'no-store' });
      } catch (e) {
        if (attempt === MAX_RETRIES) throw e;
        await sleep(Math.min(60000, 2000 * 2 ** attempt));
        continue;
      }
      if (res.ok || okStatuses.includes(res.status)) return res;
      if (res.status === 429 || res.status >= 500) {
        const ra = Number(res.headers.get('retry-after'));
        const backoff =
          Number.isFinite(ra) && ra > 0 ? ra * 1000 : Math.min(60000, 5000 * 2 ** attempt);
        if (attempt === MAX_RETRIES || Date.now() + backoff > deadline) {
          const err = new Error(
            `${res.status} from ${new URL(url).host} after ${attempt + 1} attempts`,
          );
          err.retryable = true;
          throw err;
        }
        await sleep(backoff);
        continue;
      }
      throw new Error(
        `${res.status} from ${new URL(url).host}: ${(await res.text()).slice(0, 200)}`,
      );
    }
    throw new Error('retries exhausted');
  };
}

/** A number or null; accepts "1,23" (decimal comma) and "1.23". */
export const num = (v) => {
  if (v === null || v === undefined || v === '' || v === 'NaN') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/* The migration creates these tables. Until it is applied a run skips instead
   of failing every day. */
const missingTable = (error) =>
  error &&
  (error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist/i.test(error.message || ''));

class NotMigrated extends Error {}

async function readState(db, source) {
  const { data, error } = await db
    .from('macro_ingest_state')
    .select('*')
    .eq('source', source)
    .maybeSingle();
  if (missingTable(error)) throw new NotMigrated('macro_ingest_state is missing');
  if (error) throw new Error(`macro_ingest_state: ${error.message}`);
  return data || { source, cursor: 0, pass_started_at: null, pass_completed_at: null };
}

async function writeState(db, source, patch) {
  const { error } = await db
    .from('macro_ingest_state')
    .upsert({ source, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'source' });
  if (error) throw new Error(`macro_ingest_state: ${error.message}`);
}

async function upsertRows(db, source, rows) {
  const clean = rows.filter((r) => r.series_key && r.period);
  let written = 0;
  for (let i = 0; i < clean.length; i += UPSERT_CHUNK) {
    const now = new Date().toISOString();
    const chunk = clean.slice(i, i + UPSERT_CHUNK).map((r) => ({ source, ...r, fetched_at: now }));
    const { error } = await db
      .from('macro_series_values')
      .upsert(chunk, { onConflict: 'source,series_key,period' });
    if (error) throw new Error(`macro_series_values: ${error.message}`);
    written += chunk.length;
  }
  return written;
}

export async function runSync(db, adapter, { budgetMs = Infinity, force = false, sleep } = {}) {
  const { source } = adapter;
  const deadline = Date.now() + budgetMs;
  const refreshDays = adapter.refreshAfterDays ?? 7;
  /* Nothing configured (AfDB without API access): skip before touching the database. */
  if (!adapter.buildBatches(new Date()).length) {
    return { source, skipped: true, reason: 'No series configured' };
  }
  let state;
  try {
    state = await readState(db, source);
  } catch (e) {
    if (e instanceof NotMigrated) {
      return { source, skipped: true, reason: 'Macro sync tables are not migrated yet' };
    }
    throw e;
  }

  const fresh =
    state.pass_completed_at &&
    Date.now() - new Date(state.pass_completed_at).getTime() < refreshDays * 864e5;
  if (fresh && !force && state.cursor === 0) {
    return { source, skipped: true, reason: `Last full pass ${state.pass_completed_at}` };
  }
  if (state.cursor === 0 || !state.pass_started_at) {
    state = { ...state, cursor: 0, pass_started_at: new Date().toISOString() };
    await writeState(db, source, {
      cursor: 0,
      pass_started_at: state.pass_started_at,
      last_error: null,
    });
  }

  const batches = adapter.buildBatches(new Date(state.pass_started_at));
  if (!batches.length) return { source, skipped: true, reason: 'No series configured' };
  const fetchWithRetry = makeFetcher(adapter.minIntervalMs, sleep ? { sleep } : {});

  let cursor = Math.min(state.cursor, batches.length);
  let rowsRead = 0;
  let rowsWritten = 0;
  const errors = [];
  while (cursor < batches.length && Date.now() + adapter.minIntervalMs + 20000 < deadline) {
    try {
      const rows = await adapter.fetchBatch(batches[cursor], (url, opts) =>
        fetchWithRetry(url, { ...opts, deadline }),
      );
      rowsRead += rows.length;
      rowsWritten += await upsertRows(db, source, rows);
      /* Optional mirror into another table (GPR also feeds lighthouse_observations). */
      if (typeof adapter.afterBatch === 'function') await adapter.afterBatch(db, rows);
      cursor += 1;
      await writeState(db, source, { cursor });
    } catch (e) {
      errors.push(`batch ${cursor} (${batches[cursor]?.label || ''}): ${e.message}`);
      await writeState(db, source, { cursor, last_error: String(e.message).slice(0, 500) });
      if (e.retryable) break; // rate-limited or down: resume here next run
      cursor += 1; // bad batch: log it and move on
      await writeState(db, source, { cursor });
    }
  }
  const done = cursor >= batches.length;
  if (done) {
    await writeState(db, source, { cursor: 0, pass_completed_at: new Date().toISOString() });
  }
  return {
    source,
    rowsRead,
    rowsWritten,
    batchesDone: cursor,
    batchesTotal: batches.length,
    passComplete: done,
    errors,
  };
}
