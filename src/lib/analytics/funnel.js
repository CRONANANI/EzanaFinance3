/**
 * Pricing and Advanced-trial funnel events (Nov 21, 2026). Shared rules for
 * the client helper and the server writer. Privacy: an event carries only its
 * name and a few enumerated fields (plan, billing, goal). Never research
 * queries, portfolio contents, emails or IPs.
 */
export const FUNNEL_EVENTS = new Set([
  'pricing_view',
  'billing_toggle',
  'plan_cta',
  'trial_signup_started',
  'checkout_started',
  'trial_confirmed',
  'onboarding_goal',
  'onboarding_skip',
]);
/* Events a browser may send; the rest are written by the server itself. */
export const CLIENT_FUNNEL_EVENTS = new Set([
  'pricing_view',
  'billing_toggle',
  'plan_cta',
  'trial_signup_started',
  'onboarding_goal',
  'onboarding_skip',
]);
const PLANS = new Set(['free', 'starter', 'advanced', 'family', 'enterprise']);
const BILLINGS = new Set(['quarterly', 'yearly']);
const GOALS = new Set(['research', 'money', 'quant']);

/** Keeps only known values; anything else becomes null. */
export function cleanFunnelFields({ plan, billing, goal } = {}) {
  return {
    plan: PLANS.has(plan) ? plan : null,
    billing: BILLINGS.has(billing) ? billing : null,
    goal: GOALS.has(goal) ? goal : null,
  };
}

/**
 * Server write (service role). Never throws: analytics must not break a
 * checkout or a webhook. A missing table (migration not applied) is logged once.
 */
let warned = false;
export async function logFunnelEvent(
  admin,
  event,
  fields = {},
  { userId = null, anonId = null } = {},
) {
  if (!admin || !FUNNEL_EVENTS.has(event)) return;
  try {
    const { error } = await admin.from('funnel_events').insert({
      event,
      ...cleanFunnelFields(fields),
      user_id: userId,
      anon_id: typeof anonId === 'string' ? anonId.slice(0, 64) : null,
    });
    if (error && !warned) {
      warned = true;
      console.error('[funnel] write failed (apply the funnel_events migration):', error.message);
    }
  } catch {
    /* analytics never breaks the caller */
  }
}
