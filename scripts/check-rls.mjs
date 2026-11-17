#!/usr/bin/env node
/* Security assessment P0 regression suite (F-01, F-02, F-03, F-11), plus
   the P1 over-broad policies (waitlist, Echo, plaid_*).
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

/* Tables outside the shared stub, with the policies they have live. */
const LIVE_P1 = `
create table public.waitlist (id uuid primary key default gen_random_uuid(), email text, status text default 'pending');
alter table public.waitlist enable row level security;
create policy "Allow authenticated to view" on public.waitlist for select to authenticated using (true);
create policy "Allow public inserts" on public.waitlist for insert with check (true);
create table public.echo_writer_applications (id uuid primary key default gen_random_uuid(), user_id uuid, status text default 'pending');
alter table public.echo_writer_applications enable row level security;
create policy "Users see own application" on public.echo_writer_applications for all using (auth.uid() = user_id);
create table public.echo_articles (id uuid primary key default gen_random_uuid(), author_id uuid, title text,
  article_status text default 'draft', is_featured boolean not null default false);
alter table public.echo_articles enable row level security;
create policy "Anyone can read published articles" on public.echo_articles for select using (article_status = 'published');
create policy "Authors manage own articles" on public.echo_articles for all using (auth.uid() = author_id);
create table public.lobbying_client_tickers (client_name text primary key, ticker text not null, exchange text,
  company_label text, verified boolean not null default true, match_method text, source text,
  created_at timestamptz not null default now());
alter table public.lobbying_client_tickers enable row level security;
create policy "public read lct" on public.lobbying_client_tickers for select using (true);
revoke insert, update, delete on public.lobbying_client_tickers from anon, authenticated;
grant select on public.lobbying_client_tickers to anon, authenticated;
create table if not exists public.sec_fundamentals (id bigint generated always as identity primary key,
  ticker text, cik text, entity_name text);
${['plaid_accounts', 'plaid_holdings', 'plaid_transactions']
  .map(
    (
      t,
    ) => `create table public.${t} (id uuid primary key default gen_random_uuid(), user_id uuid, amount numeric);
alter table public.${t} enable row level security;
create policy "Users see own ${t}" on public.${t} for all using (auth.uid() = user_id);`,
  )
  .join('\n')}
`;

let pg = null;
test.before(async () => {
  pg = await startPg({ migrations: MIGRATIONS, extraSchema: LIVE_P1 });
  if (!pg) return;
  pg.sql(`
    insert into auth.users (id) values ('${A}'), ('${B}');
    insert into profiles (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');
    insert into partners (user_id, status) values ('${B}', 'pending');
    insert into brokerage_accounts (user_id, alpaca_account_id, account_status) values ('${A}', 'acct-a', 'SUBMITTED');
    insert into alpaca_accounts (user_id, alpaca_account_id, account_status) values ('${A}', 'acct-a2', 'SUBMITTED');
    insert into user_rewards (user_id, total_xp) values ('${A}', 10);
    insert into plaid_items (user_id, item_id, access_token, status) values ('${A}', 'it-1', 'enc:secret', 'active');
    insert into waitlist (email) values ('someone@example.com');
    insert into echo_writer_applications (user_id) values ('${A}');
    insert into echo_articles (author_id, title) values ('${A}', 'draft by A');
    insert into echo_articles (author_id, title, article_status) values ('${B}', 'live by B', 'published');
    insert into plaid_holdings (user_id, amount) values ('${A}', 10), ('${B}', 20);
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

const lastLine = (out) => out.split('\n').pop();

test('waitlist: signed-in users and anon can neither read nor insert', (t) => {
  if (skip(t)) return;
  denied(() => asA('select email from waitlist'));
  denied(() => asA(`insert into waitlist (email) values ('x@example.com')`));
  denied(() => pg.sql(`set role anon; insert into waitlist (email) values ('x@example.com')`));
  assert.equal(pg.sql('select count(*) from waitlist'), '1');
});

test('echo_writer_applications: read own, never self-approve', (t) => {
  if (skip(t)) return;
  assert.equal(lastLine(asA('select status from echo_writer_applications')), 'pending');
  denied(() =>
    asA(`update echo_writer_applications set status = 'approved' where user_id = '${A}'`),
  );
  denied(() =>
    asA(`insert into echo_writer_applications (user_id, status) values ('${A}', 'approved')`),
  );
});

test('echo_articles: authors see their drafts but cannot publish, feature or insert', (t) => {
  if (skip(t)) return;
  assert.equal(lastLine(asA(`select count(*) from echo_articles`)), '2');
  denied(() =>
    asA(
      `update echo_articles set article_status = 'published', is_featured = true where author_id = '${A}'`,
    ),
  );
  denied(() =>
    asA(
      `insert into echo_articles (author_id, title, article_status) values ('${A}', 'x', 'published')`,
    ),
  );
  denied(() => asA(`delete from echo_articles where author_id = '${A}'`));
  assert.equal(lastLine(pg.sql(`set role anon; select title from echo_articles`)), 'live by B');
});

test('plaid_*: read own holdings only, never write', (t) => {
  if (skip(t)) return;
  assert.equal(lastLine(asA('select sum(amount) from plaid_holdings')), '10');
  for (const tbl of ['plaid_accounts', 'plaid_holdings', 'plaid_transactions']) {
    denied(() => asA(`insert into ${tbl} (user_id, amount) values ('${A}', 1e9)`));
    denied(() => asA(`update ${tbl} set amount = 1e9 where user_id = '${A}'`));
  }
});

test('mock_theses: owner reads own rows only; no insert, update or delete from the browser', (t) => {
  if (skip(t)) return;
  pg.sql(`
    insert into mock_theses (user_id, name, is_active) values ('${A}', 'A growth', true);
    insert into mock_theses (user_id, name, is_active) values ('${B}', 'B income', true);
  `);
  assert.equal(lastLine(asA('select count(*) from mock_theses')), '1', 'sees only its own row');
  assert.equal(lastLine(asA('select name from mock_theses')), 'A growth');
  assert.equal(lastLine(asA(`select count(*) from mock_theses where user_id = '${B}'`)), '0');
  denied(() => asA(`insert into mock_theses (user_id, name) values ('${A}', 'forged')`));
  asA(`update mock_theses set max_single_name_pct = 99, name = 'x' where user_id = '${A}'`);
  asA(`update mock_theses set name = 'x' where user_id = '${B}'`);
  asA(`delete from mock_theses`);
  assert.equal(
    pg.sql(
      `select string_agg(name || ':' || max_single_name_pct, ',' order by name) from mock_theses`,
    ),
    'A growth:15.00,B income:15.00',
    'updates and deletes from the browser change nothing',
  );
  const n = pg.sql(
    `select count(*) from pg_policies where schemaname = 'public' and tablename = 'mock_theses'
       and cmd <> 'SELECT'`,
  );
  assert.equal(n, '0', 'select is the only policy');
});

test('user_watchlist_notes: a user reads and writes only their own notes', (t) => {
  if (skip(t)) return;
  const note = (owner, ticker, text) =>
    `insert into user_watchlist_notes (user_id, item_type, ticker, hypothesis) values ('${owner}', 'stock', '${ticker}', '${text}')`;
  const asB = (stmt) => as(B, 'b@example.com', stmt);
  asA(note(A, 'AAPL', 'mine'));
  asB(note(B, 'AAPL', 'theirs'));
  assert.equal(
    lastLine(asA('select count(*) from user_watchlist_notes')),
    '1',
    'sees only its own',
  );
  assert.equal(lastLine(asB('select hypothesis from user_watchlist_notes')), 'theirs');
  denied(() => asB(note(A, 'MSFT', 'forged for A')));
  asB(`update user_watchlist_notes set hypothesis = 'hacked' where user_id = '${A}'`);
  asB(`delete from user_watchlist_notes where user_id = '${A}'`);
  denied(() => asB(`update user_watchlist_notes set user_id = '${A}' where user_id = '${B}'`));
  asA(`update user_watchlist_notes set risks = 'rates' where user_id = '${A}'`);
  assert.equal(
    pg.sql(
      `select string_agg(hypothesis || ':' || risks, ',' order by hypothesis) from user_watchlist_notes`,
    ),
    'mine:rates,theirs:',
    'another user can neither edit, delete nor take over a note',
  );
  assert.throws(() => asA(note(A, 'AAPL', 'second')), /duplicate key/, 'one note per asset');
  assert.throws(() => asA(note(A, 'TSLA', '')), /user_watchlist_notes_not_empty/);
  assert.throws(
    () =>
      asA(
        `insert into user_watchlist_notes (user_id, item_type, ticker, hypothesis) values ('${A}', 'fund', 'X', 'x')`,
      ),
    /check constraint/,
  );
  asA(`delete from user_watchlist_notes where user_id = '${A}'`);
  assert.equal(pg.sql('select count(*) from user_watchlist_notes'), '1', 'the owner can delete');
});

/* ── QA remediation (Phase 8.2): static assertions on the new migrations ── */
import { readFileSync } from 'node:fs';

const migText = (name) => readFileSync(path.join(MIG_DIR, name), 'utf8');

test('org_members_guard_privileged exists and covers role, tier, sub_role, is_active, can_invite', () => {
  const sql = migText('20261026120000_org_privilege_guards.sql');
  assert.match(sql, /create or replace function public\.org_members_guard_privileged\(\)/);
  assert.match(sql, /create trigger org_members_guard_privileged/);
  for (const col of ['role', 'tier', 'sub_role', 'is_active', 'can_invite']) {
    assert.match(sql, new RegExp(`new\\.${col}\\s+is distinct from old\\.${col}`), col);
  }
});

test('the org_pitches update policy carries a WITH CHECK', () => {
  const sql = migText('20261026120000_org_privilege_guards.sql');
  const policy = sql.slice(sql.indexOf('create policy "members update pitches in org"'));
  assert.ok(policy.length > 0, 'policy present');
  const body = policy.slice(0, policy.indexOf('$p$'));
  assert.match(body, /for update/);
  assert.match(body, /with check \(/);
});

test('no owner FOR ALL policy remains on mock_portfolios, user_course_progress, user_learning_badges', (t) => {
  const sql = migText('20261026130000_server_only_gamification_writes.sql');
  const code = sql.replace(/--.*$/gm, '');
  assert.doesNotMatch(code, /create policy[^;]*for all/i);
  if (skip(t)) return;
  const n = pg.sql(
    `select count(*) from pg_policies where schemaname = 'public' and cmd = 'ALL'
       and tablename in ('mock_portfolios', 'user_course_progress', 'user_learning_badges')`,
  );
  assert.equal(n, '0');
});

/* Nov 17, 2026: the exemplary-brief table (pgvector) is part of this suite. It is read by the
   server with the service role only; a signed-in user and a visitor get nothing from it. */
test('sonar_exemplary_briefs: service role only, for the table and its match function', (t) => {
  if (skip(t)) return;
  assert.equal(
    pg.sql(
      `select relrowsecurity::text from pg_class where oid = 'public.sonar_exemplary_briefs'::regclass`,
    ),
    'true',
  );
  assert.equal(
    pg.sql(
      `select count(*) from pg_policies where schemaname = 'public' and tablename = 'sonar_exemplary_briefs'`,
    ),
    '0',
    'no policy opens the table to a client role',
  );
  denied(() => asA('select slug from sonar_exemplary_briefs'));
  denied(() => pg.sql('set role anon; select slug from sonar_exemplary_briefs'));
  const call = `select count(*) from match_sonar_exemplary_briefs(array_fill(0, array[384])::vector, 0.5, 1)`;
  denied(() => asA(call));
  denied(() => pg.sql(`set role anon; ${call}`));
  assert.equal(pg.sql(`set role service_role; ${call}`), '0');
});

test('lobbying client identity: browsers cannot write a mapping or call the matcher; a published mapping needs evidence', (t) => {
  if (skip(t)) return;
  const ins = `insert into public.lobbying_client_tickers (client_name, ticker, verified) values ('EXAMPLE CORP', 'EXM', false)`;
  const call = `select count(*) from public.lobbying_client_candidates(2024)`;
  denied(() => asA(ins));
  denied(() => pg.sql(`set role anon; ${ins}`));
  denied(() => asA(call));
  denied(() => pg.sql(`set role anon; ${call}`));
  assert.equal(
    pg.sql(
      `select has_function_privilege('service_role', 'public.lobbying_client_candidates(int)', 'execute')::text`,
    ),
    'true',
  );
  /* Rows that were published before the migration were given their evidence by it. */
  assert.equal(
    pg.sql(
      `select count(*) from public.lobbying_client_tickers where verified and (status <> 'verified' or evidence is null or verified_at is null or relationship is null)`,
    ),
    '0',
  );
  /* Not even the service role can publish a mapping without evidence, a relationship and a date. */
  assert.throws(() =>
    pg.sql(
      `insert into public.lobbying_client_tickers (client_name, ticker, verified) values ('NO EVIDENCE INC', 'NEV', true)`,
    ),
  );
  pg.sql(
    `insert into public.lobbying_client_tickers (client_name, ticker, verified, status) values ('POSSIBLE INC', 'PSB', false, 'possible')`,
  );
  assert.throws(() =>
    pg.sql(
      `update public.lobbying_client_tickers set verified = true where client_name = 'POSSIBLE INC'`,
    ),
  );
  /* The name-identity rule and its reversal are service role only. */
  for (const fn of ['lobbying_publish_name_identity', 'lobbying_unpublish_name_identity']) {
    denied(() => asA(`select public.${fn}()`));
    denied(() => pg.sql(`set role anon; select public.${fn}()`));
    assert.equal(
      pg.sql(`select has_function_privilege('service_role', 'public.${fn}()', 'execute')::text`),
      'true',
    );
  }
  /* A rule-published row must carry evidence like any other published row. */
  assert.throws(() =>
    pg.sql(
      `update public.lobbying_client_tickers set verified = true, status = 'name_identity' where client_name = 'POSSIBLE INC'`,
    ),
  );
});

test('13F backfill: plan tables and completeness functions are service role only', (t) => {
  if (skip(t)) return;
  for (const tbl of ['sec_13f_backfill_days', 'sec_13f_backfill_quarters']) {
    assert.equal(
      pg.sql(`select relrowsecurity::text from pg_class where oid = 'public.${tbl}'::regclass`),
      'true',
    );
    denied(() => asA(`select count(*) from public.${tbl}`));
    denied(() => pg.sql(`set role anon; select count(*) from public.${tbl}`));
    denied(() => asA(`insert into public.${tbl} (period) values ('2026-03-31')`));
  }
  for (const fn of [
    "sec_13f_quarter_completeness('2026-03-31'::date)",
    "sec_13f_materialise_if_complete('2026-03-31'::date)",
    'titans_materialisable_quarter()',
    'refresh_titans_institutional_latest()',
  ]) {
    denied(() => asA(`select public.${fn}`));
    denied(() => pg.sql(`set role anon; select public.${fn}`));
  }
});

test('the harness refuses to run without a dependency a migration needs', async () => {
  const { extensionsNeeded, pgRequired } = await import('./lib/pg-harness.mjs');
  assert.ok(
    extensionsNeeded(MIGRATIONS).includes('vector'),
    'the pgvector migration is loaded by this suite, not excluded from it',
  );
  const was = { ci: process.env.CI, req: process.env.REQUIRE_PG };
  try {
    process.env.CI = 'true';
    delete process.env.REQUIRE_PG;
    assert.equal(pgRequired(), true, 'required in CI: a missing Postgres fails the job');
    delete process.env.CI;
    assert.equal(pgRequired(), false, 'optional on a developer machine');
    process.env.REQUIRE_PG = '1';
    assert.equal(pgRequired(), true);
  } finally {
    if (was.ci === undefined) delete process.env.CI;
    else process.env.CI = was.ci;
    if (was.req === undefined) delete process.env.REQUIRE_PG;
    else process.env.REQUIRE_PG = was.req;
  }
});
