/**
 * Sonar research engine: who is asking and what they may research
 * (Sections 7.2 and 11). Mirrors /api/sonar/query's resolution exactly, so
 * no plan restriction is bypassed: plan tier x version -> entitlements ->
 * the datasets the planner may use and the deepest research allowed.
 *
 * Guests get the free-tier entitlements and quick research.
 */
import { withTimeout } from '@/lib/with-timeout';
import { getAuthUser, getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isActivePartner } from '@/lib/partner-access';
import { getActivePlan, getPlanTier } from '@/lib/subscription';
import { getReferralPlanOverride } from '@/lib/referrals-server';
import { getSonarEntitlements } from '@/lib/sonar/entitlements';

const DEPTH_ORDER = ['quick', 'standard', 'deep'];
const DEPTH_OF = { summary: 'quick', standard: 'standard', deep: 'deep' };

/** The requested depth, never deeper than the plan allows. */
export function clampDepth(requested, allowed) {
  const r = DEPTH_ORDER.indexOf(requested);
  const a = DEPTH_ORDER.indexOf(allowed);
  if (r < 0) return allowed;
  return DEPTH_ORDER[Math.min(r, a)];
}

export async function resolveResearchAccess(request, admin, { authMs = 1500 } = {}) {
  const auth = await withTimeout(getAuthUser(request), authMs, 'auth');
  const user = auth.ok ? auth.value || null : null;
  if (!user) {
    /* Guests: free-tier datasets, no deep research (it needs an account). */
    const entitlements = {
      ...getSonarEntitlements({ planTier: 0, version: 'regular' }),
      deepRunsPerDay: 0,
      researchModes: ['quick', 'standard'],
    };
    return {
      user: null,
      entitlements,
      maxDepth: 'quick',
      scope: { userId: null, orgId: null },
      planTier: 0,
      version: 'guest',
    };
  }
  const userClient = getUserClient();
  const [{ data: profile }, member, isPartner, referralPlan] = await Promise.all([
    admin
      .from('profiles')
      .select('subscription_plan, subscription_status, one_time_plan')
      .eq('id', user.id)
      .maybeSingle(),
    getCurrentOrgMember(userClient).catch(() => null),
    isActivePartner(userClient, user).catch(() => false),
    getReferralPlanOverride(admin, user.id),
  ]);
  const planTier = getPlanTier(getActivePlan(profile, referralPlan));
  const version = member ? 'org' : isPartner ? 'partner' : 'regular';
  const entitlements = getSonarEntitlements({
    planTier,
    version,
    isPartner,
    orgRole: member?.role || null,
  });
  return {
    user,
    entitlements,
    maxDepth: DEPTH_OF[entitlements.depth] || 'quick',
    scope: { userId: user.id, orgId: member?.org_id || null },
    planTier,
    version,
  };
}
