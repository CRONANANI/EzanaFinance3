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
        if (attempt === MAX_RETRIES) {
          /* Unreachable or timing out after every retry: the server is down, not the batch
             bad, so stop and resume at this batch next run (rotate.js backs off). */
          e.retryable = true;
          throw e;
        }
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

/* A server-side failure (5xx, timeout, unreachable), as opposed to a bad request or a parse
   error. Only these count toward the rotator's backoff. 429 is a rate limit, not an outage:
   the run already stops and resumes next hour. */
const SERVER_ERROR_RE =
  /\b5\d\d from |timed? ?out|timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|socket hang up|aborted/i;
export const isServerError = (msg) => SERVER_ERROR_RE.test(String(msg || ''));

/* macro_ingest_state has no streak column, so the failure streak rides at the front of
   last_error: "[server-error x3] 500 from sdmx.oecd.org after 4 attempts". */
const STREAK_RE = /^\[server-error x(\d+)\]\s*/;
export function serverErrorStreak(lastError) {
  const m = STREAK_RE.exec(String(lastError || ''));
  return m ? Number(m[1]) : 0;
}
export const withStreak = (n, msg) =>
  `[server-error x${n}] ${String(msg || '').replace(STREAK_RE, '')}`.slice(0, 500);

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

/**
 * One row per (series_key, period), keeping the last occurrence. Postgres refuses an
 * upsert that touches the same conflict key twice ("ON CONFLICT DO UPDATE command cannot
 * affect row a second time"), which would fail the whole batch. The source is constant
 * within a call, so (series_key, period) is the full (source, series_key, period) key.
 * Parsers should not emit duplicates; this is the backstop, and the count is reported.
 */
export function dedupeRows(rows) {
  const byKey = new Map();
  for (const r of rows) byKey.set(`${r.series_key}\u0000${r.period}`, r);
  return { rows: [...byKey.values()], dropped: rows.length - byKey.size };
}

async function upsertRows(db, source, rows) {
  const { rows: clean, dropped } = dedupeRows(rows.filter((r) => r.series_key && r.period));
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
  return { written, dropped };
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
  const startCursor = cursor;
  const streakBefore = serverErrorStreak(state.last_error);
  let rowsRead = 0;
  let rowsWritten = 0;
  let duplicatesDropped = 0;
  let batchesOk = 0;
  let stoppedOn = null; // the error a retryable failure stopped the run on
  const errors = [];
  while (cursor < batches.length && Date.now() + adapter.minIntervalMs + 20000 < deadline) {
    try {
      const rows = await adapter.fetchBatch(batches[cursor], (url, opts) =>
        fetchWithRetry(url, { ...opts, deadline }),
      );
      rowsRead += rows.length;
      const { written, dropped } = await upsertRows(db, source, rows);
      rowsWritten += written;
      duplicatesDropped += dropped;
      /* Optional mirror into another table (GPR also feeds lighthouse_observations). */
      if (typeof adapter.afterBatch === 'function') await adapter.afterBatch(db, rows);
      cursor += 1;
      batchesOk += 1;
      await writeState(db, source, { cursor });
    } catch (e) {
      errors.push(`batch ${cursor} (${batches[cursor]?.label || ''}): ${e.message}`);
      await writeState(db, source, { cursor, last_error: String(e.message).slice(0, 500) });
      if (e.retryable) {
        stoppedOn = e; // rate-limited or down: resume here next run
        break;
      }
      cursor += 1; // bad batch: log it and move on
      await writeState(db, source, { cursor });
    }
  }
  const reachedEnd = cursor >= batches.length;
  /* A pass that started this run and in which every batch failed got nothing. It is not
     complete, so the next hourly run tries again instead of waiting refreshAfterDays. */
  const allFailed = reachedEnd && startCursor === 0 && batchesOk === 0 && errors.length > 0;
  const done = reachedEnd && !allFailed;
  if (done) {
    await writeState(db, source, { cursor: 0, pass_completed_at: new Date().toISOString() });
  } else if (allFailed) {
    await writeState(db, source, { cursor: 0, pass_started_at: null, pass_completed_at: null });
  }

  /* Server-error streak for the rotator's backoff (rotate.js). The run ended on a server
     error when a 5xx or timeout stopped it, or when every batch failed that way. */
  const lastMsg = stoppedOn?.message || (errors.length ? errors[errors.length - 1] : '');
  const endedOnServerError =
    (stoppedOn && isServerError(stoppedOn.message)) ||
    (allFailed && errors.every((m) => isServerError(m)));
  let serverErrorStreakAfter = 0;
  if (endedOnServerError) {
    serverErrorStreakAfter = streakBefore + 1;
    await writeState(db, source, { last_error: withStreak(serverErrorStreakAfter, lastMsg) });
  } else if (streakBefore && (batchesOk > 0 || !errors.length)) {
    // Recovered: drop the streak so the rotator stops backing off.
    await writeState(db, source, { last_error: errors.length ? lastMsg.slice(0, 500) : null });
  }

  return {
    source,
    rowsRead,
    rowsWritten,
    duplicatesDropped,
    batchesDone: cursor,
    batchesTotal: batches.length,
    passComplete: done,
    ...(allFailed ? { allBatchesFailed: true } : {}),
    ...(serverErrorStreakAfter ? { serverErrorStreak: serverErrorStreakAfter } : {}),
    errors,
  };
}
