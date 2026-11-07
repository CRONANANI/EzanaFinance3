/**
 * RAG latency (Nov 2026): the per-request timer behind rag_request_timings.
 *
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-rag-latency.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { createRequestTimer } = await import('@/lib/rag/request-timer');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* A stub admin client that records inserts. */
function stubAdmin({ throws = false } = {}) {
  const inserts = [];
  return {
    inserts,
    from(table) {
      if (throws) throw new Error('boom');
      return {
        insert(row) {
          inserts.push({ table, row });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

const quiet = (fn) => async () => {
  const info = console.info;
  console.info = () => {};
  try {
    await fn();
  } finally {
    console.info = info;
  }
};

test('time() records a stage on success and returns the value', async () => {
  const t = createRequestTimer('sonar-query');
  const v = await t.time(
    'retrieve',
    sleep(12).then(() => 42),
  );
  assert.equal(v, 42);
  assert.ok(t.stages().retrieve >= 10, 'ms recorded');
  const w = await t.time('synth', () => Promise.resolve('ok'));
  assert.equal(w, 'ok', 'accepts a function too');
  assert.ok('synth' in t.stages());
});

test('time() records a stage when the work throws, then rethrows', async () => {
  const t = createRequestTimer('help-center');
  await assert.rejects(
    t.time('synth', async () => {
      await sleep(5);
      throw new Error('model down');
    }),
    /model down/,
  );
  assert.ok(t.stages().synth >= 0);
});

test('firstByte() records once', async () => {
  const t = createRequestTimer('sonar-query');
  await sleep(5);
  const a = t.firstByte();
  await sleep(10);
  const b = t.firstByte();
  assert.equal(a, b);
});

test(
  'finish() inserts one row, at most once, with timings only',
  quiet(async () => {
    const admin = stubAdmin();
    const t = createRequestTimer('sonar-query');
    t.set('gate', 12.6);
    t.set('grounding_regen', 1);
    t.firstByte();
    t.finish(admin, { cacheHit: true, streamed: true, degraded: 'stream_cut' });
    t.finish(admin, { cacheHit: false });
    assert.equal(admin.inserts.length, 1);
    const { table, row } = admin.inserts[0];
    assert.equal(table, 'rag_request_timings');
    assert.equal(row.surface, 'sonar-query');
    assert.equal(row.stages.gate, 13, 'rounded to integer ms');
    assert.equal(row.stages.grounding_regen, 1);
    assert.equal(row.cache_hit, true);
    assert.equal(row.streamed, true);
    assert.equal(row.degraded, 'stream_cut');
    assert.ok(Number.isInteger(row.total_ms) && Number.isInteger(row.first_byte_ms));
    assert.deepEqual(
      Object.keys(row).sort(),
      ['cache_hit', 'degraded', 'first_byte_ms', 'stages', 'streamed', 'surface', 'total_ms'],
      'no query text, user id or IP',
    );
  }),
);

test(
  'finish() never throws: null admin, a throwing client, a rejected insert',
  quiet(async () => {
    assert.doesNotThrow(() => createRequestTimer('help-center').finish(null));
    assert.doesNotThrow(() =>
      createRequestTimer('help-center').finish(stubAdmin({ throws: true })),
    );
    const rejecting = {
      from: () => ({ insert: () => Promise.reject(new Error('db down')) }),
    };
    assert.doesNotThrow(() => createRequestTimer('help-center').finish(rejecting));
    await sleep(5); /* the rejection is swallowed, not unhandled */
  }),
);
