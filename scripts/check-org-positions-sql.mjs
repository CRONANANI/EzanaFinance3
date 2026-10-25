#!/usr/bin/env node
/* QA ORG-12: the org_positions import key migration against a throwaway local
   Postgres (skips when no Postgres binaries are installed, e.g. CI).
   Usage: node --no-warnings --test scripts/check-org-positions-sql.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startPg } from './lib/pg-harness.mjs';

const MIG = new URL(
  '../supabase/migrations/20261026140000_org_positions_import_unique.sql',
  import.meta.url,
).pathname;

const ORG = '0f000000-0000-4000-8000-000000000001';
const TEAM = '0f000000-0000-4000-8000-000000000002';
const UA = '0f000000-0000-4000-8000-000000000003';

const SCHEMA = `
create table public.org_positions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null, team_id uuid, ticker text not null,
  shares numeric not null check (shares > 0), avg_cost numeric not null,
  source text not null, unified_account_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.org_positions (org_id, team_id, ticker, shares, avg_cost, source, unified_account_id, is_active, updated_at) values
  ('${ORG}', null,    'AAPL', 1, 1, 'csv',   null,  true,  now() - interval '2 day'),
  ('${ORG}', null,    'AAPL', 2, 1, 'csv',   null,  true,  now() - interval '1 day'),
  ('${ORG}', '${TEAM}', 'MSFT', 3, 1, 'plaid', '${UA}', true,  now() - interval '1 day'),
  ('${ORG}', '${TEAM}', 'MSFT', 4, 1, 'plaid', '${UA}', false, now()),
  ('${ORG}', '${TEAM}', 'MSFT', 5, 1, 'manual', null, true,  now());
`;

let pg = null;
test.before(async () => {
  pg = await startPg({ extraSchema: SCHEMA, migrations: [MIG, MIG] });
});
test.after(() => pg?.stop());

const skip = (t) => {
  if (!pg) t.skip('no local Postgres');
  return !pg;
};

test('ORG-12: dedupe keeps the newest live row per key; applies twice', (t) => {
  if (skip(t)) return;
  const rows = pg
    .sql(
      `select ticker || ':' || source || ':' || shares from org_positions order by ticker, source`,
    )
    .split('\n');
  // AAPL csv: newest (2 shares) kept; MSFT plaid: the LIVE row (3) beats the newer archived one.
  assert.deepEqual(rows, ['AAPL:csv:2', 'MSFT:manual:5', 'MSFT:plaid:3']);
});

test('ORG-12: upsert on the key updates instead of duplicating (null team/account too)', (t) => {
  if (skip(t)) return;
  pg.sql(`insert into org_positions (org_id, team_id, ticker, shares, avg_cost, source, unified_account_id)
          values ('${ORG}', null, 'AAPL', 9, 2, 'csv', null)
          on conflict (org_id, team_id, ticker, source, unified_account_id)
          do update set shares = excluded.shares, avg_cost = excluded.avg_cost`);
  assert.equal(
    pg.sql(`select count(*) || ':' || max(shares) from org_positions where ticker = 'AAPL'`),
    '1:9',
  );
  assert.throws(() =>
    pg.sql(`insert into org_positions (org_id, team_id, ticker, shares, avg_cost, source, unified_account_id)
            values ('${ORG}', null, 'AAPL', 1, 1, 'csv', null)`),
  );
});
