/**
 * The Stripe price id for a catalog plan (Nov 21, 2026). Server-only.
 *
 * A plan's price id comes from its NEXT_PUBLIC_STRIPE_PRICE_* env var
 * (src/config/pricing.js). When that is not set, the price is looked up in
 * Stripe by lookup key, which is the plan key itself
 * (personal_advanced_quarterly, family_quarterly, ...). A price created in
 * Stripe with that lookup key therefore works without a redeploy.
 *
 * Read-only: nothing is created here. Found ids are memoised per instance.
 */
import { PLANS } from '@/config/pricing';

const memo = new Map();

const isPriceId = (v) => typeof v === 'string' && v.startsWith('price_');

/**
 * @returns {Promise<string|null>} the price id, or null when the plan has none
 */
export async function resolvePriceId(stripe, planKey) {
  const plan = PLANS[planKey];
  if (!plan || plan.price === 0) return null;
  if (isPriceId(plan.priceId)) return plan.priceId;
  if (memo.has(planKey)) return memo.get(planKey);
  if (!stripe) return null;
  try {
    const { data } = await stripe.prices.list({
      lookup_keys: [planKey],
      active: true,
      limit: 1,
    });
    const id = data?.[0]?.id || null;
    if (id) memo.set(planKey, id);
    return id;
  } catch (e) {
    console.error(`[billing] price lookup failed for ${planKey}:`, e?.message);
    return null;
  }
}

/** The catalog plan key for a Stripe price that carries one as its lookup key. */
export function planKeyFromLookupKey(lookupKey) {
  return lookupKey && PLANS[lookupKey] ? lookupKey : null;
}
