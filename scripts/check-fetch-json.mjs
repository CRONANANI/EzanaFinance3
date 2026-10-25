#!/usr/bin/env node
/* Reliability audit P1-11: src/lib/http/fetch-json.js with a mocked fetch.
   Usage: node --test scripts/check-fetch-json.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchJson,
  fetchWithTimeout,
  backoffMs,
  breakerState,
  resetBreakers,
  BREAKER_THRESHOLD,
} from '../src/lib/http/fetch-json.js';

const realFetch = globalThis.fetch;
const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return handler(calls.length, init);
  };
  return calls;
}

test.afterEach(() => {
  globalThis.fetch = realFetch;
  resetBreakers();
});

test('a hung provider times out', async () => {
  mockFetch(
    (_n, init) =>
      new Promise((_res, rej) => {
        init.signal.addEventListener('abort', () => rej(init.signal.reason));
      }),
  );
  /* AbortSignal.timeout's timer does not hold the event loop open. */
  const keepAlive = setTimeout(() => {}, 5000);
  const t0 = Date.now();
  try {
    await assert.rejects(fetchJson('https://slow.test/x', { timeoutMs: 50, retries: 0 }), (e) =>
      ['TimeoutError', 'AbortError'].includes(e.name),
    );
  } finally {
    clearTimeout(keepAlive);
  }
  assert.ok(Date.now() - t0 < 1000);
});

test('429 with Retry-After is retried after the stated wait, then succeeds', async () => {
  const calls = mockFetch((n) =>
    n === 1 ? json(429, {}, { 'retry-after': '0.05' }) : json(200, { ok: 1 }),
  );
  const t0 = Date.now();
  const out = await fetchJson('https://rl.test/x');
  assert.deepEqual(out, { ok: 1 });
  assert.equal(calls.length, 2);
  assert.ok(Date.now() - t0 >= 45);
});

test('POST is never retried', async () => {
  const calls = mockFetch(() => json(503, {}));
  await assert.rejects(fetchJson('https://p.test/x', { method: 'POST', body: '{}' }), /503/);
  assert.equal(calls.length, 1);
});

test('a POST with an idempotency key may opt in to retries', async () => {
  const calls = mockFetch((n) => (n < 2 ? json(502, {}) : json(200, { done: true })));
  const out = await fetchJson('https://p.test/x', { method: 'POST', idempotent: true, retries: 2 });
  assert.deepEqual(out, { done: true });
  assert.equal(calls.length, 2);
});

test('4xx other than 429 fails at once with the status', async () => {
  const calls = mockFetch(() => json(404, { error: 'nope' }));
  await assert.rejects(fetchJson('https://p.test/x'), (e) => e.status === 404);
  assert.equal(calls.length, 1);
});

test('the breaker opens after repeated transient failures and fails fast', async () => {
  const calls = mockFetch(() => json(500, {}));
  for (let i = 0; i < BREAKER_THRESHOLD; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await assert.rejects(fetchJson('https://dead.test/x', { retries: 0 }));
  }
  const before = calls.length;
  await assert.rejects(
    fetchJson('https://dead.test/y', { retries: 0 }),
    (e) => e.code === 'CIRCUIT_OPEN',
  );
  assert.equal(calls.length, before, 'no request while open');
  assert.ok(breakerState('dead.test').openUntil > Date.now());
  /* Other providers are unaffected. */
  mockFetch(() => json(200, { fine: true }));
  assert.deepEqual(await fetchJson('https://alive.test/x'), { fine: true });
});

test('backoff is jittered within [0, base * 2^attempt]', () => {
  assert.equal(
    backoffMs(3, 400, () => 0),
    0,
  );
  assert.equal(
    backoffMs(3, 400, () => 1),
    3200,
  );
  const seen = new Set(Array.from({ length: 20 }, () => backoffMs(2)));
  assert.ok(seen.size > 1, 'randomised');
});

test('fetchWithTimeout keeps the caller signal and adds a timeout', async () => {
  let got;
  mockFetch((_n, init) => {
    got = init.signal;
    return json(200, {});
  });
  const ac = new AbortController();
  await fetchWithTimeout('https://x.test', { signal: ac.signal }, 1000);
  assert.ok(got instanceof AbortSignal);
  ac.abort();
  assert.equal(got.aborted, true);
});
