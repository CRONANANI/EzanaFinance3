/**
 * ADB KIDB sync (Nov 2): the SDMX-JSON parser, the request URL, batching, the
 * skip-until-configured guard and 429 back-off. Network is stubbed.
 *   npm run test:adb-kidb
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const kidb = await import('../src/lib/adb/kidb.js');
const { parseResponse, buildRequestUrl, buildBatches, syncKidb, fetchKidb, resetPacing, SOURCE } =
  kidb;

const STRUCTURE = {
  dimensions: {
    series: [
      { id: 'FREQ', values: [{ id: 'A', name: { en: 'Annual' } }] },
      {
        id: 'INDICATOR',
        values: [{ id: 'NGDP_XDC', name: { en: 'GDP at current prices' } }],
      },
      {
        id: 'ECONOMY',
        values: [
          { id: 'PHI', name: { en: 'Philippines' } },
          { id: 'INO', name: { en: 'Indonesia' } },
        ],
      },
    ],
    observation: [{ id: 'TIME_PERIOD', values: [{ id: '2023' }, { id: '2024' }] }],
  },
  attributes: {
    series: [{ id: 'UNIT_MEASURE', values: [{ id: 'PHP_M', name: { en: 'PHP million' } }] }],
  },
};
const DATASET = {
  series: {
    '0:0:0': { attributes: [0], observations: { 0: [24300000], 1: ['26400000.5'] } },
    '0:0:1': { attributes: [0], observations: { 1: [null] } },
  },
};

test('SDMX-JSON 1.0: one row per observation, values numeric or null', () => {
  const rows = parseResponse({
    meta: { prepared: '2025-08-26' },
    structure: STRUCTURE,
    dataSets: [DATASET],
  });
  assert.deepEqual(rows[0], {
    economy_code: 'PHI',
    indicator_code: 'NGDP_XDC',
    period: '2023',
    value: 24300000,
    indicator_name: 'GDP at current prices',
    unit: 'PHP million',
    economy_name: 'Philippines',
    source_updated: '2025-08-26',
  });
  assert.equal(rows[1].value, 26400000.5);
  assert.equal(rows[2].economy_code, 'INO');
  assert.equal(rows[2].value, null);
  assert.equal(rows.length, 3);
});

test('SDMX-JSON 2.0 layout parses the same', () => {
  const rows = parseResponse({ data: { structures: [STRUCTURE], dataSets: [DATASET] } });
  assert.equal(rows.length, 3);
  assert.deepEqual(parseResponse({}), []);
});

test('request URL packs every economy and indicator into one SDMX key', () => {
  const url = buildRequestUrl(
    { dataflow: 'EO_NA', economies: ['PHI', 'INO'], indicators: ['NGDP_XDC', 'NGDP_R'] },
    'https://example.test/sdmx',
  );
  assert.equal(
    decodeURIComponent(url),
    'https://example.test/sdmx/data/ADB,EO_NA,latest/A.NGDP_XDC+NGDP_R.PHI+INO?output_format=JSON',
  );
});

test('batches: economies chunked per request, one dataflow each', () => {
  const econ = Array.from({ length: 23 }, (_, i) => `E${i}`);
  const b = buildBatches(econ, [{ dataflow: 'EO_NA', indicators: ['X'] }]);
  assert.equal(b.length, 3);
  assert.equal(b[0].economies.length, 10);
  assert.equal(b[2].economies.length, 3);
});

test('the job skips, touching nothing, until it is configured', async () => {
  delete process.env.ADB_KIDB_API_BASE;
  const r = await syncKidb({ from: () => assert.fail('no database call') });
  assert.equal(r.skipped, true);
  process.env.ADB_KIDB_API_BASE = 'https://example.test/sdmx';
  const r2 = await syncKidb({ from: () => assert.fail('no database call') });
  assert.equal(r2.skipped, true, 'empty work list');
  assert.match(SOURCE, /Asian Development Bank/);
});

test('429 backs off (Retry-After), then reads the data', async () => {
  process.env.ADB_KIDB_API_BASE = 'https://example.test/sdmx';
  resetPacing();
  let n = 0;
  const waits = [];
  globalThis.fetch = async () => {
    n += 1;
    return n === 1
      ? new Response('slow down', { status: 429, headers: { 'retry-after': '2' } })
      : new Response(JSON.stringify({ structure: STRUCTURE, dataSets: [DATASET] }), {
          status: 200,
        });
  };
  const rows = await fetchKidb(
    { dataflow: 'EO_NA', economies: ['PHI'], indicators: ['NGDP_XDC'] },
    { sleepFn: async (ms) => waits.push(ms) },
  );
  assert.equal(n, 2);
  assert.deepEqual(waits, [2000]);
  assert.equal(rows.length, 3);
});

test('429 past the deadline stops as retryable, for the next run to resume', async () => {
  resetPacing();
  globalThis.fetch = async () => new Response('', { status: 429 });
  await assert.rejects(
    fetchKidb(
      { dataflow: 'EO_NA', economies: ['PHI'], indicators: ['NGDP_XDC'] },
      { deadline: Date.now() + 1000, sleepFn: async () => {} },
    ),
    (e) => e.retryable === true,
  );
});
