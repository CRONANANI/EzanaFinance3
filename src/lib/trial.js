const ACCOUNT_TRIAL_DAYS = 7;

/**
 * Trial / subscription display state.
 * Prefer Stripe subscription (`trialing` / `active`); if no subscription, fall back to account-age window.
 *
 * @param {object | null} profile - `profiles` row (subscription_status, current_period_end, …)
 * @param {string | undefined} userCreatedAt - auth.users created_at ISO string
 */
export function getTrialStatus(profile, userCreatedAt) {
  if (profile?.subscription_status === 'active') {
    return {
      isInTrial: false,
      trialExpired: false,
      isPaid: true,
      daysRemaining: 0,
      trialEndDate: null,
      source: 'stripe',
    };
  }

  if (profile?.subscription_status === 'trialing' && profile?.current_period_end) {
    const trialEnd = new Date(profile.current_period_end);
    const now = new Date();
    const msRemaining = trialEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    return {
      isInTrial: true,
      trialExpired: false,
      isPaid: false,
      daysRemaining,
      trialEndDate: trialEnd.toISOString(),
      source: 'stripe',
    };
  }

  if (userCreatedAt) {
    const created = new Date(userCreatedAt);
    const now = new Date();
    const trialEnd = new Date(created);
    trialEnd.setDate(trialEnd.getDate() + ACCOUNT_TRIAL_DAYS);
    const msRemaining = trialEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    return {
      isInTrial: msRemaining > 0,
      trialExpired: msRemaining <= 0,
      isPaid: false,
      daysRemaining,
      trialEndDate: trialEnd.toISOString(),
      source: 'account',
    };
  }

  return {
    isInTrial: false,
    trialExpired: true,
    isPaid: false,
    daysRemaining: 0,
    trialEndDate: null,
    source: 'none',
  };
}
