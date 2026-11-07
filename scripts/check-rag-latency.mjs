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

/* ------------------------------------------------------------------ help center (PROMPT_3) */

const H = await import('@/lib/help-center-ask');

const userRow = {
  audience: 'user',
  slug: 'reset-password',
  title: 'Reset your password',
  category: 'Account',
  content: 'Open Settings, then Security.',
};

test('a partner question with no partner match is answered from the user center in one call', async () => {
  const calls = [];
  const searchHelp = (q, { audience }) => {
    calls.push(audience);
    return audience === 'user' ? [userRow] : [];
  };
  const timer = createRequestTimer('help-center');
  const out = await H.retrieveHelpSources('how do I reset my password', 'partner', {
    admin: null,
    searchHelp,
    timer,
  });
  assert.equal(out.answeredFrom, 'user');
  assert.equal(out.sources[0].slug, 'reset-password');
  assert.equal(out.sources[0].audience, 'user');
  assert.deepEqual(calls, ['partner', 'user']);
  assert.ok('retrieve' in timer.stages() && 'retrieve_fallback' in timer.stages());
});

test('a partner match stays partner, and a user question never falls back', async () => {
  const partnerRow = { ...userRow, audience: 'partner', slug: 'payouts' };
  const searchHelp = (q, { audience }) => (audience === 'partner' ? [partnerRow] : [userRow]);
  const p = await H.retrieveHelpSources('payouts', 'partner', { searchHelp });
  assert.equal(p.answeredFrom, 'partner');
  assert.equal(p.sources[0].slug, 'payouts');
  const calls = [];
  const none = (q, { audience }) => (calls.push(audience), []);
  const u = await H.retrieveHelpSources('nothing matches', 'user', { searchHelp: none });
  assert.equal(u.answeredFrom, 'user');
  assert.equal(u.sources.length, 0);
  assert.deepEqual(calls, ['user'], 'no second retrieval for user questions');
});

test('the help cache key differs by audience and normalizes the query', () => {
  const a = H.helpCacheKey('partner', '  Reset   Password ');
  assert.equal(a, 'help:ask:v1:partner:reset password');
  assert.notEqual(a, H.helpCacheKey('user', 'reset password'));
  assert.equal(H.helpCacheKey(null, 'x y'), 'help:ask:v1:all:x y');
});

test('only grounded, sourced, non-degraded answers are cached', () => {
  const src = [{ slug: 's' }];
  assert.equal(H.shouldCacheHelp({ answer: 'A.', grounded: true, sources: src }), true);
  assert.equal(
    H.shouldCacheHelp({ answer: null, grounded: false, degraded: 'llm 529', sources: src }),
    false,
  );
  assert.equal(H.shouldCacheHelp({ answer: 'A.', grounded: true, sources: [] }), false);
  assert.equal(
    H.shouldCacheHelp({ answer: 'A.', grounded: true, degraded: 'timeout', sources: src }),
    false,
  );
});

test('the client makes one call and reads answeredFrom for the label', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(
    new URL('../src/components/help-center/SupportCenter.jsx', import.meta.url),
    'utf8',
  );
  assert.ok(!/call\('user'\)/.test(src), 'no second request for the user audience');
  assert.match(src, /data\?\.answeredFrom === 'user'/);
  const route = readFileSync(
    new URL('../src/app/api/help-center/ask/route.js', import.meta.url),
    'utf8',
  );
  assert.match(route, /SYNTH_TIMEOUT_MS = 8000/);
  assert.ok(!/new Map\(\)/.test(route), 'no per-instance answer cache');
});
