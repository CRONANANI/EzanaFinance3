#!/usr/bin/env node
/* Reliability audit P2: client IP, route-pattern buckets, bounded maps,
   cache single-flight, cron auth/lock wrapper, batched delivery claims.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-reliability-p2.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getClientIp } from '../src/lib/client-ip.js';
import { routePattern } from '../src/lib/route-pattern.js';
import { BoundedMap } from '../src/lib/bounded-map.js';
import { cacheGetOrSet } from '../src/lib/cache.js';
import { safeEqual, isCronAuthorized } from '../src/lib/cron/auth.js';
import { cronRunOutcome } from '../src/lib/cron/outcome.js';
import { windowToMs } from '../src/lib/rate-limit.js';
import { claimDeliveries, mapLimit } from '../src/lib/notifications/delivery-claim.js';
import { createMockSupabase } from './lib/mock-supabase.mjs';

const req = (h) => ({ headers: new Headers(h) });

test('getClientIp prefers Vercel, then x-real-ip, then the LAST forwarded hop', () => {
  assert.equal(
    getClientIp(req({ 'x-vercel-forwarded-for': '1.1.1.1', 'x-forwarded-for': '9.9.9.9' })),
    '1.1.1.1',
  );
  assert.equal(
    getClientIp(req({ 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '9.9.9.9' })),
    '2.2.2.2',
  );
  assert.equal(getClientIp(req({ 'x-forwarded-for': 'spoofed, 3.3.3.3' })), '3.3.3.3');
  assert.equal(getClientIp(req({})), null);
});

test('rate-limit buckets use the route pattern, not the concrete path', () => {
  assert.equal(routePattern('/api/x/123/y', { id: '123' }), '/api/x/[id]/y');
  assert.equal(
    routePattern('/api/finnhub/quote/AAPL', { endpoint: ['quote', 'AAPL'] }),
    '/api/finnhub/[...endpoint]',
  );
  assert.equal(routePattern('/api/plain', undefined), '/api/plain');
  assert.equal(windowToMs('15 m'), 900_000);
  assert.equal(windowToMs('60 s'), 60_000);
});

test('BoundedMap evicts the least recently used entry', () => {
  const m = new BoundedMap(2);
  m.set('a', 1).set('b', 2);
  m.get('a');
  m.set('c', 3);
  assert.deepEqual([...m.keys()].sort(), ['a', 'c']);
  for (let i = 0; i < 1000; i += 1) m.set(`k${i}`, i);
  assert.equal(m.size, 2);
});

test('cacheGetOrSet: 10 concurrent misses run the producer once', async () => {
  let calls = 0;
  const producer = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 20));
    return { v: 1 };
  };
  const key = `sf-${Date.now()}`;
  const out = await Promise.all(Array.from({ length: 10 }, () => cacheGetOrSet(key, 60, producer)));
  assert.equal(calls, 1);
  assert.ok(out.every((o) => o.v === 1));
});

test('cron auth: Bearer only, constant-time compare, no ?key=', () => {
  const r = (h, url = 'https://x/api/cron/a') => ({ headers: new Headers(h), url });
  assert.equal(isCronAuthorized(r({ authorization: 'Bearer s3cret' }), 's3cret'), true);
  assert.equal(isCronAuthorized(r({}, 'https://x/api/cron/a?key=s3cret'), 's3cret'), false);
  assert.equal(isCronAuthorized(r({ authorization: 'Bearer nope' }), 's3cret'), false);
  assert.equal(isCronAuthorized(r({ authorization: 'Bearer s3cret' }), ''), false);
  assert.equal(safeEqual('a', 'ab'), false);
});

test('cron run outcome: a 2xx body without ok is ok; errors make it partial or failed', () => {
  assert.equal(cronRunOutcome({ processed: 3 }, 200).status, 'ok');
  assert.equal(cronRunOutcome({ skipped: 'locked' }, 200).status, 'skipped');
  assert.equal(cronRunOutcome({ ok: false, error: 'x' }, 200).status, 'failed');
  assert.equal(cronRunOutcome({ ok: true, errors: ['e'] }, 200).status, 'partial');
  assert.equal(cronRunOutcome(null, 500).status, 'failed');
});

test('delivery claims: two parallel runs claim each (user, event) once', async () => {
  const db = createMockSupabase({
    unique: { notification_delivery_log: [['user_id', 'event_fingerprint']] },
  });
  const orig = db.from;
  /* The mock upsert raises 23505 on a duplicate; emulate ignoreDuplicates
     by inserting row by row. */
  db.from = (t) => {
    const b = orig(t);
    b.upsert = (rows) => {
      const done = (async () => {
        const out = [];
        for (const r of rows) {
          // eslint-disable-next-line no-await-in-loop
          const { data } = await orig(t).insert(r).select().single();
          if (data) out.push(data);
        }
        return { data: out, error: null };
      })();
      return { select: () => done };
    };
    return b;
  };
  const pairs = ['u1', 'u2', 'u3'].map((u) => ({ user_id: u, event_fingerprint: 'e1' }));
  const [a, b] = await Promise.all([claimDeliveries(db, pairs), claimDeliveries(db, pairs)]);
  assert.equal(a.size + b.size, 3);
  const seen = [];
  await mapLimit([1, 2, 3, 4, 5, 6], 2, async (x) => seen.push(x));
  assert.equal(seen.length, 6);
});
