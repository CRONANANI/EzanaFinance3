/**
 * Subscription / billing access helpers (reads `profiles` fields updated by Stripe webhooks).
 */

export function hasActiveSubscription(profile) {
  if (!profile) return false;

  if (profile.subscription_status === 'active' || profile.subscription_status === 'trialing') {
    return true;
  }

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

export function getActivePlan(profile) {
  if (!profile) return null;

  if (
    (profile.subscription_status === 'active' || profile.subscription_status === 'trialing') &&
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
