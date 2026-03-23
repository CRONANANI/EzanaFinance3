/**
 * Subscription / billing access helpers (reads `profiles` fields updated by Stripe webhooks).
 */

export function hasActiveSubscription(profile) {
  if (!profile) return false;

  if (profile.subscription_status === 'active' || profile.subscription_status === 'trialing') {
    return true;
  }

  if (profile.one_time_plan && profile.one_time_plan_purchased_at) {
    const purchaseDate = new Date(profile.one_time_plan_purchased_at);
    const oneYearLater = new Date(purchaseDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    return new Date() < oneYearLater;
  }

  return false;
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
