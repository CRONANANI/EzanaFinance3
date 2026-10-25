/**
 * Access rules for org notification preferences (/api/org/notification-prefs).
 *
 * The target member defaults to the CALLER's own membership (QA ORG-10): the
 * settings panel never sends an id, so a missing `member_id` /
 * `target_member_id` means "my own prefs" rather than a 400. Supervisors may
 * also read/write a direct subordinate's prefs (exec -> PM, PM -> analyst on
 * the same team), mirroring the RLS "supervisors ... subordinate notif prefs"
 * policies. Multi-org safe: the caller's membership is resolved in the
 * target's org.
 */
import { getOrgMemberForUser } from '@/lib/org-trading-server';

const MEMBER_COLS = 'id, role, team_id, org_id';

/**
 * @param supabase caller-bound client
 * @param {string} callerUserId
 * @param {string|null|undefined} targetMemberId omitted = the caller's own membership
 * @returns {Promise<{ ok: boolean, caller?: object, target?: object, isSelf?: boolean }>}
 */
export async function resolvePrefsAccess(supabase, callerUserId, targetMemberId) {
  if (!callerUserId) return { ok: false };

  if (!targetMemberId) {
    const caller = await getOrgMemberForUser(supabase, callerUserId, { select: MEMBER_COLS });
    if (!caller) return { ok: false };
    return { ok: true, caller, target: caller, isSelf: true };
  }

  const { data: target } = await supabase
    .from('org_members')
    .select(MEMBER_COLS)
    .eq('id', targetMemberId)
    .eq('is_active', true)
    .maybeSingle();
  if (!target) return { ok: false };

  const caller = await getOrgMemberForUser(supabase, callerUserId, {
    preferredOrgId: target.org_id,
    select: MEMBER_COLS,
  });
  if (!caller || caller.org_id !== target.org_id) return { ok: false };
  if (caller.id === target.id) return { ok: true, caller, target, isSelf: true };

  const downScope =
    (caller.role === 'executive' && target.role === 'portfolio_manager') ||
    (caller.role === 'portfolio_manager' &&
      target.role === 'analyst' &&
      caller.team_id === target.team_id);
  return downScope ? { ok: true, caller, target, isSelf: false } : { ok: false };
}
