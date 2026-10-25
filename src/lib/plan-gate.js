/* The pure decision behind requirePlan (QA RET-1); no server imports, so it
   is unit-tested under plain node. */
import { getActivePlan, getPlanTier } from './subscription';

export function planTierOf(profile) {
  const plan = getActivePlan(profile);
  return plan ? getPlanTier(plan) : -1;
}

/** Pure decision: null when allowed, else { status, body }. */
export function planDecision(profile, { minTier = 1 } = {}) {
  const tier = planTierOf(profile);
  if (tier >= minTier) return null;
  return {
    status: 402,
    body: {
      error: 'This feature needs a higher plan.',
      code: 'plan_required',
      requiredTier: minTier,
      currentTier: tier,
    },
  };
}
