#!/usr/bin/env node
/* QA org batch (ORG-6, ORG-7, ORG-9, ORG-10, ORG-12, ORG-15): pure helpers and
   mocked-Supabase checks for the org surface.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-org-qa.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import { buildTeamCalendar, teamHubEyebrow } from '../src/lib/org-team-calendar.js';
import { ASSIGNABLE_PERMISSIONS, memberHasPermission } from '../src/lib/org-permissions-server.js';
import {
  getCurrentOrgMember,
  getOrgMemberForUser,
  pickMembership,
  readPreferredOrgId,
} from '../src/lib/org-trading-server.js';
import { resolvePrefsAccess } from '../src/lib/org-notification-prefs.js';
import { mergeImportRows, POSITION_IMPORT_CONFLICT } from '../src/lib/org-position-import.js';

const NOW = Date.parse('2026-10-25T12:00:00Z');

/* ── ORG-6: Team Hub calendar from real data ─────────────────────────── */

test('ORG-6: calendar merges meetings, tasks and assignment due dates, sorted', () => {
  const items = buildTeamCalendar({
    now: NOW,
    teams: [{ teamId: 't1', name: 'Tech Desk' }],
    meetings: [
      { id: 'm1', title: 'IC', status: 'scheduled', scheduled_at: '2026-10-28T15:00:00Z' },
      { id: 'm2', title: 'Old', status: 'closed', scheduled_at: '2026-10-27T15:00:00Z' },
      { id: 'm3', title: 'No date', status: 'scheduled', scheduled_at: null },
    ],
    tasks: [
      { id: 'k1', title: 'Model', status: 'pending', due_date: '2026-10-26', team_id: 't1' },
      { id: 'k2', title: 'Done', status: 'completed', due_date: '2026-10-26' },
      { id: 'k3', title: 'Past', status: 'pending', due_date: '2026-10-01' },
    ],
    assignments: [
      { id: 'a1', title: 'Memo', status: 'assigned', due_date: '2026-10-25T20:00:00Z' },
      { id: 'a2', title: 'Graded', status: 'graded', due_date: '2026-10-29' },
    ],
  });
  assert.deepEqual(
    items.map((i) => i.id),
    ['asg-a1', 'task-k1', 'mtg-m1'],
  );
  assert.equal(items[1].team, 'Tech Desk');
  assert.equal(items[2].team, 'Fund');
});

test('ORG-6: empty org gets an empty calendar (no mock events)', () => {
  assert.deepEqual(buildTeamCalendar({ now: NOW }), []);
  assert.deepEqual(buildTeamCalendar({ now: NOW, meetings: null, tasks: undefined }), []);
});

test('ORG-6: eyebrow derives the term from the current cohort', () => {
  assert.equal(teamHubEyebrow('Spring 2027'), 'Team Hub · Spring 2027');
  assert.equal(teamHubEyebrow(null), 'Team Hub');
  assert.equal(teamHubEyebrow('  '), 'Team Hub');
});

/* ── ORG-7: grantable permissions are enforced ───────────────────────── */

test('ORG-7: tier defaults and overrides drive memberHasPermission', async () => {
  const db = createMockSupabase({
    seed: { org_member_permissions: [{ org_member_id: 'jr', permission_key: 'create_events' }] },
  });
  const exec = { id: 'ex', role: 'executive', is_active: true };
  const pm = { id: 'pm', role: 'portfolio_manager', sub_role: 'PM', is_active: true };
  const jr = { id: 'jr', role: 'portfolio_manager', sub_role: 'Junior PM', is_active: true };
  assert.equal(await memberHasPermission(db, exec, 'create_events'), true);
  assert.equal(await memberHasPermission(db, exec, 'view_analytics'), true);
  assert.equal(await memberHasPermission(db, pm, 'create_events'), false);
  assert.equal(await memberHasPermission(db, pm, 'view_team_analytics'), true);
  assert.equal(await memberHasPermission(db, pm, 'approve_deliverables'), false);
  assert.equal(await memberHasPermission(db, jr, 'create_events'), true, 'override grants it');
  assert.equal(
    await memberHasPermission(db, { ...exec, is_active: false }, 'view_analytics'),
    false,
  );
  assert.equal(await memberHasPermission(db, null, 'view_analytics'), false);
  assert.equal(await memberHasPermission(db, pm, ['view_analytics', 'view_team_analytics']), true);
});

test('ORG-7: mentor_juniors is hidden from the grant UI until it gates something', () => {
  assert.equal(ASSIGNABLE_PERMISSIONS.includes('mentor_juniors'), false);
  for (const k of [
    'upload_deliverables',
    'view_team_analytics',
    'view_analytics',
    'create_events',
    'approve_deliverables',
  ]) {
    assert.ok(ASSIGNABLE_PERMISSIONS.includes(k), k);
  }
});

/* ── ORG-9: multi-org membership resolution ─────────────────────────── */

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const multiOrgDb = () => {
  const db = createMockSupabase({
    seed: {
      org_members: [
        { id: 'ma', user_id: 'u1', org_id: ORG_A, role: 'analyst', is_active: true },
        { id: 'mb', user_id: 'u1', org_id: ORG_B, role: 'executive', is_active: true },
        { id: 'mx', user_id: 'u1', org_id: 'gone', role: 'executive', is_active: false },
      ],
    },
  });
  db.auth = { getUser: async () => ({ data: { user: { id: 'u1', email: 'u1@x.test' } } }) };
  return db;
};

test('ORG-9: pickMembership prefers the requested org, else the earliest row', () => {
  const rows = [{ org_id: ORG_A }, { org_id: ORG_B }];
  assert.equal(pickMembership(rows, ORG_B).org_id, ORG_B);
  assert.equal(pickMembership(rows, 'not-mine').org_id, ORG_A);
  assert.equal(pickMembership(rows, null).org_id, ORG_A);
  assert.equal(pickMembership([], ORG_A), null);
});

test('ORG-9: a user in two orgs resolves (no maybeSingle error) and honours the preference', async () => {
  const db = multiOrgDb();
  const a = await getOrgMemberForUser(db, 'u1', { preferredOrgId: null });
  assert.equal(a.org_id, ORG_A);
  assert.equal(a.memberships.length, 2, 'inactive membership excluded');
  const b = await getOrgMemberForUser(db, 'u1', { preferredOrgId: ORG_B });
  assert.equal(b.id, 'mb');
  const cur = await getCurrentOrgMember(db, ORG_B);
  assert.equal(cur.org_id, ORG_B);
  assert.equal(cur.email, 'u1@x.test');
  assert.equal(await getOrgMemberForUser(db, 'nobody'), null);
  assert.equal(await getOrgMemberForUser(db, null), null);
});

test('ORG-9: cookie read is safe outside a request scope', () => {
  assert.equal(readPreferredOrgId(), null);
});

/* ── ORG-10: notification prefs default to the caller's membership ──── */

const prefsDb = () =>
  createMockSupabase({
    seed: {
      org_members: [
        {
          id: 'pm1',
          user_id: 'upm',
          org_id: ORG_A,
          role: 'portfolio_manager',
          team_id: 't1',
          is_active: true,
        },
        {
          id: 'an1',
          user_id: 'uan',
          org_id: ORG_A,
          role: 'analyst',
          team_id: 't1',
          is_active: true,
        },
        {
          id: 'an2',
          user_id: 'uan2',
          org_id: ORG_A,
          role: 'analyst',
          team_id: 't2',
          is_active: true,
        },
        {
          id: 'pmB',
          user_id: 'upm',
          org_id: ORG_B,
          role: 'analyst',
          team_id: null,
          is_active: true,
        },
      ],
    },
  });

test('ORG-10: missing target defaults to the caller (no 400)', async () => {
  const g = await resolvePrefsAccess(prefsDb(), 'uan', null);
  assert.equal(g.ok, true);
  assert.equal(g.target.id, 'an1');
  assert.equal(g.isSelf, true);
});

test('ORG-10: supervisor scope and cross-team / non-member denial', async () => {
  const db = prefsDb();
  const sub = await resolvePrefsAccess(db, 'upm', 'an1');
  assert.equal(sub.ok, true);
  assert.equal(sub.isSelf, false);
  assert.equal(sub.caller.id, 'pm1', 'caller resolved in the target org');
  assert.equal((await resolvePrefsAccess(db, 'upm', 'an2')).ok, false, 'other team');
  assert.equal((await resolvePrefsAccess(db, 'uan', 'pm1')).ok, false, 'upward');
  assert.equal((await resolvePrefsAccess(db, 'stranger', null)).ok, false);
  assert.equal((await resolvePrefsAccess(db, 'uan', 'missing')).ok, false);
});

/* ── ORG-12: idempotent imports ─────────────────────────────────────── */

test('ORG-12: upsert key matches the migration index columns', () => {
  assert.equal(POSITION_IMPORT_CONFLICT, 'org_id,team_id,ticker,source,unified_account_id');
});

test('ORG-12: duplicate tickers in one import merge (summed shares, weighted cost)', () => {
  const base = { org_id: 'o', team_id: null, source: 'csv', unified_account_id: null };
  const out = mergeImportRows([
    { ...base, ticker: 'AAPL', shares: 10, avg_cost: 100, name: null },
    { ...base, ticker: 'MSFT', shares: 1, avg_cost: 5 },
    { ...base, ticker: 'AAPL', shares: 30, avg_cost: 200, name: 'Apple' },
    { ...base, team_id: 't2', ticker: 'AAPL', shares: 1, avg_cost: 1 },
  ]);
  assert.equal(out.length, 3);
  const aapl = out.find((r) => r.ticker === 'AAPL' && r.team_id === null);
  assert.equal(aapl.shares, 40);
  assert.equal(aapl.avg_cost, 175);
  assert.equal(aapl.name, 'Apple');
});
