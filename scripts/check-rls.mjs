#!/usr/bin/env node
/* Security assessment P0 regression suite (F-01, F-02, F-03, F-11).
   Starts a throwaway LOCAL Postgres (never production), loads the tables
   with the policies the live database had before the fix, applies the
   migrations, then acts as two synthetic signed-in users (role
   `authenticated` + JWT claims, exactly what PostgREST does) and asserts
   what they can and cannot write. Skips when no Postgres binaries exist.
   Usage: npm run test:rls */
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

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

let pg = null;
test.before(async () => {
  pg = await startPg({ migrations: MIGRATIONS });
  if (!pg) return;
  pg.sql(`
    insert into auth.users (id) values ('${A}'), ('${B}');
    insert into profiles (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');
    insert into partners (user_id, status) values ('${B}', 'pending');
    insert into brokerage_accounts (user_id, alpaca_account_id, account_status) values ('${A}', 'acct-a', 'SUBMITTED');
    insert into alpaca_accounts (user_id, alpaca_account_id, account_status) values ('${A}', 'acct-a2', 'SUBMITTED');
    insert into user_rewards (user_id, total_xp) values ('${A}', 10);
    insert into plaid_items (user_id, item_id, access_token, status) values ('${A}', 'it-1', 'enc:secret', 'active');
  `);
});
test.after(() => pg?.stop());

const skip = (t) => {
  if (!pg) t.skip('no local Postgres');
  return !pg;
};

/** Run SQL as a signed-in user through the same role + claims PostgREST uses. */
function as(user, email, stmt) {
  const claims = JSON.stringify({ sub: user, role: 'authenticated', email });
  return pg.sql(`set role authenticated; set request.jwt.claims = '${claims}'; ${stmt}`);
}
const asA = (stmt) => as(A, 'a@example.com', stmt);
const denied = (fn) =>
  assert.throws(fn, /permission denied|server-managed|violates row-level security/);

test('profiles: a user can edit their own settings columns', (t) => {
  if (skip(t)) return;
  asA(
    `update profiles set full_name = 'Ann', pinned_cards = '{"x":1}', onboarding_step = 2 where id = '${A}'`,
  );
  assert.equal(
    pg.sql(`select full_name || ',' || onboarding_step from profiles where id='${A}'`),
    'Ann,2',
  );
});

for (const [col, val] of [
  ['subscription_status', `'active'`],
  ['subscription_plan', `'pro'`],
  ['email_verified', 'true'],
  ['is_partner', 'true'],
  ['is_disabled', 'false'],
  ['creator_tier', `'gold'`],
  ['stripe_customer_id', `'cus_x'`],
  ['deleted_at', 'null'],
  ['one_time_plan', `'pro'`],
  ['email', `'evil@example.com'`],
]) {
  test(`profiles: a user cannot set ${col}`, (t) => {
    if (skip(t)) return;
    denied(() => asA(`update profiles set ${col} = ${val} where id = '${A}'`));
  });
}

test("profiles: a user cannot touch another user's row", (t) => {
  if (skip(t)) return;
  asA(`update profiles set full_name = 'x' where id = '${B}'`);
  assert.equal(pg.sql(`select coalesce(full_name, '') from profiles where id='${B}'`), '');
});

test('profiles: a self-created row cannot carry privileged values; email comes from the JWT', (t) => {
  if (skip(t)) return;
  const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  pg.sql(`insert into auth.users (id) values ('${C}')`);
  denied(() =>
    as(
      C,
      'c@example.com',
      `insert into profiles (id, email, email_verified) values ('${C}', 'c@example.com', true)`,
    ),
  );
  as(
    C,
    'c@example.com',
    `insert into profiles (id, email, onboarding_completed) values ('${C}', 'spoof@example.com', true)`,
  );
  assert.equal(pg.sql(`select email from profiles where id='${C}'`), 'c@example.com');
});

test('profiles: the service role and SECURITY DEFINER code can still write privileged fields', (t) => {
  if (skip(t)) return;
  pg.sql(
    `set role service_role; update profiles set subscription_status = 'active', email_verified = true where id = '${A}'`,
  );
  assert.equal(pg.sql(`select subscription_status from profiles where id='${A}'`), 'active');
  /* As the owner (what handle_new_user runs as at signup). */
  pg.sql(`update profiles set legacy_user = true where id = '${B}'`);
});

test('partners: a user cannot create or upgrade a partner row', (t) => {
  if (skip(t)) return;
  denied(() =>
    asA(
      `insert into partners (user_id, status, echo_writer_approved) values ('${A}', 'active', true)`,
    ),
  );
  denied(() =>
    as(B, 'b@example.com', `update partners set status = 'active' where user_id = '${B}'`),
  );
  assert.equal(
    as(B, 'b@example.com', `select status from partners where user_id = '${B}'`).split('\n').pop(),
    'pending',
  );
});

test('brokerage_accounts / alpaca_accounts: read own, never write', (t) => {
  if (skip(t)) return;
  denied(() =>
    asA(`update brokerage_accounts set account_status = 'ACTIVE' where user_id = '${A}'`),
  );
  denied(() =>
    asA(`update brokerage_accounts set alpaca_account_id = 'victim' where user_id = '${A}'`),
  );
  denied(() => asA(`update alpaca_accounts set account_status = 'ACTIVE' where user_id = '${A}'`));
  denied(() =>
    asA(`insert into alpaca_accounts (user_id, alpaca_account_id) values ('${A}', 'victim')`),
  );
  assert.equal(
    asA(`select account_status from brokerage_accounts where user_id = '${A}'`).split('\n').pop(),
    'SUBMITTED',
  );
});

test('trade_history: a user cannot forge their own trades', (t) => {
  if (skip(t)) return;
  denied(() =>
    asA(
      `insert into trade_history (user_id, symbol, side, status) values ('${A}', 'AAPL', 'buy', 'filled')`,
    ),
  );
});

test('user_rewards / xp_transactions: read own, never write', (t) => {
  if (skip(t)) return;
  denied(() =>
    asA(
      `update user_rewards set total_xp = 99999, trading_credit_balance = 1000 where user_id = '${A}'`,
    ),
  );
  denied(() =>
    asA(
      `insert into xp_transactions (user_id, amount, reason, category) values ('${A}', 9999, 'x', 'x')`,
    ),
  );
  assert.equal(
    asA(`select total_xp from user_rewards where user_id = '${A}'`).split('\n').pop(),
    '10',
  );
});

test('plaid_items: the owner can list items but never read the access token or write', (t) => {
  if (skip(t)) return;
  assert.equal(
    asA(`select institution_name is null from plaid_items where user_id = '${A}'`)
      .split('\n')
      .pop(),
    't',
  );
  denied(() => asA(`select access_token from plaid_items where user_id = '${A}'`));
  denied(() => asA(`update plaid_items set status = 'active' where user_id = '${A}'`));
});

test('profiles: the guard trigger holds even if table-wide UPDATE is granted again', (t) => {
  if (skip(t)) return;
  pg.sql('grant update on profiles to authenticated');
  try {
    assert.throws(
      () => asA(`update profiles set subscription_plan = 'pro' where id = '${A}'`),
      /server-managed/,
    );
    asA(`update profiles set bio = 'ok' where id = '${A}'`);
  } finally {
    pg.sql('revoke update on profiles from authenticated');
    pg.sql(
      `grant update (full_name, bio, pinned_cards, onboarding_step, updated_at) on profiles to authenticated`,
    );
  }
});
