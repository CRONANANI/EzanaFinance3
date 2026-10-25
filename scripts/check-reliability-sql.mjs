#!/usr/bin/env node
/* Reliability audit: the SQL functions under real concurrency. Starts a
   throwaway local Postgres, loads a stub of the touched tables, applies the
   reliability and security migrations (20261025150000 on) and fires parallel calls from separate
   connections. Skips when no Postgres binaries are installed (CI).
   Usage: node --test scripts/check-reliability-sql.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { startPg } from './lib/pg-harness.mjs';

const MIG_DIR = new URL('../supabase/migrations/', import.meta.url).pathname;
const MIGRATIONS = readdirSync(MIG_DIR)
  .filter(
    (f) =>
      f >= '20261025150000' &&
      f.endsWith('.sql') &&
      !f.includes('concurrent') &&
      !f.includes('live_only') /* a catalog copy of live tables; needs the whole live schema */,
  )
  .sort()
  .map((f) => path.join(MIG_DIR, f));

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';

let pg = null;
test.before(async () => {
  pg = await startPg({ migrations: MIGRATIONS });
  if (pg) {
    pg.sql(`insert into auth.users (id) values ('${U1}'), ('${U2}');
            insert into profiles (id) values ('${U1}'), ('${U2}');`);
  }
});
test.after(() => pg?.stop());

const n = (k) => Array.from({ length: 10 }, (_, i) => k(i));
const skip = (t) => {
  if (!pg) t.skip('no local Postgres');
  return !pg;
};

test('migrations apply twice (idempotent)', (t) => {
  if (skip(t)) return;
  for (const m of MIGRATIONS) pg.file(m);
});

test('award_xp: 10 parallel calls with one key award once', async (t) => {
  if (skip(t)) return;
  const r = await pg.parallel(
    n(
      () =>
        `select awarded from award_xp('${U1}', 50, 'Checklist task: a', 'engagement', 'checklist:a')`,
    ),
  );
  assert.ok(
    r.every((x) => x.code === 0),
    r.map((x) => x.err).join('\n'),
  );
  assert.equal(r.filter((x) => x.out === 't').length, 1);
  assert.equal(pg.sql(`select total_xp from user_rewards where user_id='${U1}'`), '50');
  assert.equal(pg.sql(`select count(*) from xp_transactions where user_id='${U1}'`), '1');
});

test('award_xp: 10 parallel distinct awards lose no update; tier perks grow by the tier difference', async (t) => {
  if (skip(t)) return;
  const r = await pg.parallel(
    n((i) => `select awarded from award_xp('${U2}', 60, 'post', 'community', 'post:${i}')`),
  );
  assert.ok(
    r.every((x) => x.code === 0 && x.out === 't'),
    r.map((x) => x.err).join('\n'),
  );
  assert.equal(
    pg.sql(`select total_xp || ',' || tier from user_rewards where user_id='${U2}'`),
    '600,silver',
  );
  /* Spend some credit, then cross into gold: the balance grows by 15-5. */
  pg.sql(`update user_rewards set trading_credit_balance = 2 where user_id='${U2}'`);
  pg.sql(`select award_xp('${U2}', 1500, 'big', 'community', 'big:1')`);
  assert.equal(
    pg.sql(
      `select tier || ',' || trading_credit_balance::int || ',' || sweepstakes_entries from user_rewards where user_id='${U2}'`,
    ),
    'gold,12,3',
  );
});

test('award_elo: one award per key; distinct keys sum; clamped to [0, 10000]', async (t) => {
  if (skip(t)) return;
  const same = await pg.parallel(
    n(
      () =>
        `select awarded from award_elo('${U1}', 500, 'Competition', 'competition', 'competition:c1')`,
    ),
  );
  assert.ok(
    same.every((x) => x.code === 0),
    same.map((x) => x.err).join('\n'),
  );
  assert.equal(same.filter((x) => x.out === 't').length, 1);
  assert.equal(pg.sql(`select current_rating from user_elo where user_id='${U1}'`), '500');
  const many = await pg.parallel(
    n((i) => `select awarded from award_elo('${U1}', 2000, 'x', 'admin', 'admin:${i}')`),
  );
  assert.ok(
    many.every((x) => x.code === 0),
    many.map((x) => x.err).join('\n'),
  );
  assert.equal(
    pg.sql(`select current_rating || ',' || tier from user_elo where user_id='${U1}'`),
    '10000,grandmaster',
  );
  pg.sql(`select award_elo('${U1}', -20000, 'x', 'admin', null)`);
  assert.equal(pg.sql(`select current_rating from user_elo where user_id='${U1}'`), '0');
  assert.equal(
    pg.sql(
      `select sum(delta) = (select current_rating from user_elo where user_id='${U1}') from elo_transactions where user_id='${U1}'`,
    ),
    't',
  );
});

test('award_elo skips a disabled profile', (t) => {
  if (skip(t)) return;
  pg.sql(`update profiles set is_disabled = true where id='${U2}'`);
  assert.equal(pg.sql(`select awarded from award_elo('${U2}', 10, 'x', 'admin', null)`), 'f');
  pg.sql(`update profiles set is_disabled = false where id='${U2}'`);
});

test('claim_competition_scoring: exactly one of 10 claims wins', async (t) => {
  if (skip(t)) return;
  const id = pg.sql(
    `insert into competitions (name, starts_at, ends_at, status) values ('c', now() - interval '2 days', now() - interval '1 hour', 'ended') returning id`,
  );
  const r = await pg.parallel(n(() => `select count(*) from claim_competition_scoring('${id}')`));
  assert.ok(
    r.every((x) => x.code === 0),
    r.map((x) => x.err).join('\n'),
  );
  assert.equal(r.filter((x) => x.out === '1').length, 1);
  assert.equal(pg.sql(`select status from competitions where id='${id}'`), 'scoring');
});

test('reserve_sonar_ping: 10 parallel pings against a limit of 3 reserve exactly 3', async (t) => {
  if (skip(t)) return;
  const r = await pg.parallel(
    n(
      () =>
        `select coalesce(id::text, reason) from reserve_sonar_ping('${U1}', 3, 500, null, null, 'q', 'regular', 1, false)`,
    ),
  );
  assert.ok(
    r.every((x) => x.code === 0),
    r.map((x) => x.err).join('\n'),
  );
  assert.equal(r.filter((x) => x.out !== 'quota').length, 3);
  assert.equal(
    pg.sql(`select count(*) from sonar_queries where user_id='${U1}' and status='reserved'`),
    '3',
  );
});

test('reserve_sonar_ping: the global cap holds under parallel guests', async (t) => {
  if (skip(t)) return;
  const before = Number(pg.sql('select count(*) from sonar_queries'));
  const r = await pg.parallel(
    n(
      (i) =>
        `select coalesce(id::text, reason) from reserve_sonar_ping(null, null, ${before + 4}, 'ip${i}', 5, 'q', 'guest', 0, true)`,
    ),
  );
  assert.equal(r.filter((x) => x.out === 'global').length, 6);
});

test('claim_brokerage_account: one claimer among 10', async (t) => {
  if (skip(t)) return;
  const r = await pg.parallel(
    n(() => `select coalesce(claim_brokerage_account('${U2}')::text, 'none')`),
  );
  assert.ok(
    r.every((x) => x.code === 0),
    r.map((x) => x.err).join('\n'),
  );
  assert.equal(r.filter((x) => x.out !== 'none').length, 1);
});

test('trade_history: client_order_id is unique', (t) => {
  if (skip(t)) return;
  pg.sql(
    `insert into trade_history (user_id, symbol, side, client_order_id) values ('${U1}', 'A', 'buy', 'ez-1')`,
  );
  assert.throws(() =>
    pg.sql(
      `insert into trade_history (user_id, symbol, side, client_order_id) values ('${U1}', 'A', 'buy', 'ez-1')`,
    ),
  );
});

test('try_cron_lock: one holder among 10; release frees it; expiry frees it', async (t) => {
  if (skip(t)) return;
  const r = await pg.parallel(n((i) => `select try_cron_lock('job', 60, 'h${i}')`));
  assert.equal(r.filter((x) => x.out === 't').length, 1);
  pg.sql(`select release_cron_lock('job', null)`);
  assert.equal(pg.sql(`select try_cron_lock('job', 1, 'h')`), 't');
  pg.sql(`update cron_locks set locked_until = now() - interval '1 second' where name='job'`);
  assert.equal(pg.sql(`select try_cron_lock('job', 60, 'h2')`), 't');
});

test('backfill keys only the earliest of existing duplicates, so the unique index builds', (t) => {
  if (skip(t)) return;
  pg.sql(`insert into xp_transactions (user_id, amount, reason, category, created_at) values
    ('${U2}', 50, 'Checklist task: dup', 'engagement', now() - interval '2 days'),
    ('${U2}', 50, 'Checklist task: dup', 'engagement', now() - interval '1 day');
    insert into elo_transactions (user_id, delta, reason, category, metadata, rating_before, rating_after, created_at) values
    ('${U2}', 10, 'c', 'learning', '{"course_id":"x1"}', 0, 10, now() - interval '2 days'),
    ('${U2}', 10, 'c', 'learning', '{"course_id":"x1"}', 10, 20, now() - interval '1 day');`);
  for (const m of MIGRATIONS) pg.file(m);
  assert.equal(
    pg.sql(
      `select count(*) from xp_transactions where user_id='${U2}' and idempotency_key='checklist:dup'`,
    ),
    '1',
  );
  assert.equal(
    pg.sql(
      `select count(*) from elo_transactions where user_id='${U2}' and idempotency_key='learning:x1'`,
    ),
    '1',
  );
  /* And a fresh award with that key is now refused. */
  assert.equal(
    pg.sql(
      `select awarded from award_xp('${U2}', 50, 'Checklist task: dup', 'engagement', 'checklist:dup')`,
    ),
    'f',
  );
});

test('stripe_events / alpaca_events: one row per event id', async (t) => {
  if (skip(t)) return;
  const r = await pg.parallel(
    n(
      () =>
        `insert into stripe_events (id, type) values ('evt_x', 't') on conflict do nothing returning id`,
    ),
  );
  assert.equal(r.filter((x) => x.out === 'evt_x').length, 1);
  const a = await pg.parallel(
    n(() => `insert into alpaca_events (id) values ('a1') on conflict do nothing returning id`),
  );
  assert.equal(a.filter((x) => x.out === 'a1').length, 1);
});

test('rate_limit_hit: 10 parallel hits against a limit of 3 allow exactly 3; the window restarts', async (t) => {
  if (skip(t)) return;
  const r = await pg.parallel(n(() => `select allowed from rate_limit_hit('k1', 3, 60000)`));
  assert.ok(
    r.every((x) => x.code === 0),
    r.map((x) => x.err).join('\n'),
  );
  assert.equal(r.filter((x) => x.out === 't').length, 3);
  pg.sql(
    `update rate_limit_buckets set expires_at = now() - interval '1 second' where bucket_key='k1'`,
  );
  assert.equal(
    pg.sql(`select allowed || ',' || hits from rate_limit_hit('k1', 3, 60000)`),
    'true,1',
  );
});

test('submit_org_assignment: 10 parallel submits get versions 1..10 with no duplicate', async (t) => {
  if (skip(t)) return;
  const asg = '33333333-3333-4333-8333-333333333333';
  const org = '44444444-4444-4444-8444-444444444444';
  const claims = JSON.stringify({ sub: U1, role: 'authenticated' });
  const r = await pg.parallel(
    n(
      () =>
        `set request.jwt.claims = '${claims}'; select version from submit_org_assignment('${asg}', '${org}', 'x')`,
    ),
  );
  assert.ok(
    r.every((x) => x.code === 0),
    r.map((x) => x.err).join('\n'),
  );
  assert.equal(
    pg.sql(
      `select string_agg(version::text, ',' order by version) from org_assignment_submissions where assignment_id='${asg}'`,
    ),
    '1,2,3,4,5,6,7,8,9,10',
  );
});

test('replace_13f_holdings: a filing is replaced atomically, duplicates per CUSIP kept', (t) => {
  if (skip(t)) return;
  const rows = (k) =>
    JSON.stringify(
      Array.from({ length: k }, (_, i) => ({ cusip: i % 2 ? 'AAA' : 'BBB', value_usd: i })),
    );
  assert.equal(pg.sql(`select replace_13f_holdings('acc-1', '${rows(5)}')`), '5');
  assert.equal(pg.sql(`select replace_13f_holdings('acc-1', '${rows(3)}')`), '3');
  assert.equal(pg.sql(`select count(*) from sec_13f_holdings where accession_no='acc-1'`), '3');
  /* A bad row rolls the whole replacement back: the previous 3 survive. */
  assert.throws(() =>
    pg.sql(`select replace_13f_holdings('acc-1', '[{"value_usd":"not-a-number"}]')`),
  );
  assert.equal(pg.sql(`select count(*) from sec_13f_holdings where accession_no='acc-1'`), '3');
});

test('latest_messages: one newest row per conversation', (t) => {
  if (skip(t)) return;
  const c1 = '55555555-5555-4555-8555-555555555555';
  const c2 = '66666666-6666-4666-8666-666666666666';
  pg.sql(`insert into messages (conversation_id, content, created_at) values
    ('${c1}', 'old', now() - interval '2 hours'), ('${c1}', 'new', now()),
    ('${c2}', 'only', now() - interval '1 hour')`);
  assert.equal(
    pg.sql(
      `select string_agg(content, ',' order by content) from latest_messages(array['${c1}','${c2}']::uuid[])`,
    ),
    'new,only',
  );
});
