/* Quiver proxy hardening (lib/quiver/proxy.js). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { quiverParams, serveQuiver, clearQuiverCache } from '../src/lib/quiver/proxy.js';

const sp = (o) => new URLSearchParams(o);

test('parameters are validated before any upstream call', () => {
  assert.deepEqual(quiverParams(sp({ ticker: ' nvda ' }), ['ticker']).params, { ticker: 'NVDA' });
  assert.equal(quiverParams(sp({ ticker: 'NVDA;DROP' }), ['ticker']).error, 'ticker');
  assert.equal(
    quiverParams(sp({ bioguide_id: 'P000197' }), ['bioguide_id']).params.bioguide_id,
    'P000197',
  );
  assert.equal(quiverParams(sp({ bioguide_id: 'x' }), ['bioguide_id']).error, 'bioguide_id');
  assert.equal(quiverParams(sp({ date: '2026-1-1' }), ['date']).error, 'date');
  assert.equal(
    quiverParams(sp({ owner: 'Berkshire Hathaway' }), ['owner']).params.owner,
    'Berkshire Hathaway',
  );
  assert.equal(quiverParams(sp({ owner: '<script>' }), ['owner']).error, 'owner');
  /* Unknown parameters are ignored, never forwarded. */
  assert.deepEqual(quiverParams(sp({ page_size: '100000' }), ['ticker']).params, {});
});

test('cache, de-duplication, quota on misses only, failures not cached', async () => {
  clearQuiverCache();
  let upstream = 0;
  let quotaCalls = 0;
  const limiter = async () => {
    quotaCalls += 1;
    return { allowed: quotaCalls <= 2, resetAt: new Date() };
  };
  const fetchAll = async () => {
    upstream += 1;
    return { rows: [{ a: 1 }], pages: 1 };
  };
  const base = { route: 'sec13f', caller: 'u:1', dailyLimit: 2, limiter };
  const [a, b] = await Promise.all([
    serveQuiver({ ...base, params: { ticker: 'NVDA' }, fetchAll }),
    serveQuiver({ ...base, params: { ticker: 'NVDA' }, fetchAll }),
  ]);
  assert.equal(upstream, 1);
  assert.deepEqual(a.rows, b.rows);
  await serveQuiver({ ...base, params: { ticker: 'NVDA' }, fetchAll });
  assert.equal(upstream, 1); // cache hit, no quota spent
  assert.equal(quotaCalls, 1);
  await serveQuiver({ ...base, params: { ticker: 'AMD' }, fetchAll });
  const over = await serveQuiver({ ...base, params: { ticker: 'INTC' }, fetchAll });
  assert.equal(over.quotaExceeded, true);
  assert.equal(upstream, 2);
  clearQuiverCache();
  let n = 0;
  const failing = async () => {
    n += 1;
    return { rows: [], pages: 1, failed: true };
  };
  const ok = { ...base, limiter: async () => ({ allowed: true }) };
  await serveQuiver({ ...ok, params: {}, fetchAll: failing });
  await serveQuiver({ ...ok, params: {}, fetchAll: failing });
  assert.equal(n, 2);
});
