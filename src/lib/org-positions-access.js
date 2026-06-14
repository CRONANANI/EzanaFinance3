// src/lib/org-positions-access.js
//
// Server-side access helpers for the org_positions API routes. Every write path
// (manual, CSV, brokerage import, soft-archive) re-verifies the caller has the
// `manage_positions` permission here — hiding the button in the UI is never
// enough. All checks run against the service-role client so RLS can't mask a
// missing membership row.

const MANAGE_POSITIONS_ROLES = new Set(['executive', 'portfolio_manager']);

/**
 * Resolve the active org_members row for an authenticated user id using a
 * service-role client. Returns null when the user is not an active org member.
 *
 * We key off the user id that withApiGuard already authenticated (which accepts
 * both Bearer tokens and cookies) rather than re-reading auth from a cookie-only
 * client, so the client forms that send `Authorization: Bearer …` resolve too.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 */
export async function getOrgMemberByUserId(admin, userId) {
  if (!userId) return null;
  const { data, error } = await admin
    .from('org_members')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * True when the member may add/remove positions: executives and portfolio
 * managers by role, or anyone (e.g. an analyst) granted the `manage_positions`
 * override in org_member_permissions.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ id?: string, role?: string } | null} member
 */
export async function canManagePositionsServer(admin, member) {
  if (!member) return false;
  if (MANAGE_POSITIONS_ROLES.has(member.role)) return true;
  const { data } = await admin
    .from('org_member_permissions')
    .select('permission_key')
    .eq('org_member_id', member.id);
  return (data || []).some((p) => p.permission_key === 'manage_positions');
}

/**
 * Validate that a team id (when provided) belongs to the caller's org. Returns
 * the team id when valid, null when no team was supplied, or throws-shaped
 * `{ invalid: true }` when the team is not in this org.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} orgId
 * @param {string | null | undefined} teamId
 */
export async function resolveTeamForOrg(admin, orgId, teamId) {
  if (!teamId) return { teamId: null };
  const { data } = await admin
    .from('org_teams')
    .select('id')
    .eq('id', teamId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (!data) return { invalid: true };
  return { teamId: data.id };
}
