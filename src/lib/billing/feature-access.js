/**
 * Server-side plan access (Nov 21, 2026). Resolves who the caller is for
 * gating, and refuses a registry feature below its tier.
 *
 *   const denied = await requireFeature(user, 'quant-lab');
 *   if (denied) return denied;
 *
 * Tier resolution, highest wins:
 *   1. the paid plan (profiles.subscription_*) or an active referral reward,
 *   2. an account trial (an invited account inside its first TRIAL_DAYS with
 *      no subscription yet) counts as Starter, matching the Starter trial
 *      invitees are promised,
 *   3. otherwise Free (0).
 * Org members, active partners and admins pass every retail feature gate:
 * their access is governed by their org or partner scope, not a retail plan.
 *
 * Fails CLOSED: a profile read error refuses with 503, never grants.
 */
import { NextResponse } from 'next/server';
import { getAdminClient, getUserClient } from '@/lib/supabase';
import { getActivePlan, getPlanTier } from '@/lib/subscription';
import { getReferralPlanOverride } from '@/lib/referrals-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isActivePartner } from '@/lib/partner-access';
import { isAdminUser } from '@/lib/admin-helpers';
import { getTrialStatus } from '@/lib/trial';
import { FEATURES, TIER, TIER_NAME } from '@/config/plan-features';

/**
 * An account created by the Advanced trial signup (/auth/start-trial), not
 * through a waitlist invite. Such an account may only start the Advanced
 * trial; Free and Starter stay waitlist-only for it. app_metadata is the
 * trusted marker; user_metadata is also read for accounts created before
 * app_metadata was set (it can only ever restrict, never grant).
 */
export function isTrialSignupAccount(user) {
  return (
    user?.app_metadata?.signup_source === 'advanced_trial' ||
    user?.user_metadata?.signup_source === 'advanced_trial' ||
    user?.user_metadata?.requires_checkout === true
  );
}

/**
 * @returns {Promise<{ ok: true, tier: number, scope: 'retail'|'org'|'partner'|'admin' } | { ok: false }>}
 */
export async function resolvePlanAccess(user, admin = getAdminClient()) {
  if (!user?.id) return { ok: true, tier: TIER.free, scope: 'retail' };
  if (isAdminUser(user)) return { ok: true, tier: TIER.professional, scope: 'admin' };

  const { data: profile, error } = await admin
    .from('profiles')
    .select('subscription_status, subscription_plan, one_time_plan, one_time_plan_purchased_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error) return { ok: false };

  const referralPlan = await getReferralPlanOverride(admin, user.id).catch(() => null);
  let tier = getPlanTier(getActivePlan(profile, referralPlan));

  if (!profile?.subscription_plan && !isTrialSignupAccount(user)) {
    const trial = getTrialStatus(profile, user.created_at);
    if (trial.source === 'account' && trial.isInTrial) tier = Math.max(tier, TIER.starter);
  }

  if (tier < TIER.advanced) {
    const userClient = getUserClient();
    const [member, partner] = await Promise.all([
      getCurrentOrgMember(userClient).catch(() => null),
      isActivePartner(userClient, user).catch(() => false),
    ]);
    if (member) return { ok: true, tier, scope: 'org' };
    if (partner) return { ok: true, tier, scope: 'partner' };
  }
  return { ok: true, tier, scope: 'retail' };
}

/** True when the resolved access may use the feature. */
export function accessAllows(access, featureId) {
  const f = FEATURES[featureId];
  if (!f) return false;
  if (access.scope !== 'retail') return true;
  return access.tier >= f.minTier;
}

/**
 * null when allowed; otherwise a 402 (plan too low) or 503 (could not check).
 */
export async function requireFeature(user, featureId, admin) {
  const access = await resolvePlanAccess(user, admin);
  if (!access.ok) {
    return NextResponse.json(
      { error: 'Plan check unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }
  if (accessAllows(access, featureId)) return null;
  const f = FEATURES[featureId];
  return NextResponse.json(
    {
      error: `${f.label} is part of the ${TIER_NAME[f.minTier]} plan.`,
      code: 'plan_required',
      feature: featureId,
      requiredTier: f.minTier,
      requiredPlan: TIER_NAME[f.minTier],
      currentTier: access.tier,
      upgradeUrl: '/pricing#plans',
    },
    { status: 402 },
  );
}
