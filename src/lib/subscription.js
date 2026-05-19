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

export function getActivePlan(profile) {
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

/** Higher = more features (for gating). */
export function getPlanTier(planKey) {
  const tiers = {
    free: 0,
    personal_monthly: 1,
    individual_annual: 1,
    personal_advanced_monthly: 2,
    personal_advanced_annual: 2,
    family_monthly: 3,
    family_annual: 3,
    professional_monthly: 4,
    professional_annual: 4,
  };
  return tiers[planKey] || 0;
}
