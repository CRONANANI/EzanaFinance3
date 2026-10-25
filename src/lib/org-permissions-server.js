import { PERMISSION_TIERS, getMemberPermissions } from '@/lib/org-permissions-config';

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
  // 'mentor_juniors' is intentionally NOT assignable: no route or screen gates
  // on it yet, so granting it would do nothing (QA ORG-7). Re-add it here once
  // a feature actually checks it.
];

const GRANTOR_PERMISSION = 'grant_permissions';

// Referenced so PERMISSION_TIERS stays an explicit dependency of this module —
// getMemberPermissions reads it internally; keeping the import named documents
// that the effective/default permission math is tier-driven.
export const PERMISSION_TIER_KEYS = Object.keys(PERMISSION_TIERS);

/**
 * Per-member permission overrides (org_member_permissions.permission_key[]).
 * Read with the caller's client; RLS lets a member read their own rows.
 */
export async function loadMemberOverrides(supabase, memberId) {
  if (!memberId) return [];
  const { data } = await supabase
    .from('org_member_permissions')
    .select('permission_key')
    .eq('org_member_id', memberId);
  return (data || []).map((r) => r.permission_key);
}

/**
 * Server-side permission gate: does `member` hold ANY of `keys`, from its
 * tier defaults (PERMISSION_TIERS via getMemberPermissions) plus per-member
 * overrides? Pass `overrides` when already loaded to skip the read.
 *
 * Note: this is a NECESSARY check layered on top of each route's existing role
 * check and RLS; a grant cannot widen what RLS allows a role to write.
 *
 * @param supabase caller-bound client
 * @param {{ id: string, role: string, sub_role?: string, is_active?: boolean } | null} member
 * @param {string | string[]} keys
 * @param {string[]} [overrides]
 */
export async function memberHasPermission(supabase, member, keys, overrides) {
  if (!member || member.is_active === false) return false;
  const wanted = Array.isArray(keys) ? keys : [keys];
  const ov = Array.isArray(overrides) ? overrides : await loadMemberOverrides(supabase, member.id);
  const effective = getMemberPermissions(member, ov);
  return wanted.some((k) => effective.includes(k));
}

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
  if (
    !viewerCanGrant(
      viewer,
      (myOverrides || []).map((r) => r.permission_key),
    )
  )
    return false;

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
