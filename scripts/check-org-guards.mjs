#!/usr/bin/env node
/* QA ORG-2 / ORG-8 regression: the org privilege guards migration.
   Starts a throwaway LOCAL Postgres (never production), loads org_members,
   org_member_permissions and org_pitches with the policies they have live,
   applies 20261026120000_org_privilege_guards.sql, then acts as signed-in
   users (role `authenticated` + JWT claims, exactly what PostgREST does).
   Skips when no Postgres binaries exist.
   Usage: node --test scripts/check-org-guards.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startPg } from './lib/pg-harness.mjs';

const MIGRATION = new URL(
  '../supabase/migrations/20261026120000_org_privilege_guards.sql',
  import.meta.url,
).pathname;

const ORG = '00000000-0000-4000-8000-0000000000aa';
const EXEC = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PM = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const AN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const AN2 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const M = {
  exec: '10000000-0000-4000-8000-000000000001',
  pm: '10000000-0000-4000-8000-000000000002',
  an: '10000000-0000-4000-8000-000000000003',
  an2: '10000000-0000-4000-8000-000000000004',
};
const PITCH = '20000000-0000-4000-8000-000000000001';

/* The live tables (relevant columns) and their policies before the fix. */
const LIVE_ORG = `
create table public.org_members (
  id uuid primary key default gen_random_uuid(), user_id uuid, org_id uuid,
  role text, tier text, sub_role text, title text, team_id uuid, cohort_id uuid,
  display_name text, is_active boolean default true, can_invite boolean default false,
  lifecycle_status text
);
alter table public.org_members enable row level security;
create or replace function public.auth_org_ids() returns setof uuid language sql stable
  security definer set search_path = public as $$
  select org_id from public.org_members where user_id = auth.uid() and is_active = true $$;
create or replace function public.auth_manager_org_ids() returns setof uuid language sql stable
  security definer set search_path = public as $$
  select org_id from public.org_members where user_id = auth.uid() and is_active = true
     and role in ('executive', 'portfolio_manager') $$;
create policy "Org members read members" on public.org_members for select
  using (org_id in (select auth_org_ids()));
create policy "Users read own org membership" on public.org_members for select
  using (user_id = auth.uid());
create policy "managers update org members" on public.org_members for update
  using (org_id in (select auth_manager_org_ids()))
  with check (org_id in (select auth_manager_org_ids()));

create table public.org_member_permissions (
  id uuid primary key default gen_random_uuid(), org_member_id uuid, permission_key text,
  granted_by uuid
);
alter table public.org_member_permissions enable row level security;
create policy "exec pm manage org member permissions" on public.org_member_permissions for all
  using (exists (select 1 from org_members mgr join org_members target
    on target.org_id = mgr.org_id and target.id = org_member_permissions.org_member_id
    where mgr.user_id = auth.uid() and mgr.is_active and mgr.role in ('executive','portfolio_manager')));

create table public.org_pitches (
  id uuid primary key default gen_random_uuid(), org_id uuid, analyst_member_id uuid,
  approving_pm_member_id uuid, stage text, status text, decision text, decision_at timestamptz,
  vote_yes_count int default 0, vote_no_count int default 0, vote_abstain_count int default 0,
  thesis_short text, last_reaffirmed_at timestamptz
);
alter table public.org_pitches enable row level security;
create policy "org members read pitches" on public.org_pitches for select
  using (org_id in (select org_id from org_members where user_id = auth.uid() and is_active));
create policy "members update pitches in org" on public.org_pitches for update
  using (org_id in (select org_id from org_members where user_id = auth.uid() and is_active));
`;

let pg = null;
test.before(async () => {
  pg = await startPg({ migrations: [MIGRATION], extraSchema: LIVE_ORG });
  if (!pg) return;
  pg.sql(`
    insert into org_members (id, user_id, org_id, role, tier) values
      ('${M.exec}', '${EXEC}', '${ORG}', 'executive', 'president'),
      ('${M.pm}', '${PM}', '${ORG}', 'portfolio_manager', 'portfolio_manager'),
      ('${M.an}', '${AN}', '${ORG}', 'analyst', 'analyst'),
      ('${M.an2}', '${AN2}', '${ORG}', 'analyst', 'analyst');
    insert into org_pitches (id, org_id, analyst_member_id, stage, status)
      values ('${PITCH}', '${ORG}', '${M.an}', 'idea', 'active');
  `);
});
test.after(() => pg?.stop());

const skip = (t) => {
  if (!pg) t.skip('no local Postgres');
  return !pg;
};

function as(user, stmt) {
  const claims = JSON.stringify({ sub: user, role: 'authenticated' });
  return pg.sql(`set role authenticated; set request.jwt.claims = '${claims}'; ${stmt}`);
}
function asService(stmt) {
  const claims = JSON.stringify({ role: 'service_role' });
  return pg.sql(`set role service_role; set request.jwt.claims = '${claims}'; ${stmt}`);
}
const denied = (fn) =>
  assert.throws(fn, /42501|cannot be changed|Only an executive|cannot change your own|workflow/i);
const val = (q) => pg.sql(q);

test('guards are installed', (t) => {
  if (skip(t)) return;
  assert.equal(
    val(
      `select count(*) from pg_trigger where tgname in ('org_members_guard_privileged','org_pitches_guard_workflow')`,
    ),
    '2',
  );
  assert.equal(
    val(
      `select count(*) from pg_policies where policyname = 'members update pitches in org' and with_check is not null`,
    ),
    '1',
  );
});

for (const [col, v] of [
  ['role', `'executive'`],
  ['tier', `'president'`],
  ['sub_role', `'cio'`],
  ['is_active', 'false'],
  ['can_invite', 'true'],
]) {
  test(`org_members: a PM cannot change ${col} (own row or another member)`, (t) => {
    if (skip(t)) return;
    denied(() => as(PM, `update org_members set ${col} = ${v} where id = '${M.pm}'`));
    denied(() => as(PM, `update org_members set ${col} = ${v} where id = '${M.an}'`));
  });
}

test('org_members: a PM can still edit non-privileged chart fields', (t) => {
  if (skip(t)) return;
  as(PM, `update org_members set title = 'Desk lead' where id = '${M.an}'`);
  assert.equal(val(`select title from org_members where id = '${M.an}'`), 'Desk lead');
});

test('org_members: an executive can change another member, never their own role/tier', (t) => {
  if (skip(t)) return;
  as(EXEC, `update org_members set can_invite = true, sub_role = 'lead' where id = '${M.an2}'`);
  assert.equal(val(`select can_invite from org_members where id = '${M.an2}'`), 't');
  denied(() => as(EXEC, `update org_members set role = 'analyst' where id = '${M.exec}'`));
  denied(() => as(EXEC, `update org_members set org_id = gen_random_uuid() where id = '${M.an2}'`));
});

test('org_members: the service role (API) can change role/tier', (t) => {
  if (skip(t)) return;
  asService(`update org_members set tier = 'senior_analyst' where id = '${M.an2}'`);
  assert.equal(val(`select tier from org_members where id = '${M.an2}'`), 'senior_analyst');
});

test('org_member_permissions: a PM cannot self-grant but can grant to a report', (t) => {
  if (skip(t)) return;
  assert.throws(
    () =>
      as(
        PM,
        `insert into org_member_permissions (org_member_id, permission_key) values ('${M.pm}', 'x')`,
      ),
    /row-level security/,
  );
  as(
    PM,
    `insert into org_member_permissions (org_member_id, permission_key) values ('${M.an}', 'x')`,
  );
  assert.equal(
    val(`select count(*) from org_member_permissions where org_member_id='${M.an}'`),
    '1',
  );
});

test('org_pitches: the author edits content but not workflow fields', (t) => {
  if (skip(t)) return;
  as(AN, `update org_pitches set thesis_short = 'mine' where id = '${PITCH}'`);
  assert.equal(val(`select thesis_short from org_pitches where id='${PITCH}'`), 'mine');
  for (const set of [
    `stage = 'approved'`,
    `status = 'accepted'`,
    `decision = 'accepted'`,
    `vote_yes_count = 99`,
    `approving_pm_member_id = '${M.an}'`,
    `analyst_member_id = '${M.an2}'`,
  ]) {
    denied(() => as(AN, `update org_pitches set ${set} where id = '${PITCH}'`));
  }
});

test("org_pitches: another member cannot touch someone else's pitch", (t) => {
  if (skip(t)) return;
  as(
    AN2,
    `update org_pitches set thesis_short = 'hijack', stage = 'approved' where id = '${PITCH}'`,
  );
  assert.equal(val(`select stage from org_pitches where id='${PITCH}'`), 'idea');
});

test('org_pitches: managers and the service role move the workflow', (t) => {
  if (skip(t)) return;
  as(PM, `update org_pitches set stage = 'screening' where id = '${PITCH}'`);
  assert.equal(val(`select stage from org_pitches where id='${PITCH}'`), 'screening');
  asService(`update org_pitches set stage = 'deep_dive', vote_yes_count = 1 where id = '${PITCH}'`);
  assert.equal(val(`select stage from org_pitches where id='${PITCH}'`), 'deep_dive');
});
