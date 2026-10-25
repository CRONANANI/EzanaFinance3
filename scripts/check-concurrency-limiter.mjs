#!/usr/bin/env node
/* QA PLAT-2: the dataset-hub concurrency limiter and the snapshot-first read.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-concurrency-limiter.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter, LimiterTimeoutError } from '@/lib/concurrency';
import { preferSnapshot, isFresh, SNAPSHOT_MAX_AGE_MS } from '@/lib/datasets/prefer-snapshot';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('never runs more than the cap at once, and runs every task', async () => {
  const limit = createLimiter(4);
  let running = 0;
  let peak = 0;
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      limit(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await sleep(5 + (i % 3) * 3);
        running -= 1;
        return i;
      }),
    ),
  );
  assert.equal(peak, 4);
  assert.deepEqual(
    results,
    Array.from({ length: 20 }, (_, i) => i),
  );
  assert.equal(limit.activeCount(), 0);
  assert.equal(limit.pendingCount(), 0);
});

test('starts queued tasks in FIFO order', async () => {
  const limit = createLimiter(1);
  const order = [];
  await Promise.all([1, 2, 3, 4].map((n) => limit(async () => order.push(n))));
  assert.deepEqual(order, [1, 2, 3, 4]);
});

test('a rejected task frees its slot and does not affect the others', async () => {
  const limit = createLimiter(2);
  const out = await Promise.allSettled([
    limit(async () => {
      throw new Error('boom');
    }),
    limit(() => 'sync value'),
    limit(async () => 3),
  ]);
  assert.equal(out[0].status, 'rejected');
  assert.equal(out[1].value, 'sync value');
  assert.equal(out[2].value, 3);
  assert.equal(limit.activeCount(), 0);
});

test('timeout: a queued task is dropped and never runs; a slow one rejects', async () => {
  const limit = createLimiter(1);
  let ranQueued = false;
  const slow = limit(() => sleep(60).then(() => 'late'), { timeoutMs: 20 });
  const queued = limit(
    async () => {
      ranQueued = true;
    },
    { timeoutMs: 10 },
  );
  await assert.rejects(queued, (e) => e instanceof LimiterTimeoutError && e.timedOut === true);
  await assert.rejects(slow, LimiterTimeoutError);
  await sleep(70);
  assert.equal(ranQueued, false);
  assert.equal(limit.activeCount(), 0);
  assert.equal(await limit(() => 'next'), 'next');
});

test('a cap below 1 is treated as 1', async () => {
  const limit = createLimiter(0);
  assert.equal(await limit(() => 7), 7);
});

const NOW = Date.parse('2026-10-25T12:00:00Z');
const hoursAgo = (h) => new Date(NOW - h * 3600e3).toISOString();

test('isFresh: under 24 h only', () => {
  assert.equal(isFresh(hoursAgo(1), SNAPSHOT_MAX_AGE_MS, NOW), true);
  assert.equal(isFresh(hoursAgo(25), SNAPSHOT_MAX_AGE_MS, NOW), false);
  assert.equal(isFresh(null, SNAPSHOT_MAX_AGE_MS, NOW), false);
  assert.equal(isFresh('garbage', SNAPSHOT_MAX_AGE_MS, NOW), false);
});

test('preferSnapshot: a fresh snapshot is served without a live read', async () => {
  let live = 0;
  const v = await preferSnapshot({
    readSnapshot: async () => ({ payload: { rows: [1] }, builtAt: hoursAgo(2) }),
    live: async () => {
      live += 1;
      return { rows: [2] };
    },
    now: () => NOW,
  });
  assert.deepEqual(v, { rows: [1] });
  assert.equal(live, 0);
});

test('preferSnapshot: missing table (read throws) falls back to live', async () => {
  const v = await preferSnapshot({
    readSnapshot: async () => {
      throw new Error('relation "dataset_snapshots" does not exist');
    },
    live: async () => ({ rows: ['live'] }),
    now: () => NOW,
  });
  assert.deepEqual(v, { rows: ['live'] });
});

test('preferSnapshot: stale snapshot goes live, and is the fallback if live fails', async () => {
  const stale = { payload: { rows: ['old'] }, builtAt: hoursAgo(30) };
  assert.deepEqual(
    await preferSnapshot({
      readSnapshot: async () => stale,
      live: async () => ({ rows: ['new'] }),
      now: () => NOW,
    }),
    { rows: ['new'] },
  );
  assert.deepEqual(
    await preferSnapshot({
      readSnapshot: async () => stale,
      live: async () => {
        throw new LimiterTimeoutError(25000);
      },
      now: () => NOW,
    }),
    { rows: ['old'] },
  );
});

test('preferSnapshot: no snapshot and a live timeout rejects (the card shows unavailable)', async () => {
  await assert.rejects(
    preferSnapshot({
      readSnapshot: async () => null,
      live: async () => {
        throw new LimiterTimeoutError(25000);
      },
      now: () => NOW,
    }),
    LimiterTimeoutError,
  );
});
