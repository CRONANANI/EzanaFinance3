import { canonicalTierOfPlanKey } from '@/config/plan-features';

/**
 * Subscription / billing access helpers (reads `profiles` fields updated by Stripe webhooks).
 */

export function hasActiveSubscription(profile) {
  if (!profile) return false;

  const status = profile.subscription_status;

  // Paid active or trialing
  if (status === 'active' || status === 'trialing') return true;

  // Free plan
  if (status === 'free') return true;

  // One-time purchase (legacy)
  if (profile.one_time_plan && profile.one_time_plan_purchased_at) {
    const purchased = new Date(profile.one_time_plan_purchased_at);
    const expiresAt = new Date(purchased);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    return new Date() < expiresAt;
  }

  return false;
}

export function isInTrial(profile) {
  return profile?.subscription_status === 'trialing';
}

export function isFreePlan(profile) {
  return profile?.subscription_status === 'free' || profile?.subscription_plan === 'free';
}

/**
 * The user's effective plan key.
 * @param {object} profile  profiles row (subscription_* fields)
 * @param {string|null} [referralPlan]  an active referral reward's plan
 *   (getReferralPlanOverride in referrals-server.js). It applies when it is a
 *   higher tier than what the user pays for, so a reward works with or
 *   without a Stripe subscription.
 */
export function getActivePlan(profile, referralPlan = null) {
  const paid = getPaidPlan(profile);
  if (referralPlan && getPlanTier(referralPlan) > getPlanTier(paid)) return referralPlan;
  return paid;
}

function getPaidPlan(profile) {
  if (!profile) return null;

  const status = profile.subscription_status;

  if (
    (status === 'active' || status === 'trialing' || status === 'free') &&
    profile.subscription_plan
  ) {
    return profile.subscription_plan;
  }

  if (profile.one_time_plan && hasActiveSubscription(profile)) {
    return profile.one_time_plan;
  }

  return null;
}

/**
 * Higher = more features (for gating). Nov 21, 2026: read from the plan
 * registry (src/config/plan-features.js), which keeps every plan key ever
 * sold, so the quarterly keys (and any key added later) map to their tier
 * in one place instead of a list that can drift.
 */
export function getPlanTier(planKey) {
  return canonicalTierOfPlanKey(planKey);
}
