/**
 * Macro sync (Nov 2): BCB windows and parsing, BIS SDMX-CSV, CEPALSTAT rows, and the shared
 * engine's skip, checkpoint and back-off behaviour. Network and database are stubbed.
 *   npm run test:macro-sync
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { runSync, makeFetcher, num } = await import('../src/lib/macro-sync/engine.js');
const { ADAPTERS } = await import('../src/lib/macro-sync/index.js');
const { parseBisCsv } = await import('../src/lib/macro-sync/sources/bis.js');
const { parseCepal } = await import('../src/lib/macro-sync/sources/cepal.js');

/* A tiny in-memory stand-in for the Supabase client. */
function fakeDb({ missing = false } = {}) {
  const state = new Map();
  const values = new Map();
  const db = {
    state,
    values,
    from(table) {
      const q = {
        select: () => q,
        eq: (_c, v) => ((q.key = v), q),
        maybeSingle: async () =>
          missing
            ? { data: null, error: { code: 'PGRST205', message: 'relation does not exist' } }
            : { data: state.get(q.key) || null, error: null },
        upsert: async (rows) => {
          for (const r of [].concat(rows)) {
            if (table === 'macro_ingest_state')
              state.set(r.source, { ...state.get(r.source), ...r });
            else values.set(`${r.source}|${r.series_key}|${r.period}`, r);
          }
          return { error: null };
        },
      };
      return q;
    },
  };
  return db;
}

test('num reads decimal commas and points, null for junk', () => {
  assert.equal(num('1,23'), 1.23);
  assert.equal(num('13.75'), 13.75);
  assert.equal(num(''), null);
  assert.equal(num('NaN'), null);
});

test('BCB: daily series split into windows of at most 10 years', () => {
  const batches = ADAPTERS.bcb.buildBatches(new Date('2026-11-02T00:00:00Z'));
  const selic = batches.filter((b) => b.code === 432);
  assert.deepEqual(
    selic.map((b) => [b.from, b.to]),
    [
      ['01/01/2000', '31/12/2009'],
      ['01/01/2010', '31/12/2019'],
      ['01/01/2020', '02/11/2026'],
    ],
  );
});

test('BCB: rows from the SGS response, monthly periods trimmed, 404 is empty', async () => {
  const b = { code: 433, name: 'IPCA', unit: '% m/m', freq: 'M' };
  const res = await ADAPTERS.bcb.fetchBatch(
    b,
    async () =>
      new Response(JSON.stringify([{ data: '01/09/2026', valor: '0,44' }]), { status: 200 }),
  );
  assert.deepEqual(res[0], {
    series_key: 'SGS.433',
    country_iso3: 'BRA',
    period: '2026-09',
    value: 0.44,
    series_name: 'IPCA',
    unit: '% m/m',
    frequency: 'M',
    dataset: 'SGS',
  });
  const none = await ADAPTERS.bcb.fetchBatch(b, async () => new Response('', { status: 404 }));
  assert.deepEqual(none, []);
});

test('BIS: SDMX-CSV to rows with ISO3 countries', () => {
  const csv = 'FREQ,REF_AREA,TIME_PERIOD,OBS_VALUE\nM,BR,2026-09,15\nM,US,2026-09,4.5\n';
  const rows = parseBisCsv(csv, { flow: 'WS_CBPOL', name: 'Central bank policy rates' });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].series_key, 'WS_CBPOL:M.BR');
  assert.equal(rows[0].country_iso3, 'BRA');
  assert.equal(rows[0].value, 15);
  assert.equal(rows[1].country_iso3, 'USA');
});

test('CEPALSTAT: rows with ISO3 from country names, monthly periods', () => {
  const rows = parseCepal(
    {
      body: {
        data: [
          {
            Country__ESTANDAR: 'Chile',
            Years__ESTANDAR: 2025,
            Months: 'March',
            value: '112.4',
            unit: 'Index',
          },
        ],
      },
    },
    { id: 365, name: 'Consumer price index' },
  );
  assert.equal(rows[0].country_iso3, 'CHL');
  assert.equal(rows[0].period, '2025-03');
  assert.equal(rows[0].frequency, 'M');
  assert.equal(rows[0].value, 112.4);
});

test('engine: AfDB with nothing configured skips without touching the database', async () => {
  const r = await runSync({ from: () => assert.fail('no database call') }, ADAPTERS.afdb);
  assert.equal(r.skipped, true);
});

test('engine: before the migration, a run skips instead of failing', async () => {
  const r = await runSync(fakeDb({ missing: true }), ADAPTERS.bis);
  assert.equal(r.skipped, true);
  assert.match(r.reason, /not migrated/);
});

const stubAdapter = (failAt = -1) => ({
  source: 'stub',
  minIntervalMs: 0,
  buildBatches: () => [0, 1, 2].map((i) => ({ i, label: `b${i}` })),
  async fetchBatch(b) {
    if (b.i === failAt) {
      const e = new Error('429');
      e.retryable = true;
      throw e;
    }
    return [{ series_key: `S${b.i}`, period: '2026-01', value: b.i }];
  },
});

test('engine: a full pass writes every batch, resets the cursor, then skips for a week', async () => {
  const db = fakeDb();
  const r = await runSync(db, stubAdapter());
  assert.equal(r.passComplete, true);
  assert.equal(r.rowsWritten, 3);
  assert.equal(db.state.get('stub').cursor, 0);
  const again = await runSync(db, stubAdapter());
  assert.equal(again.skipped, true);
});

test('engine: rate-limited stops and checkpoints, the next run resumes there', async () => {
  const db = fakeDb();
  const r = await runSync(db, stubAdapter(1));
  assert.equal(r.passComplete, false);
  assert.equal(db.state.get('stub').cursor, 1, 'checkpointed at the failed batch');
  const r2 = await runSync(db, stubAdapter());
  assert.equal(r2.passComplete, true);
  assert.equal(r2.rowsWritten, 2, 'batches 1 and 2 only');
});

test('fetcher: 429 honours Retry-After; past the deadline it is retryable', async () => {
  let n = 0;
  const waits = [];
  globalThis.fetch = async () => {
    n += 1;
    return n === 1
      ? new Response('', { status: 429, headers: { 'retry-after': '3' } })
      : new Response('{}', { status: 200 });
  };
  const f = makeFetcher(0, { sleep: async (ms) => waits.push(ms) });
  const res = await f('https://example.test/x');
  assert.equal(res.status, 200);
  assert.deepEqual(waits, [3000]);
  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(
    makeFetcher(0, { sleep: async () => {} })('https://example.test/x', {
      deadline: Date.now() + 100,
    }),
    (e) => e.retryable === true,
  );
});
