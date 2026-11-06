/**
 * Sonar estimates (Nov 2026): POST /api/sonar/estimate's pure logic
 * (lib/sonar/estimate.js, estimate-copy.js), its ledger reads
 * (lib/sonar/estimate-server.js) and the ledger writes behind it
 * (quota.js annotatePing, settlementFor, releaseSupersededPing).
 *
 * The usage tests run the estimate's reads and the real reservation
 * (reservePing) against the same in-memory ledger, so the card's numbers
 * are shown to agree with what a run is charged.
 *
 * Run: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-estimate.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ANSWER_FALLBACK,
  ESTIMATE_MIN_SAMPLES,
  answerStage,
  assembleUsage,
  buildEstimate,
  cleanSonarQuery,
  deepState,
  durationLabel,
  estimateFromSamples,
  fallbackEstimate,
  guestIpDailyCap,
  landingRunMode,
  memberDailyPingCap,
  percentile,
} from '../src/lib/sonar/estimate.js';
import { readOrgPool, readRecentDurations, readUsage } from '../src/lib/sonar/estimate-server.js';
import {
  annotatePing,
  releaseSupersededPing,
  reservePing,
  settlementFor,
  startOfUtcDayISO,
} from '../src/lib/sonar/quota.js';
import { DEEP_RUNS_PER_DAY, getSonarEntitlements } from '../src/lib/sonar/entitlements.js';
import {
  classifyResearchMode,
  estimateFromPlan,
  estimateLabel,
} from '../src/lib/sonar/research-mode.js';
import { defaultOrgPool, monthStartUtc } from '../src/lib/org-sonar/budget.js';

/* ── An in-memory ledger behind a Supabase-shaped client ─────────────── */

/* Builders are thenables WITHOUT .catch, like the real query builders, so
   code that chains .catch on one fails here as it would in production. */
function memoryAdmin({ tables = {}, rpc = {}, errors = {} } = {}) {
  const db = { sonar_queries: [], ...tables };
  const calls = [];
  let seq = 0;
  const admin = {
    db,
    calls,
    rpc: async (name, args) => {
      calls.push({ rpc: name, args });
      const h = rpc[name];
      if (typeof h === 'function') return h(args, db);
      return h ?? { data: null, error: { code: 'PGRST202', message: 'missing' } };
    },
    from(table) {
      const st = { table, op: 'select', filters: [], head: false, count: null, limit: null };
      const rows = () => db[table] || (db[table] = []);
      const match = (r) =>
        st.filters.every(([k, op, v]) => {
          const x = r[k];
          if (op === 'eq') return x === v;
          if (op === 'is') return v === null ? x == null : x === v;
          if (op === 'gte') return String(x) >= String(v);
          if (op === 'like') return String(x || '').startsWith(String(v).replace(/%$/, ''));
          if (op === 'notnull') return x != null;
          return true;
        });
      const run = () => {
        calls.push({ table, op: st.op, filters: st.filters.map((f) => f.join(' ')) });
        const err = errors[`${table}.${st.op}`];
        if (err) return { data: null, count: null, error: err };
        if (st.op === 'delete') {
          const keep = rows().filter((r) => !match(r));
          const gone = rows().length - keep.length;
          db[table] = keep;
          return { data: null, error: null, count: gone };
        }
        if (st.op === 'update') {
          rows()
            .filter(match)
            .forEach((r) => Object.assign(r, st.patch));
          return { data: null, error: null };
        }
        if (st.op === 'insert') {
          rows().push({ id: `r${++seq}`, created_at: new Date().toISOString(), ...st.row });
          return { data: null, error: null };
        }
        let out = rows().filter(match);
        if (st.order)
          out = [...out].sort((a, b) => String(b.created_at).localeCompare(a.created_at));
        if (st.limit != null) out = out.slice(0, st.limit);
        if (st.single) return { data: out[0] || null, error: null };
        return { data: st.head ? null : out, count: out.length, error: null };
      };
      const b = {
        select(_cols, opts = {}) {
          st.head = Boolean(opts.head);
          return b;
        },
        eq: (k, v) => (st.filters.push([k, 'eq', v]), b),
        is: (k, v) => (st.filters.push([k, 'is', v]), b),
        gte: (k, v) => (st.filters.push([k, 'gte', v]), b),
        like: (k, v) => (st.filters.push([k, 'like', v]), b),
        not: (k, op, v) => (
          op === 'is' && v === null ? st.filters.push([k, 'notnull', null]) : 0,
          b
        ),
        order: () => ((st.order = true), b),
        limit: (n) => ((st.limit = n), b),
        maybeSingle: () => ((st.single = true), b),
        update: (patch) => ((st.op = 'update'), (st.patch = patch), b),
        delete: () => ((st.op = 'delete'), b),
        insert: (row) => ((st.op = 'insert'), (st.row = row), b),
        then: (resolve, reject) => {
          try {
            resolve(run());
          } catch (e) {
            reject(e);
          }
        },
      };
      return b;
    },
  };
  return admin;
}

const today = () => new Date().toISOString();
const row = (over) => ({
  id: `x${Math.random().toString(36).slice(2, 8)}`,
  created_at: today(),
  status: 'completed',
  user_id: null,
  ip_hash: null,
  org_id: null,
  version: 'member',
  query_text: 'q',
  ...over,
});

/* A JS stand-in for reserve_sonar_ping (20261025150200): count today's rows
   for the user (or ip hash) against the limit, then insert 'reserved'. */
const reserveRpc = (args, db) => {
  const since = startOfUtcDayISO();
  const mine = db.sonar_queries.filter(
    (r) =>
      r.created_at >= since &&
      (args.p_user ? r.user_id === args.p_user : r.ip_hash === args.p_ip_hash),
  ).length;
  const cap = args.p_user ? args.p_limit : args.p_ip_limit;
  if (cap != null && mine >= cap) return { data: [{ id: null, reason: 'quota', used: mine }] };
  const id = `res${db.sonar_queries.length + 1}`;
  db.sonar_queries.push(
    row({
      id,
      status: 'reserved',
      user_id: args.p_user,
      ip_hash: args.p_ip_hash,
      version: args.p_version,
      query_text: args.p_query,
    }),
  );
  return { data: [{ id, used: mine }], error: null };
};

/* ── Labels ──────────────────────────────────────────────────────────── */

test('labels read like "about 10 to 20 seconds" and "about 2 to 3 minutes"', () => {
  assert.equal(durationLabel(10, 20), 'about 10 to 20 seconds');
  assert.equal(durationLabel(3, 8), 'about 3 to 8 seconds');
  assert.equal(durationLabel(12, 28), 'about 10 to 30 seconds', 'rounds outwards to fives');
  assert.equal(durationLabel(120, 180), 'about 2 to 3 minutes');
  assert.equal(durationLabel(5, 5), 'about 5 to 6 seconds', 'never a zero-width range');
  for (const [lo, hi] of [
    [41, 148],
    [95, 200],
    [130, 240],
  ]) {
    assert.equal(durationLabel(lo, hi), estimateLabel(lo, hi), 'minutes match the classifier');
  }
  for (const s of [durationLabel(10, 20), durationLabel(100, 200)]) assert.ok(!s.includes('—'));
});

/* ── Samples ─────────────────────────────────────────────────────────── */

test('p50/p90 replace the plan only at 30 or more samples', () => {
  assert.equal(ESTIMATE_MIN_SAMPLES, 30);
  assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(percentile([], 0.5), null);
  const fb = { minSec: 10, maxSec: 20 };
  const ms = (n) => Array.from({ length: n }, (_, i) => 8000 + i * 500);
  const few = estimateFromSamples(ms(29), fb);
  assert.equal(few.source, 'plan');
  assert.deepEqual([few.minSec, few.maxSec], [10, 20]);
  assert.equal(few.samples, 29);
  const enough = estimateFromSamples(ms(30), fb);
  assert.equal(enough.source, 'observed');
  /* 30 samples 8.0..22.5 s: p50 15.25 s, p90 21.05 s. */
  assert.equal(enough.minSec, 15);
  assert.equal(enough.maxSec, 22);
  assert.equal(enough.label, 'about 15 to 25 seconds');
  /* Junk never counts toward the 30. */
  const junk = estimateFromSamples([...ms(29), null, -1, Number.NaN], fb);
  assert.equal(junk.source, 'plan');
});

test('fallbacks: standard about 10 to 20 s, quick 3 to 8 s, deep from the plan', () => {
  assert.deepEqual(ANSWER_FALLBACK.standard, { minSec: 10, maxSec: 20 });
  assert.deepEqual(fallbackEstimate('standard'), { minSec: 10, maxSec: 20 });
  assert.deepEqual(fallbackEstimate('quick'), { minSec: 3, maxSec: 8 });
  const deepQ = classifyResearchMode('How dependent is Palantir on government spending?');
  assert.equal(deepQ.mode, 'deep');
  assert.deepEqual(fallbackEstimate('deep', deepQ), {
    minSec: deepQ.estimate.minSec,
    maxSec: deepQ.estimate.maxSec,
  });
  const p = estimateFromPlan('deep', { tasks: 10, memo: false });
  assert.deepEqual(fallbackEstimate('deep', null), { minSec: p.minSec, maxSec: p.maxSec });
});

test('what will run: standard unless the classifier says quick', () => {
  assert.equal(landingRunMode(null), 'standard');
  assert.equal(landingRunMode({ mode: 'quick' }), 'quick');
  assert.equal(landingRunMode({ mode: 'standard' }), 'standard');
  assert.equal(landingRunMode({ mode: 'deep' }), 'standard', 'a declined deep runs standard');
  assert.equal(cleanSonarQuery('  a\u0000b \n c '), 'a b c');
});

test('stages advance with the estimate and never claim completion early', () => {
  const est = { minSec: 10, maxSec: 20 };
  assert.equal(answerStage(0, est).label, 'Understanding your question');
  assert.equal(answerStage(4, est).index, 1);
  assert.equal(answerStage(8, est).index, 2);
  assert.equal(answerStage(11, est).index, 3);
  const late = answerStage(600, est);
  assert.equal(late.label, 'Writing the brief');
  assert.equal(late.complete, false, 'held until the answer lands');
  assert.equal(answerStage(600, est, { phase: 'ready' }).complete, true);
  /* Proportional: a slower estimate reaches each stage later. */
  assert.ok(answerStage(8, { minSec: 40, maxSec: 80 }).index < answerStage(8, est).index);
});

/* ── Usage matches the reservation and the entitlements ──────────────── */

const memberAccess = (planTier = 0, orgId = null) => ({
  user: { id: 'u1' },
  entitlements: getSonarEntitlements({ planTier, version: orgId ? 'org' : 'regular' }),
  scope: { userId: 'u1', orgId },
  planTier,
});

test('guest: sign-up line, pings left from the cookie and the per-IP count', async () => {
  const admin = memoryAdmin({
    tables: {
      sonar_queries: [
        row({ ip_hash: 'h1', version: 'guest' }),
        row({ ip_hash: 'h1', version: 'guest' }),
      ],
    },
  });
  const usage = await readUsage(admin, {
    access: { user: null },
    ipHash: 'h1',
    guestCount: 1,
    guestLimit: 5,
  });
  assert.equal(usage.isGuest, true);
  assert.equal(usage.guestNeedsAccount, true);
  assert.equal(usage.deepRunsPerDay, DEEP_RUNS_PER_DAY.guest);
  assert.equal(usage.pingsLeftToday, 4, 'the cookie (1 of 5) is the tighter cap');
  const est = buildEstimate({ classification: null, usage });
  assert.equal(est.deep.blocked, 'signup');
  assert.equal(est.deep.line, 'Create a free account to run deep research.');
  assert.equal(est.deep.usage.resetsAt, 'midnight UTC');
  /* The per-IP-hash cap behind the cookie binds when it is tighter. */
  const tight = assembleUsage({
    isGuest: true,
    guestCount: 0,
    guestLimit: 5,
    guestIpUsed: guestIpDailyCap(5) - 1,
    guestIpCap: guestIpDailyCap(5),
  });
  assert.equal(tight.pingsLeftToday, 1);
});

test('free member: 2 deep runs a day, and the reservation agrees', async () => {
  const access = memberAccess(0);
  assert.equal(access.entitlements.deepRunsPerDay, DEEP_RUNS_PER_DAY[0]);
  const admin = memoryAdmin({
    tables: { sonar_queries: [row({ user_id: 'u1', version: 'member' })] },
    rpc: { reserve_sonar_ping: reserveRpc },
  });
  const usage = await readUsage(admin, { access });
  assert.equal(usage.deepRunsUsedToday, 0);
  assert.equal(usage.deepRunsPerDay, 2);
  assert.equal(usage.pingsLeftToday, memberDailyPingCap() - 1);
  assert.equal(usage.researchPingsLeftToday, access.entitlements.dailyQueries - 1);
  const est = buildEstimate({ classification: null, usage });
  assert.equal(est.deep.available, true);
  assert.equal(
    est.deep.line,
    'Uses 1 ping and 1 of your 2 deep research runs today. Resets at midnight UTC.',
  );
  /* The real reservation (deep function not deployed: counted in JS) runs. */
  const r = await reservePing(admin, {
    userId: 'u1',
    limit: access.entitlements.dailyQueries,
    query: 'q',
    version: 'research:deep:regular',
    deepLimit: access.entitlements.deepRunsPerDay,
  });
  assert.equal(r.ok, true);
});

test('member at the deep cap: disabled with the reset line, and the reservation refuses', async () => {
  const access = memberAccess(0);
  const admin = memoryAdmin({
    tables: {
      sonar_queries: [
        row({ user_id: 'u1', version: 'research:deep:regular' }),
        row({ user_id: 'u1', version: 'research:deep:regular' }),
      ],
    },
    rpc: { reserve_sonar_ping: reserveRpc },
  });
  const usage = await readUsage(admin, { access });
  assert.equal(usage.deepRunsUsedToday, 2);
  const est = buildEstimate({ classification: null, usage });
  assert.equal(est.deep.available, false);
  assert.equal(est.deep.blocked, 'deep_quota');
  assert.equal(
    est.deep.line,
    'You’ve used today’s deep research runs. They reset at midnight UTC.',
  );
  const r = await reservePing(admin, {
    userId: 'u1',
    limit: access.entitlements.dailyQueries,
    query: 'q',
    version: 'research:deep:regular',
    deepLimit: access.entitlements.deepRunsPerDay,
  });
  assert.equal(r.reason, 'deep_quota', 'the card and the charge agree');
});

test('a member whose research pings are used cannot run deep, as the reservation says', async () => {
  const access = memberAccess(0);
  const n = access.entitlements.dailyQueries;
  const admin = memoryAdmin({
    tables: {
      sonar_queries: Array.from({ length: n }, () => row({ user_id: 'u1', version: 'member' })),
    },
    rpc: { reserve_sonar_ping: reserveRpc },
  });
  const est = buildEstimate({ classification: null, usage: await readUsage(admin, { access }) });
  assert.equal(est.deep.blocked, 'quota');
  const r = await reservePing(admin, {
    userId: 'u1',
    limit: n,
    query: 'q',
    version: 'research:deep:regular',
    deepLimit: access.entitlements.deepRunsPerDay,
  });
  assert.equal(r.reason, 'quota');
  /* After a landed answer one more ping is spent: the card recounts. */
  const one = buildEstimate({
    classification: null,
    usage: assembleUsage({
      pingsUsedToday: n - 1,
      dailyQueries: n,
      deepRunsPerDay: 2,
      deepRunsUsedToday: 0,
    }),
  });
  assert.equal(deepState(one).available, true);
  assert.equal(deepState(one, { pingsSpent: 1 }).blocked, 'quota');
});

test('org member on the pooled budget: the pool line, counted as the SQL counts it', async () => {
  const access = memberAccess(2, 'org1');
  const month = monthStartUtc().toISOString();
  const deepRow = (u) => row({ user_id: u, org_id: 'org1', version: 'research:deep:org' });
  const admin = memoryAdmin({
    tables: {
      org_sonar_budget: [{ org_id: 'org1', monthly_deep_runs: 40 }],
      org_sonar_allocations: [],
      sonar_queries: [
        deepRow('u1'),
        deepRow('u2'),
        deepRow('u2'),
        row({ org_id: 'org1', version: 'member' }),
      ],
    },
  });
  const usage = await readUsage(admin, { access });
  assert.deepEqual(
    { used: usage.orgPool.used, total: usage.orgPool.total, period: usage.orgPool.period },
    { used: 3, total: 40, period: 'month' },
  );
  const est = buildEstimate({ classification: null, usage });
  assert.equal(est.deep.line, 'Uses 1 ping and 1 of your fund’s 40 deep research runs this month.');
  /* The same filters reserve_sonar_ping_org_deep counts with. */
  const q = admin.calls.find(
    (c) => c.table === 'sonar_queries' && c.filters.includes('org_id eq org1'),
  );
  assert.ok(q.filters.includes(`created_at gte ${month}`));
  assert.ok(q.filters.includes('version like research:deep:%'));

  /* No budget row: the app default pool, as p_default_pool. */
  const dflt = await readOrgPool(
    memoryAdmin({ tables: { org_sonar_budget: [], org_sonar_allocations: [] } }),
    { orgId: 'org1', userId: 'u1' },
  );
  assert.equal(dflt.total, defaultOrgPool());

  /* Pool used: blocked with the fund line; an allocation used: blocked too. */
  const full = deepState({
    deep: {
      usage: assembleUsage({
        deepRunsPerDay: 15,
        org: { used: 40, total: 40, resetsOn: 'December 1' },
      }),
    },
  });
  assert.equal(full.blocked, 'org_pool');
  assert.match(
    full.line,
    /^Your fund has used this month’s 40 deep research runs\. They reset on December 1\.$/,
  );
  const alloc = deepState({
    deep: {
      usage: assembleUsage({
        deepRunsPerDay: 15,
        org: { used: 3, total: 40, allocation: { used: 5, total: 5 }, resetsOn: 'December 1' },
      }),
    },
  });
  assert.equal(alloc.blocked, 'org_allocation');
  /* Missing org tables: no pool, so the member's own daily cap applies (the
     reservation's fallback too). */
  const missing = await readOrgPool(
    memoryAdmin({ errors: { 'sonar_queries.select': { code: '42703', message: 'org_id' } } }),
    { orgId: 'org1', userId: 'u1' },
  );
  assert.equal(missing, null);
});

test('deep recommendation, reasons and telemetry meta come from the classifier', () => {
  const deepQ = classifyResearchMode('How dependent is Palantir on government spending?');
  const usage = assembleUsage({
    pingsUsedToday: 0,
    dailyQueries: 5,
    deepRunsPerDay: 2,
    deepRunsUsedToday: 0,
  });
  const est = buildEstimate({ classification: deepQ, usage });
  assert.equal(est.mode, 'standard');
  assert.equal(est.deep.recommended, true);
  assert.equal(est.deep.offered, true);
  assert.equal(est.deep.reasons[0], deepQ.reasons[0]);
  assert.equal(est.deep.meta.mode, 'deep');
  const quickQ = classifyResearchMode('Who owns Palantir?');
  const q = buildEstimate({ classification: quickQ, usage });
  assert.equal(q.mode, 'quick');
  assert.equal(q.answer.label, 'about 3 to 8 seconds');
  assert.equal(q.deep.recommended, false);
  assert.deepEqual(q.deep.reasons, []);
  const off = buildEstimate({ classification: deepQ, usage, deepEnabled: false });
  assert.equal(off.deep.blocked, 'disabled');
  assert.equal(off.deep.available, false);
});

test('durations: same mode, last 7 days, cached; an error reads as no samples', async () => {
  const admin = memoryAdmin({
    tables: {
      sonar_queries: [
        row({ mode: 'standard', duration_ms: 12000 }),
        row({ mode: 'deep', duration_ms: 90000 }),
        row({ mode: 'standard', duration_ms: null }),
      ],
    },
  });
  const cache = new Map();
  assert.deepEqual(await readRecentDurations(admin, 'standard', { cache }), [12000]);
  const reads = admin.calls.length;
  await readRecentDurations(admin, 'standard', { cache });
  assert.equal(admin.calls.length, reads, 'cached');
  const broken = memoryAdmin({
    errors: { 'sonar_queries.select': { code: '42703', message: 'x' } },
  });
  assert.deepEqual(await readRecentDurations(broken, 'standard', { cache: new Map() }), []);
});

/* ── Ledger writes: mode and duration, never a double charge ─────────── */

test('annotatePing writes mode and duration_ms; a missing column is skipped quietly', async () => {
  const admin = memoryAdmin({ tables: { sonar_queries: [row({ id: 'a1', status: 'reserved' })] } });
  assert.deepEqual(
    await annotatePing(admin, { ok: true, id: 'a1' }, { mode: 'standard', durationMs: 12345.6 }),
    {
      ok: true,
    },
  );
  assert.equal(admin.db.sonar_queries[0].mode, 'standard');
  assert.equal(admin.db.sonar_queries[0].duration_ms, 12346);
  const warned = [];
  const orig = console.warn;
  console.warn = (...a) => warned.push(a);
  try {
    const old = memoryAdmin({
      errors: {
        'sonar_queries.update': { code: 'PGRST204', message: "Could not find the 'mode' column" },
      },
    });
    assert.deepEqual(
      await annotatePing(old, { ok: true, id: 'a1' }, { mode: 'deep', durationMs: 1 }),
      {
        ok: false,
        skipped: true,
      },
    );
    assert.equal(warned.length, 0, 'a missing column is not even a warning');
    const thrower = {
      from: () => {
        throw new Error('down');
      },
    };
    assert.equal((await annotatePing(thrower, { ok: true, id: 'a1' }, { mode: 'deep' })).ok, false);
  } finally {
    console.warn = orig;
  }
  assert.equal(
    (await annotatePing(admin, { ok: true, id: null }, { mode: 'quick' })).skipped,
    true,
  );
  assert.equal(
    (await annotatePing(admin, { ok: true, id: 'a1' }, { mode: 'bogus' })).skipped,
    true,
  );
});

test('an aborted or unanswered ping is released, an answered one completed', () => {
  assert.equal(settlementFor({ aborted: false, answered: true }), 'complete');
  assert.equal(settlementFor({ aborted: true, answered: true }), 'release');
  assert.equal(settlementFor({ aborted: false, answered: false }), 'release');
});

test('choosing deep while the standard answer runs charges exactly once', async () => {
  const admin = memoryAdmin({ rpc: { reserve_sonar_ping: reserveRpc } });
  const q = 'How exposed is Lockheed Martin to defense budgets?';
  /* 1. The standard ping reserves. */
  const std = await reservePing(admin, { userId: 'u1', limit: 25, query: q, version: 'member' });
  assert.equal(std.ok, true);
  /* 2. The visitor chooses deep: the server finished the ping in the same
        moment (completed), and the deep run supersedes it. */
  admin.db.sonar_queries[0].status = 'completed';
  /* Someone else's row for the same text is never touched. */
  admin.db.sonar_queries.push(row({ user_id: 'u2', query_text: q, version: 'member' }));
  const rel = await releaseSupersededPing(admin, { userId: 'u1', query: q });
  assert.equal(rel.released, true);
  assert.equal(rel.version, 'member');
  const deep = await reservePing(admin, {
    userId: 'u1',
    limit: 5,
    query: q,
    version: 'research:deep:regular',
    deepLimit: 2,
  });
  assert.equal(deep.ok, true);
  const mine = admin.db.sonar_queries.filter((r) => r.user_id === 'u1');
  assert.equal(mine.length, 1, 'one charge');
  assert.equal(mine[0].version, 'research:deep:regular');
  assert.equal(admin.db.sonar_queries.filter((r) => r.user_id === 'u2').length, 1);
  /* A deep run is never released as superseded, and nothing else is. */
  const again = await releaseSupersededPing(admin, { userId: 'u1', query: q });
  assert.equal(again.released, false);
  assert.equal(admin.db.sonar_queries.filter((r) => r.user_id === 'u1').length, 1);
});

test('a guest supersede is scoped to the salted IP hash and guest rows', async () => {
  const q = 'Brazil economy outlook';
  const admin = memoryAdmin({
    tables: {
      sonar_queries: [
        row({ ip_hash: 'h1', user_id: null, version: 'guest', query_text: q, status: 'reserved' }),
        row({ ip_hash: 'h2', user_id: null, version: 'guest', query_text: q }),
      ],
    },
  });
  const r = await releaseSupersededPing(admin, { ipHash: 'h1', query: q });
  assert.equal(r.released, true);
  assert.deepEqual(
    admin.db.sonar_queries.map((x) => x.ip_hash),
    ['h2'],
  );
  assert.equal(
    (await releaseSupersededPing(admin, { query: q })).released,
    false,
    'no identity, no release',
  );
  /* An old row (outside the window) is not superseded. */
  const old = memoryAdmin({
    tables: {
      sonar_queries: [
        row({
          user_id: 'u1',
          query_text: q,
          created_at: new Date(Date.now() - 3_600_000).toISOString(),
        }),
      ],
    },
  });
  assert.equal((await releaseSupersededPing(old, { userId: 'u1', query: q })).released, false);
});

/* ── The routes wire it up ───────────────────────────────────────────── */

test('the routes record mode and duration, release on abort, and supersede before reserving', () => {
  const landing = readFileSync('src/app/api/sonar/landing-query/route.js', 'utf8');
  assert.match(landing, /annotatePing\(admin, reservation, \{ mode: ledgerMode, durationMs \}\)/);
  assert.match(landing, /settlementFor\(\{ aborted, answered: Boolean\(result\.answer\) \}\)/);
  assert.match(landing, /Promise\.race\(\[pipelineP, abortedP\]\)/);
  assert.doesNotMatch(landing, /six seconds|six-second/);
  const research = readFileSync('src/app/api/sonar/research/route.js', 'utf8');
  assert.ok(
    research.indexOf('releaseSupersededPing(admin') < research.indexOf('const reservation = await'),
    'released before the deep run is reserved',
  );
  assert.match(research, /mode: deepMode \? 'deep' : 'standard'/);
  const estimate = readFileSync('src/app/api/sonar/estimate/route.js', 'utf8');
  assert.match(estimate, /withApiGuard\(/);
  assert.doesNotMatch(estimate, /reservePing|completePing|anthropic/i, 'no reservation, no model');
  for (const f of [
    'src/lib/sonar/estimate.js',
    'src/lib/sonar/estimate-copy.js',
    'src/lib/sonar/estimate-server.js',
    'src/app/api/sonar/estimate/route.js',
    'src/components/sonar/DeepResearchCard.jsx',
    'src/components/sonar/SonarAnswerProgress.jsx',
    'src/components/sonar/sonar-answer-progress.css',
  ]) {
    assert.ok(!readFileSync(f, 'utf8').includes('—'), `${f}: em dash`);
  }
});
