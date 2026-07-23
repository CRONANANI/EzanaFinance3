import { PERMISSION_TIERS, getMemberPermissions } from '@/lib/orgMockData';

/* Permissions that may be toggled per-member as an override. Tier-default
   permissions are shown but a member's OWN role defaults aren't revocable here
   (revoking a role default is a role change, not a permission grant). Only the
   extras below are assignable. Adjust to product intent. */
export const ASSIGNABLE_PERMISSIONS = [
  'flag_positions',
  'manage_positions',
  'upload_deliverables',
  'view_team_analytics',
  'view_analytics',
  'create_events',
  'approve_deliverables',
  'send_to_team',
  'mentor_juniors',
];

const GRANTOR_PERMISSION = 'grant_permissions';

// Referenced so PERMISSION_TIERS stays an explicit dependency of this module —
// getMemberPermissions reads it internally; keeping the import named documents
// that the effective/default permission math is tier-driven.
export const PERMISSION_TIER_KEYS = Object.keys(PERMISSION_TIERS);

/* Does `viewer` hold grant_permissions (via role/sub_role defaults)? */
export function viewerCanGrant(viewer, viewerOverrides = []) {
  return getMemberPermissions(viewer, viewerOverrides).includes(GRANTOR_PERMISSION);
}

/* Is `memberId` a direct report of `viewer`, and may the viewer grant at all? */
export async function canGrantTo(supabase, viewer, memberId) {
  // Viewer's own overrides (needed to confirm grant_permissions if it's an override).
  const { data: myOverrides } = await supabase
    .from('org_member_permissions')
    .select('permission_key')
    .eq('org_member_id', viewer.id);
  if (!viewerCanGrant(viewer, (myOverrides || []).map((r) => r.permission_key))) return false;

  const { data: target } = await supabase
    .from('org_members')
    .select('id, reports_to, org_id')
    .eq('id', memberId)
    .maybeSingle();
  if (!target) return false;
  if (target.org_id !== viewer.org_id) return false; // cross-tenant guard
  return target.reports_to === viewer.id; // direct reports only
}

/* Build the matrix: viewer + direct reports, each with effective permissions
   and which of ASSIGNABLE_PERMISSIONS are currently on. */
export async function loadPermissionsMatrix(supabase, viewer) {
  const orgId = viewer.org_id;

  const { data: reports } = await supabase
    .from('org_members')
    .select('id, display_name, role, sub_role, title, team_id, is_active')
    .eq('org_id', orgId)
    .eq('reports_to', viewer.id)
    .eq('is_active', true)
    .order('display_name');

  const reportIds = (reports || []).map((r) => r.id);
  const overridesByMember = new Map();
  if (reportIds.length) {
    const { data: ov } = await supabase
      .from('org_member_permissions')
      .select('org_member_id, permission_key')
      .in('org_member_id', reportIds);
    for (const row of ov || []) {
      const set = overridesByMember.get(row.org_member_id) || new Set();
      set.add(row.permission_key);
      overridesByMember.set(row.org_member_id, set);
    }
  }

  const canGrant = viewerCanGrant(viewer);

  const rows = (reports || []).map((m) => {
    const overrides = [...(overridesByMember.get(m.id) || [])];
    const effective = getMemberPermissions(m, overrides);
    const defaults = getMemberPermissions(m, []); // tier defaults, no overrides
    return {
      id: m.id,
      name: m.display_name,
      role: m.role,
      subRole: m.sub_role,
      title: m.title,
      teamId: m.team_id,
      permissions: ASSIGNABLE_PERMISSIONS.map((key) => ({
        key,
        on: effective.includes(key),
        isDefault: defaults.includes(key), // a role default → shown locked-on
        overridden: overrides.includes(key),
      })),
    };
  });

  return {
    viewer: { id: viewer.id, name: viewer.display_name, role: viewer.role, canGrant },
    reports: rows,
    assignable: ASSIGNABLE_PERMISSIONS,
  };
}
