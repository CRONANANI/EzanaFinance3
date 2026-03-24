const TRIAL_DAYS = 7;

/**
 * Check if user is still within their free trial period.
 * @param {string} createdAt - The user's account creation timestamp (ISO string)
 * @returns {{ isInTrial: boolean, daysRemaining: number, trialExpired: boolean, trialEndDate: string }}
 */
export function getTrialStatus(createdAt) {
  if (!createdAt) return { isInTrial: false, daysRemaining: 0, trialExpired: true, trialEndDate: null };

  const created = new Date(createdAt);
  const now = new Date();
  const trialEnd = new Date(created);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  const msRemaining = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return {
    isInTrial: msRemaining > 0,
    daysRemaining,
    trialExpired: msRemaining <= 0,
    trialEndDate: trialEnd.toISOString(),
  };
}
