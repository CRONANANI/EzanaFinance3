/**
 * Staff and admin accounts are never refused by a daily cap; a refused ping says why
 * (Nov 28 2026). No network, no model: the reservation RPC is an in-memory stand-in.
 * Run: npm run test:sonar-quota-exempt
 */
import './lib/no-llm-guard.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const Q = await import('../src/lib/sonar/quota.js');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* The reservation RPC as the database defines it: a null limit means no limit. */
function ledger({ usedToday = 30, globalToday = 500 } = {}) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (args.p_global_limit != null && globalToday >= args.p_global_limit)
        return { data: [{ id: null, reason: 'global', used: 0 }], error: null };
      if (args.p_limit != null && usedToday >= args.p_limit)
        return { data: [{ id: null, reason: 'quota', used: usedToday }], error: null };
      if (
        name === 'reserve_sonar_ping_deep' &&
        args.p_deep_limit != null &&
        usedToday >= args.p_deep_limit
      )
        return { data: [{ id: null, reason: 'deep_quota', used: usedToday }], error: null };
      return { data: [{ id: 'row-1', reason: null, used: usedToday }], error: null };
    },
  };
}

test('isQuotaExempt: admins (ADMIN_EMAILS) and SONAR_STAFF_EMAILS, case-insensitive', () => {
  const prev = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = 'founder@ezana.world';
  try {
    assert.equal(Q.isQuotaExempt({ email: 'Founder@Ezana.world' }), true);
    assert.equal(Q.isQuotaExempt({ email: 'reader@example.com' }), false);
    assert.equal(
      Q.isQuotaExempt(
        { email: 'qa@ezana.world' },
        { SONAR_STAFF_EMAILS: ' qa@ezana.world , x@y.z' },
      ),
      true,
    );
    assert.equal(Q.isQuotaExempt(null), false);
    assert.equal(Q.isQuotaExempt({ id: 'no-email' }), false);
  } finally {
    if (prev === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prev;
  }
});

test('reservePing: an exempt account past every cap is still reserved (and ledgered)', async () => {
  const db = ledger({ usedToday: 30, globalToday: 10_000 });
  const refused = await Q.reservePing(db, {
    userId: 'u',
    limit: 25,
    globalLimit: 5000,
    query: 'q',
    version: 'member',
  });
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'global');
  const r = await Q.reservePing(db, {
    userId: 'u',
    limit: 25,
    globalLimit: 5000,
    deepLimit: 3,
    query: 'q',
    version: 'research:deep:v',
    exempt: true,
  });
  assert.equal(r.ok, true);
  assert.equal(r.id, 'row-1', 'a ledger row is still written');
  const args = db.calls.at(-1).args;
  assert.equal(args.p_limit, null);
  assert.equal(args.p_global_limit, null);
  assert.equal(args.p_ip_limit, null);
  assert.equal(db.calls.at(-1).name, 'reserve_sonar_ping', 'no deep cap for exempt accounts');
});

test('reservePing: a regular member is unchanged (25 a day, quota reason)', async () => {
  const db = ledger({ usedToday: 25, globalToday: 0 });
  const r = await Q.reservePing(db, { userId: 'u', limit: 25, query: 'q', version: 'member' });
  assert.deepEqual([r.ok, r.reason, r.used], [false, 'quota', 25]);
});

test('every Sonar route passes the exemption to the reservation', () => {
  for (const p of [
    'src/app/api/sonar/landing-query/route.js',
    'src/app/api/sonar/research/route.js',
    'src/app/api/sonar/v2/route.js',
    'src/app/api/sonar/query/route.js',
  ]) {
    const src = read(p);
    assert.match(src, /isQuotaExempt\(/, p);
    assert.match(src, /exempt: (isQuotaExempt\(|quotaExempt)/, p);
  }
  /* An exempt deep run never draws on an organization's pool. */
  assert.match(read('src/app/api/sonar/research/route.js'), /&& !quotaExempt;/);
  /* The UI never reads an unlimited quota as "out of pings" (null <= 0 is true). */
  assert.match(read('src/components/sonar/SonarHero.jsx'), /typeof quota\.remaining === 'number'/);
  assert.match(read('src/app/api/sonar/entitlements/route.js'), /exempt: true/);
});

test('a refused ping says why on the loading screen; every exit is logged', () => {
  const route = read('src/app/api/sonar/landing-query/route.js');
  assert.match(route, /reason: reservation\.reason \|\| 'error'/);
  assert.match(route, /You have used today\\u2019s \$\{member \? memberCap : 'free'\} pings/);
  assert.match(route, /logPingExit\(res\.status, payload, \{ startedAt, streamed: true \}\)/);
  assert.match(route, /logPingExit\(res\.status, await res\.clone\(\)\.json\(\)/);
  const band = read('src/components/landing/SonarSection.jsx');
  assert.match(band, /settle\.message =\s*\n?\s*data\?\.error/);
  assert.match(band, /setPingError\(data\?\.error \|\| 'Too many pings too fast/);
  const page = read('src/components/sonar/SonarExperience.jsx');
  assert.match(page, /errorDetail=\{loader\.detail\}/);
  assert.match(page, /loader\.reason === 'quota' \|\| loader\.reason === 'global'/);
  assert.match(
    read('src/components/sonar/SonarPingLoader.jsx'),
    /phase === 'error' && errorDetail/,
  );
});
