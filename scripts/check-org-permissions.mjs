/**
 * Team Permissions (Nov 2026 redesign): the grant rules the change route
 * enforces, the page payload and the sample bundle.
 *   npm run test:org-permissions
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import {
  ASSIGNABLE_PERMISSIONS,
  checkGrantChange,
  loadPermissionsMatrix,
  viewerCanGrant,
} from '../src/lib/org-permissions-server.js';
import {
  MATRIX_RIGHTS,
  RIGHT_KEYS,
  cellState,
  decideChange,
  grantableRights,
  reviewItems,
  roleDefaults,
  roleLabel,
} from '../src/lib/org-permissions-model.js';
import { canFlagPositions, getMemberPermissions } from '../src/lib/org-permissions-config.js';
import { buildPermissionsSample } from '../src/lib/org-permissions-sample.js';

const ORG = 'org-1';
const exec = { id: 'ex', user_id: 'u-ex', org_id: ORG, role: 'executive', is_active: true };
const pm = {
  id: 'pm',
  user_id: 'u-pm',
  org_id: ORG,
  role: 'portfolio_manager',
  sub_role: 'PM',
  reports_to: 'ex',
  is_active: true,
};
const jpm = { ...pm, id: 'jpm', user_id: 'u-jpm', sub_role: 'Junior PM' };
const an = {
  id: 'an',
  user_id: 'u-an',
  org_id: ORG,
  role: 'analyst',
  sub_role: 'Analyst',
  reports_to: 'pm',
  is_active: true,
  display_name: 'Test Analyst',
};
const other = { ...an, id: 'an2', user_id: 'u-an2', reports_to: 'someone-else' };

const ok = (r) => assert.equal(r.ok, true, r.error);
const refused = (r, status) => {
  assert.equal(r.ok, false);
  assert.equal(r.status, status, r.error);
};

test('the page lists exactly the rights the route accepts', () => {
  assert.deepEqual([...RIGHT_KEYS].sort(), [...ASSIGNABLE_PERMISSIONS].sort());
  assert.equal(
    MATRIX_RIGHTS.some((r) => r.key === 'upload_deliverables'),
    false,
  );
});

test('a grantor may grant only rights they hold (finding 1)', () => {
  for (const key of ['view_analytics', 'create_events', 'approve_deliverables']) {
    refused(decideChange({ viewer: pm, target: an, key, action: 'grant' }), 403);
  }
  ok(decideChange({ viewer: pm, target: an, key: 'manage_positions', action: 'grant' }));
  ok(decideChange({ viewer: pm, target: an, key: 'flag_positions', action: 'grant' }));
  /* An extra the grantor holds can be passed on. */
  ok(
    decideChange({
      viewer: pm,
      viewerExtras: ['approve_deliverables'],
      target: an,
      key: 'approve_deliverables',
      action: 'grant',
    }),
  );
  /* Executives hold all eight. */
  ok(decideChange({ viewer: exec, target: pm, key: 'view_analytics', action: 'grant' }));
  ok(decideChange({ viewer: exec, target: pm, key: 'approve_deliverables', action: 'grant' }));
  assert.deepEqual(grantableRights(pm, []), [
    'flag_positions',
    'manage_positions',
    'view_team_analytics',
    'send_to_team',
  ]);
});

test('only direct reports, same council, active, never yourself', () => {
  refused(decideChange({ viewer: pm, target: other, key: 'flag_positions', action: 'grant' }), 403);
  refused(
    decideChange({ viewer: exec, target: exec, key: 'view_analytics', action: 'grant' }),
    403,
  );
  refused(
    decideChange({
      viewer: exec,
      target: { ...pm, id: 'pm-other', user_id: 'u-ex' },
      key: 'view_analytics',
      action: 'grant',
    }),
    403,
  );
  refused(
    decideChange({
      viewer: pm,
      target: { ...an, org_id: 'org-2' },
      key: 'flag_positions',
      action: 'grant',
    }),
    403,
  );
  refused(
    decideChange({
      viewer: pm,
      target: { ...an, is_active: false },
      key: 'flag_positions',
      action: 'grant',
    }),
    403,
  );
  refused(decideChange({ viewer: pm, target: null, key: 'flag_positions', action: 'grant' }), 404);
  refused(
    decideChange({
      viewer: { ...pm, is_active: false },
      target: an,
      key: 'flag_positions',
      action: 'grant',
    }),
    403,
  );
});

test('only role defaults make a grantor; a stored extra never does', () => {
  refused(
    decideChange({
      viewer: { ...an, reports_to: null },
      viewerExtras: ['grant_permissions', 'flag_positions'],
      target: { ...other, reports_to: 'an' },
      key: 'flag_positions',
      action: 'grant',
    }),
    403,
  );
  refused(
    decideChange({
      viewer: jpm,
      target: { ...an, reports_to: 'jpm' },
      key: 'flag_positions',
      action: 'grant',
    }),
    403,
  );
  assert.equal(viewerCanGrant(an, ['grant_permissions']), false);
  assert.equal(viewerCanGrant(pm), true);
  assert.equal(viewerCanGrant(jpm), false);
});

test('defaults, unknown rights and manager-only rights are refused', () => {
  refused(decideChange({ viewer: pm, target: an, key: 'send_to_team', action: 'grant' }), 400);
  refused(decideChange({ viewer: pm, target: an, key: 'manage_members', action: 'grant' }), 400);
  refused(decideChange({ viewer: pm, target: an, key: 'mentor_juniors', action: 'grant' }), 400);
  refused(decideChange({ viewer: pm, target: an, key: 'flag_positions', action: 'toggle' }), 400);
  const junior = { ...an, sub_role: 'Junior Analyst' };
  refused(
    decideChange({ viewer: pm, target: junior, key: 'view_team_analytics', action: 'grant' }),
    400,
  );
  /* Revoking an extra the grantor could not give (a former manager's) is allowed. */
  ok(decideChange({ viewer: pm, target: an, key: 'view_analytics', action: 'revoke' }));
});

test('manage positions is a role default for executives and portfolio managers', () => {
  assert.ok(roleDefaults(pm).includes('manage_positions'));
  assert.ok(roleDefaults(exec).includes('manage_positions'));
  assert.equal(roleDefaults(an).includes('manage_positions'), false);
  /* Readers elsewhere are unchanged. */
  assert.equal(canFlagPositions(an), false);
  assert.equal(canFlagPositions(an, ['flag_positions']), true);
  assert.ok(getMemberPermissions(pm).includes('grant_permissions'));
});

test('cell states: five for a grantor, text for each', () => {
  const g = grantableRights(pm, []);
  const member = { ...an, defaults: roleDefaults(an), extras: [{ key: 'flag_positions' }] };
  const junior = {
    ...an,
    sub_role: 'Junior Analyst',
    defaults: roleDefaults({ ...an, sub_role: 'Junior Analyst' }),
    extras: [],
  };
  const st = (m, key, canGrant = true) => cellState({ member: m, key, canGrant, grantable: g });
  assert.equal(st(member, 'send_to_team'), 'default');
  assert.equal(st(member, 'flag_positions'), 'extra');
  assert.equal(st(member, 'manage_positions'), 'grant');
  assert.equal(st(member, 'view_analytics'), 'cannot');
  assert.equal(st(junior, 'view_team_analytics'), 'needs_manager');
  assert.equal(st(member, 'manage_positions', false), 'none');
});

test('a raw role key never shows as a title', () => {
  assert.equal(
    roleLabel({ role: 'portfolio_manager', sub_role: null, title: '' }),
    'Portfolio manager',
  );
  assert.equal(roleLabel({ role: 'analyst', sub_role: 'Quantitative Analyst' }), 'Quant analyst');
  assert.equal(roleLabel({ role: 'executive', title: ' Treasurer ' }), 'Treasurer');
});

const seed = () => ({
  org_members: [
    { ...exec, display_name: 'Exec One' },
    { ...pm, display_name: 'Pm One' },
    an,
    { ...other, display_name: 'Other Analyst' },
  ],
  org_member_permissions: [
    {
      org_member_id: 'an',
      permission_key: 'flag_positions',
      granted_by: 'pm',
      granted_at: '2026-10-01T00:00:00Z',
    },
    {
      org_member_id: 'an',
      permission_key: 'view_analytics',
      granted_by: 'ex',
      granted_at: '2026-09-01T00:00:00Z',
    },
    {
      org_member_id: 'pm',
      permission_key: 'grant_permissions',
      granted_by: 'ex',
      granted_at: null,
    },
  ],
});

test('server check reads the database, not the page', async () => {
  const db = createMockSupabase({ seed: seed() });
  refused(
    await checkGrantChange(db, pm, {
      memberId: 'an',
      permissionKey: 'view_analytics',
      action: 'grant',
    }),
    403,
  );
  ok(
    await checkGrantChange(db, pm, {
      memberId: 'an',
      permissionKey: 'manage_positions',
      action: 'grant',
    }),
  );
  ok(
    await checkGrantChange(db, pm, {
      memberId: 'an',
      permissionKey: 'view_analytics',
      action: 'revoke',
    }),
  );
  refused(
    await checkGrantChange(db, pm, {
      memberId: 'an2',
      permissionKey: 'flag_positions',
      action: 'grant',
    }),
    403,
  );
  refused(
    await checkGrantChange(db, exec, {
      memberId: 'ex',
      permissionKey: 'view_analytics',
      action: 'grant',
    }),
    403,
  );
  refused(
    await checkGrantChange(db, pm, {
      memberId: 'nobody',
      permissionKey: 'flag_positions',
      action: 'grant',
    }),
    404,
  );
});

test('matrix payload: reports, extras with grantor names, review list', async () => {
  const db = createMockSupabase({ seed: seed() });
  const p = await loadPermissionsMatrix(db, { ...pm, display_name: 'Pm One' });
  assert.equal(p.viewer.canGrant, true);
  assert.equal(p.reports.length, 1);
  const r = p.reports[0];
  assert.equal(r.roleLabel, 'Analyst');
  assert.deepEqual(r.extras.map((e) => e.key).sort(), ['flag_positions', 'view_analytics']);
  assert.equal(r.extras.find((e) => e.key === 'view_analytics').grantedByName, 'Exec One');
  const review = reviewItems(p.reports, p.viewer.id);
  assert.equal(review.length, 1);
  assert.deepEqual(review[0].reasons, ['other']);
  /* The grant_permissions extra is not one of the eight and is ignored. */
  assert.equal(
    p.viewer.rights.every((x) => RIGHT_KEYS.includes(x.key)),
    true,
  );
});

test('sample: same council, reporting lines by team, flagged, all five states', () => {
  const now = Date.UTC(2026, 10, 16);
  const seen = new Set();
  for (const role of ['executive', 'portfolio_manager', 'analyst']) {
    const s = buildPermissionsSample({
      userId: 'u',
      memberId: 'me',
      role,
      displayName: 'Tester',
      now,
    });
    assert.equal(s.is_demo, true);
    assert.ok(s.payloads[s.initial]);
    for (const v of s.views) {
      const p = s.payloads[v.key];
      assert.equal(p.is_demo, true);
      for (const m of p.reports) {
        for (const r of MATRIX_RIGHTS) {
          seen.add(
            cellState({
              member: m,
              key: r.key,
              canGrant: p.viewer.canGrant,
              grantable: p.viewer.grantable,
            }),
          );
        }
      }
    }
    const ingrid = s.payloads['sample-member-005'];
    assert.deepEqual(
      ingrid.reports.map((m) => m.name),
      ['Mikael Bekele', 'Tomas Alvarez'],
    );
    assert.equal(ingrid.viewer.grantable.includes('view_analytics'), false);
    assert.equal(s.payloads['sample-member-002'].viewer.canGrant, false);
  }
  for (const st of ['default', 'extra', 'grant', 'needs_manager', 'cannot'])
    assert.ok(seen.has(st), st);
});
