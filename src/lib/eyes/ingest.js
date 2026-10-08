/**
 * Eyes Above ingest jobs, shared by the cron routes and the CLIs. Each job
 * reads its cursor from eyes_ingest_state, writes with upserts (idempotent),
 * and advances the cursor only when every write succeeded. The cron routes
 * revalidate the `eyes` cache tag after a run. SERVER ONLY.
 */
import { chokepointDays, locations, portDays, topPorts } from './portwatch.js';
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

/** PortWatch: refresh the tracked top ports monthly, then pull new days. */
export async function ingestPortWatch(db, { backfillDays = 730, topN = 100 } = {}) {
  const state = await getState(db, 'portwatch');
  const first = !state?.cursor;
  const since = first ? daysAgo(backfillDays) : minusDays(state.cursor, 21);

  /* Re-rank the ports on the first run and when the ranking is a month old. */
  const rankedAt = state?.detail?.rankedAt;
  const rerank = first || !rankedAt || Date.now() - Date.parse(rankedAt) > 30 * 86400000;
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
  } else {
    const { data, error } = await db.from('eyes_ports').select('portid').eq('tracked', true);
    if (error) throw new Error(error.message);
    ports = data;
  }

  const days = await portDays(
    ports.map((p) => p.portid),
    since,
  );
  await upsert(db, 'eyes_port_activity', days, 'portid,date');

  const choke = await chokepointDays(since);
  const ids = [...new Set(choke.map((c) => c.portid))];
  const cloc = await locations('PortWatch_chokepoints_database', ids);
  await upsert(
    db,
    'eyes_chokepoints',
    ids.map((id) => ({
      portid: id,
      portname: choke.find((c) => c.portid === id)?.portname || cloc.get(id)?.name || id,
      lat: cloc.get(id)?.lat ?? null,
      lon: cloc.get(id)?.lon ?? null,
      updated_at: new Date().toISOString(),
    })),
    'portid',
  );
  await upsert(
    db,
    'eyes_chokepoint_transits',
    choke.map(({ portname: _n, ...r }) => r),
    'portid,date',
  );

  const latest = [...days, ...choke].reduce(
    (m, r) => (r.date > m ? r.date : m),
    state?.cursor || since,
  );
  await setState(db, 'portwatch', latest, {
    rankedAt: rerank ? new Date().toISOString() : rankedAt,
    ports: ports.length,
    portDays: days.length,
    chokepointDays: choke.length,
  });
  return {
    since,
    through: latest,
    ports: ports.length,
    portDays: days.length,
    chokepointDays: choke.length,
  };
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
