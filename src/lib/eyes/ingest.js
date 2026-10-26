/**
 * Eyes Above ingest jobs, shared by the cron routes and the CLIs. Each job
 * reads its cursor from eyes_ingest_state, writes with upserts (idempotent),
 * and advances the cursor only when every write succeeded. The cron routes
 * revalidate the `eyes` cache tag after a run. SERVER ONLY.
 */
import { chokepointDays, dateWindows, locations, portDays, topPorts } from './portwatch.js';
import { EYES_FRED_SERIES, fredObservations, fredSeries } from './fred.js';
import { patentsGranted } from './patents.js';

const CHUNK = 1000;
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const minusDays = (iso, n) => new Date(Date.parse(iso) - n * 86400000).toISOString().slice(0, 10);

/* One row per conflict key: Postgres refuses an upsert batch that touches the
   same row twice, and a paged source can repeat a row at a page edge. */
function dedupe(rows, onConflict) {
  const keys = onConflict.split(',');
  const m = new Map();
  for (const r of rows) m.set(keys.map((k) => r[k]).join('|'), r);
  return [...m.values()];
}

async function upsert(db, table, rows, onConflict) {
  const unique = dedupe(rows, onConflict);
  for (let i = 0; i < unique.length; i += CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await db.from(table).upsert(unique.slice(i, i + CHUNK), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function getState(db, job) {
  const { data } = await db.from('eyes_ingest_state').select('*').eq('job', job).maybeSingle();
  return data || null;
}
async function setState(db, job, cursor, detail) {
  const { error } = await db.from('eyes_ingest_state').upsert(
    {
      job,
      cursor,
      detail,
      last_ok_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'job' },
  );
  if (error) throw new Error(`eyes_ingest_state: ${error.message}`);
}

/* Newest date already stored in a table: the resume point when a job has no
   checkpoint yet (rows written by a run that failed before checkpointing). */
async function newestStored(db, table) {
  const { data, error } = await db
    .from(table)
    .select('date')
    .order('date', { ascending: false })
    .limit(1);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data?.[0]?.date || null;
}

/**
 * PortWatch chokepoint transits, with their own checkpoint
 * (portwatch_chokepoints) written after every window, so a backfill that runs
 * out of time resumes where it stopped instead of starting over. Runs before
 * the ports and does not depend on them.
 */
export async function ingestChokepoints(db, { backfillDays = 730, deadline = Infinity } = {}) {
  const job = 'portwatch_chokepoints';
  const state = await getState(db, job);
  const stored = state?.cursor || (await newestStored(db, 'eyes_chokepoint_transits'));
  const since = stored ? minusDays(stored, 21) : daysAgo(backfillDays);
  const windows = dateWindows(since, daysAgo(0), stored ? 400 : 90);
  const known = new Set();
  let cursor = stored || null;
  let rows = 0;
  let partial = false;
  for (const [from, to] of windows) {
    if (Date.now() > deadline) {
      partial = true;
      break;
    }
    // eslint-disable-next-line no-await-in-loop
    const choke = await chokepointDays(from, to);
    const fresh = [...new Set(choke.map((c) => c.portid))].filter((id) => !known.has(id));
    if (fresh.length) {
      /* Coordinates are a nicety: a failed metadata read never blocks the
         transits. */
      // eslint-disable-next-line no-await-in-loop
      const cloc = await locations('PortWatch_chokepoints_database', fresh).catch((e) => {
        console.warn('[eyes/portwatch] chokepoint locations skipped:', e?.message || e);
        return new Map();
      });
      // eslint-disable-next-line no-await-in-loop
      await upsert(
        db,
        'eyes_chokepoints',
        fresh.map((id) => ({
          portid: id,
          portname: choke.find((c) => c.portid === id)?.portname || cloc.get(id)?.name || id,
          lat: cloc.get(id)?.lat ?? null,
          lon: cloc.get(id)?.lon ?? null,
          updated_at: new Date().toISOString(),
        })),
        'portid',
      );
      for (const id of fresh) known.add(id);
    }
    // eslint-disable-next-line no-await-in-loop
    await upsert(
      db,
      'eyes_chokepoint_transits',
      choke.map(({ portname: _n, ...r }) => r),
      'portid,date',
    );
    rows += choke.length;
    for (const r of choke) if (!cursor || r.date > cursor) cursor = r.date;
    // eslint-disable-next-line no-await-in-loop
    if (cursor) await setState(db, job, cursor, { rows, through: to });
  }
  return { since, through: cursor, rows, windows: windows.length, partial };
}

/**
 * PortWatch ports: re-rank the tracked top ports monthly, then pull new days
 * 25 ports at a time, writing each chunk as it lands. Checkpoint `portwatch`;
 * with no checkpoint it resumes from the newest stored day rather than
 * re-reading two years.
 */
export async function ingestPorts(
  db,
  { backfillDays = 730, topN = 100, deadline = Infinity } = {},
) {
  const state = await getState(db, 'portwatch');
  const stored = state?.cursor || (await newestStored(db, 'eyes_port_activity'));
  const since = stored ? minusDays(stored, 21) : daysAgo(backfillDays);

  /* Re-rank when the ranking is a month old. Without a checkpoint, the newest
     tracked port's updated_at is the ranking date. */
  let rankedAt = state?.detail?.rankedAt || null;
  if (!rankedAt) {
    const { data } = await db
      .from('eyes_ports')
      .select('updated_at')
      .eq('tracked', true)
      .order('updated_at', { ascending: false })
      .limit(1);
    rankedAt = data?.[0]?.updated_at || null;
  }
  const rerank = !rankedAt || Date.now() - Date.parse(rankedAt) > 30 * 86400000;
  let ports;
  if (rerank) {
    const top = await topPorts(daysAgo(365), topN);
    const loc = await locations(
      'PortWatch_ports_database',
      top.map((p) => p.portid),
    );
    ports = top.map((p) => ({
      portid: p.portid,
      portname: p.portname || loc.get(p.portid)?.name || p.portid,
      country: p.country,
      iso3: p.iso3,
      calls_12m: p.calls_12m,
      lat: loc.get(p.portid)?.lat ?? null,
      lon: loc.get(p.portid)?.lon ?? null,
      tracked: true,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await db.from('eyes_ports').update({ tracked: false }).neq('portid', '');
    if (error) throw new Error(`eyes_ports: ${error.message}`);
    await upsert(db, 'eyes_ports', ports, 'portid');
    rankedAt = new Date().toISOString();
  } else {
    const { data, error } = await db.from('eyes_ports').select('portid').eq('tracked', true);
    if (error) throw new Error(error.message);
    ports = data || [];
  }

  const ids = ports.map((p) => p.portid);
  let written = 0;
  let latest = stored || since;
  let partial = false;
  for (let i = 0; i < ids.length; i += 25) {
    if (Date.now() > deadline) {
      partial = true;
      break;
    }
    // eslint-disable-next-line no-await-in-loop
    const days = await portDays(ids.slice(i, i + 25), since);
    // eslint-disable-next-line no-await-in-loop
    await upsert(db, 'eyes_port_activity', days, 'portid,date');
    written += days.length;
    for (const r of days) if (r.date > latest) latest = r.date;
  }
  /* The cursor moves only when every chunk landed; a partial run keeps the
     old one, so the next run re-reads the same window (upserts are
     idempotent). */
  if (!partial) {
    await setState(db, 'portwatch', latest, { rankedAt, ports: ids.length, portDays: written });
  }
  return { since, through: latest, ports: ids.length, portDays: written, partial };
}

/**
 * PortWatch: chokepoints first (small, and independent of the ports), then
 * ports. One failing does not stop the other; the run still fails afterwards,
 * naming each failure, so the cron log shows it. `budgetMs` stops starting
 * new windows or chunks once spent (the cron passes its time budget).
 */
export async function ingestPortWatch(db, { budgetMs = Infinity, ...opts } = {}) {
  const deadline = Date.now() + budgetMs;
  const result = {};
  const errors = [];
  try {
    result.chokepoints = await ingestChokepoints(db, { ...opts, deadline });
  } catch (e) {
    errors.push(`chokepoints: ${e?.message || e}`);
  }
  try {
    result.ports = await ingestPorts(db, { ...opts, deadline });
  } catch (e) {
    errors.push(`ports: ${e?.message || e}`);
  }
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.result = result;
    throw err;
  }
  return result;
}

/** FRED: every configured series, from 10 years back on the first run. */
export async function ingestFred(db) {
  const results = [];
  for (const s of EYES_FRED_SERIES) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const meta = await fredSeries(s.id);
      if (!meta) {
        results.push({ id: s.id, skipped: 'unknown series id' });
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const { data: cur } = await db
        .from('eyes_series')
        .select('last_date')
        .eq('series_id', s.id)
        .maybeSingle();
      const start = cur?.last_date ? minusDays(cur.last_date, 400) : daysAgo(3650);
      // eslint-disable-next-line no-await-in-loop
      const obs = await fredObservations(s.id, start);
      const last = obs.filter((o) => o.value != null).at(-1)?.date || cur?.last_date || null;
      // eslint-disable-next-line no-await-in-loop
      await upsert(
        db,
        'eyes_series',
        [
          {
            series_id: s.id,
            source: 'fred',
            dataset: s.dataset,
            title: meta.title,
            units: meta.units,
            frequency: meta.frequency,
            last_date: last,
            synced_at: new Date().toISOString(),
          },
        ],
        'series_id',
      );
      // eslint-disable-next-line no-await-in-loop
      await upsert(
        db,
        'eyes_series_obs',
        obs.map((o) => ({ series_id: s.id, ...o })),
        'series_id,date',
      );
      results.push({ id: s.id, obs: obs.length, last });
    } catch (e) {
      results.push({ id: s.id, error: String(e.message || e) });
    }
  }
  return results;
}

/** Patents granted since the cursor (default: the last 21 days). */
export async function ingestPatents(db, { from = null, to = null, log = () => {} } = {}) {
  const state = await getState(db, 'patents');
  const start = from || (state?.cursor ? minusDays(state.cursor, 14) : daysAgo(21));
  const end = to || daysAgo(0);
  let matched = 0;
  const total = await patentsGranted(
    start,
    end,
    async (rows) => {
      const withAssignee = rows.filter((r) => r.assignee);
      /* Tickers resolve in the database (eyes_assignee_ticker) so the CLI, the
         cron and a later re-resolve all agree. */
      await upsert(db, 'eyes_patents', withAssignee, 'patent_id');
      matched += withAssignee.length;
      log(`${withAssignee.length} of ${rows.length} with an assignee`);
    },
    { log },
  );
  const { data: resolved, error } = await db.rpc('eyes_resolve_patent_tickers', { p_all: false });
  if (error) throw new Error(`resolve: ${error.message}`);
  if (!from) await setState(db, 'patents', end, { granted: total, withAssignee: matched });
  return { from: start, to: end, granted: total, withAssignee: matched, tickersResolved: resolved };
}
