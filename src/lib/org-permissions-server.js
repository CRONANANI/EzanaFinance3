import { PERMISSION_TIERS, getMemberPermissions } from '@/lib/org-permissions-config';
import { buildPayload, decideChange, isGrantor } from '@/lib/org-permissions-model';

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

// Referenced so PERMISSION_TIERS stays an explicit dependency of this module:
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

/* Does `viewer` hold grant_permissions? Role defaults only (description rule
   1): a stored extra never makes someone a grantor, so the page's label and
   the change check always agree. The second argument is accepted and ignored
   for older callers. */
// eslint-disable-next-line no-unused-vars
export function viewerCanGrant(viewer, _viewerOverrides = []) {
  return isGrantor(viewer);
}

/* The viewer's own stored extras, with who granted them and when. RLS lets a
   member read their own rows. */
async function loadOwnExtraRows(supabase, memberId) {
  const { data, error } = await supabase
    .from('org_member_permissions')
    .select('permission_key, granted_by, granted_at')
    .eq('org_member_id', memberId);
  if (error) throw error;
  return data || [];
}

/**
 * The server's verdict on one grant or revoke, read fresh from the database
 * as the signed-in member. Whatever the page showed, a change passes only
 * when decideChange (org-permissions-model.js) allows it: the viewer's role
 * can grant, the member reports to the viewer in the org chart, in the same
 * council, is active and is not the viewer, the right is one of the eight,
 * and for a grant the viewer holds the right themselves.
 * @returns {Promise<{ ok: boolean, status?: number, error?: string, target?: object }>}
 */
export async function checkGrantChange(supabase, viewer, { memberId, permissionKey, action }) {
  if (!viewer) return { ok: false, status: 403, error: 'Only council members can do this.' };
  if (!memberId || typeof memberId !== 'string') {
    return { ok: false, status: 400, error: 'Choose a member.' };
  }
  const own = await loadOwnExtraRows(supabase, viewer.id);
  const { data: target } = await supabase
    .from('org_members')
    .select('*')
    .eq('id', memberId)
    .maybeSingle();
  const verdict = decideChange({
    viewer,
    viewerExtras: own.map((r) => r.permission_key),
    target: target || null,
    key: permissionKey,
    action,
  });
  return verdict.ok ? { ok: true, target } : verdict;
}

/* Back-compatible yes or no for a grant: may `viewer` change `memberId` at
   all (role can grant, direct report, same council, not self, active)? */
export async function canGrantTo(supabase, viewer, memberId) {
  const res = await checkGrantChange(supabase, viewer, {
    memberId,
    permissionKey: 'flag_positions',
    action: 'revoke',
  });
  return res.ok;
}

/* Build the page payload: the viewer (their rights and what they may grant)
   and each active direct report in the org chart, with role defaults and
   stored extras (who granted each, and when). Read as the signed-in member;
   RLS decides which rows come back. */
export async function loadPermissionsMatrix(supabase, viewer) {
  const orgId = viewer.org_id;

  const [{ data: reports, error: repErr }, viewerExtraRows] = await Promise.all([
    supabase
      .from('org_members')
      .select('*')
      .eq('org_id', orgId)
      .eq('reports_to', viewer.id)
      .eq('is_active', true)
      .order('display_name'),
    loadOwnExtraRows(supabase, viewer.id),
  ]);
  if (repErr) throw repErr;

  const reportIds = (reports || []).map((r) => r.id).filter((id) => id !== viewer.id);
  let extraRows = [];
  if (reportIds.length) {
    const { data: ov, error } = await supabase
      .from('org_member_permissions')
      .select('org_member_id, permission_key, granted_by, granted_at')
      .in('org_member_id', reportIds);
    if (error) throw error;
    extraRows = ov || [];
  }

  /* Names of the people who granted extras (often the viewer). */
  const names = new Map([[viewer.id, viewer.display_name || null]]);
  for (const m of reports || []) names.set(m.id, m.display_name || null);
  const missing = [
    ...new Set(
      [...extraRows, ...viewerExtraRows]
        .map((r) => r.granted_by)
        .filter((id) => id && !names.has(id)),
    ),
  ];
  if (missing.length) {
    const { data: grantors } = await supabase
      .from('org_members')
      .select('id, display_name')
      .eq('org_id', orgId)
      .in('id', missing);
    for (const g of grantors || []) names.set(g.id, g.display_name || null);
  }

  return {
    ...buildPayload({ viewer, viewerExtraRows, reports: reports || [], extraRows, names }),
    assignable: ASSIGNABLE_PERMISSIONS,
  };
}
