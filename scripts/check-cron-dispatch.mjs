/* Tests for the ingestion dispatcher (src/lib/cron/dispatch.js). */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cronMatches,
  dueJobs,
  dispatchDue,
  validateRegistry,
  summarize,
} from '../src/lib/cron/dispatch.js';
import { DISPATCH_JOBS } from '../src/lib/cron/dispatch-registry.js';

let n = 0;
const t = (name, fn) =>
  Promise.resolve(fn()).then(() => {
    n += 1;
    console.log('ok', name);
  });

await t('cron matching', () => {
  const d = new Date('2026-11-28T14:00:00Z'); // Saturday
  assert.equal(cronMatches('0 * * * *', d), true);
  assert.equal(cronMatches('5 * * * *', d), false);
  assert.equal(cronMatches('*/15 14 * * *', d), true);
  assert.equal(cronMatches('0 9-17 * * 1-5', d), false);
  assert.equal(cronMatches('0 14 * * 6', d), true);
  assert.equal(cronMatches('0 14 * * 7', new Date('2026-11-29T14:00:00Z')), true);
  assert.equal(cronMatches('0 14 1 * 6', d), true); // dom OR dow when both restricted
  assert.throws(() => cronMatches('0 * *', d));
  assert.throws(() => cronMatches('61 * * * *', d));
});

await t('registry is valid and preserves bench frequency', () => {
  assert.deepEqual(validateRegistry(DISPATCH_JOBS), []);
  const due = dueJobs(DISPATCH_JOBS, new Date('2026-11-28T14:07:00Z'));
  assert.equal(due.filter((j) => j.id.startsWith('sonar-model-bench')).length, 6);
  assert.ok(!due.some((j) => j.id === 'sync-company-industry'));
  assert.ok(
    dueJobs(DISPATCH_JOBS, new Date('2026-11-28T15:00:00Z')).some(
      (j) => j.id === 'sync-company-industry',
    ),
  );
});

await t('vercel.json stays under the limit and no job is scheduled twice', () => {
  const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));
  assert.ok(v.crons.length <= 100, `${v.crons.length} crons`);
  const paths = new Set(v.crons.map((c) => c.path));
  for (const j of DISPATCH_JOBS) assert.ok(!paths.has(j.path), `${j.path} also in vercel.json`);
  assert.ok(paths.has('/api/cron/dispatch'));
});

await t('fan-out: retries fast failures, started on ack timeout, group limits', async () => {
  const calls = [];
  let inSec = 0;
  let maxSec = 0;
  const fetchImpl = async (url, { signal, headers }) => {
    calls.push(url);
    assert.equal(headers.authorization, 'Bearer s3cret');
    if (url.includes('flaky') && calls.filter((u) => u.includes('flaky')).length === 1)
      return { status: 503, json: async () => ({}) };
    if (url.includes('slow')) {
      return new Promise((_, rej) =>
        signal.addEventListener('abort', () =>
          rej(Object.assign(new Error('x'), { name: 'AbortError' })),
        ),
      );
    }
    if (url.includes('sec')) {
      inSec += 1;
      maxSec = Math.max(maxSec, inSec);
      await new Promise((r) => setTimeout(r, 20));
      inSec -= 1;
    }
    if (url.includes('locked'))
      return { status: 200, json: async () => ({ ok: true, skipped: 'locked' }) };
    if (url.includes('bad')) return { status: 500, json: async () => ({ error: 'boom' }) };
    return { status: 200, json: async () => ({ ok: true }) };
  };
  const jobs = [
    { id: 'flaky', path: '/api/cron/flaky', retries: 1 },
    { id: 'slow', path: '/api/cron/slow' },
    { id: 'sec-a', path: '/api/cron/sec-a', group: 'sec', groupLimit: 1 },
    { id: 'sec-b', path: '/api/cron/sec-b', group: 'sec', groupLimit: 1 },
    { id: 'locked', path: '/api/cron/locked' },
    { id: 'bad', path: '/api/cron/bad', retries: 1 },
  ];
  const r = await dispatchDue(jobs, {
    origin: 'https://x',
    secret: 's3cret',
    fetchImpl,
    ackMs: 50,
    backoffMs: 1,
  });
  const by = Object.fromEntries(r.map((x) => [x.id, x]));
  assert.equal(by.flaky.state, 'completed');
  assert.equal(by.flaky.attempts, 2);
  assert.equal(by.slow.state, 'started');
  assert.equal(by.locked.state, 'skipped');
  assert.equal(by.bad.state, 'failed');
  assert.equal(by.bad.attempts, 2);
  assert.equal(maxSec, 1);
  assert.deepEqual(
    r.map((x) => x.id),
    jobs.map((j) => j.id),
  );
  const s = summarize(r);
  assert.equal(s.errors.length, 1);
});

console.log(`\n${n} dispatcher tests passed`);
