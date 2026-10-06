/**
 * Retail plans sold in the iOS and Android apps through the App Store and
 * Google Play (RevenueCat). Exactly the retail plans the web sells
 * (src/config/pricing.js); no plan or price is invented here, and store prices
 * are never hard-coded: the purchase screen shows the localised price the
 * store SDK returns. University and organisation plans are sold to
 * institutions under contract and are not offered in the apps.
 *
 * Each tier maps to one RevenueCat entitlement and two store products,
 * world.ezana.app.<tier>.monthly and world.ezana.app.<tier>.annual, which
 * Noah creates in App Store Connect and Google Play. `planKey` is what the
 * Stripe webhook already writes to profiles.subscription_plan for the same
 * plan and period, so the rest of the app reads one value whatever the store.
 */
import { PLANS } from '@/config/pricing';

export const APP_PRODUCT_PREFIX = 'world.ezana.app';

export const APP_PLANS = [
  {
    tier: 'personal',
    entitlement: 'personal',
    name: PLANS.personal_monthly.name,
    features: PLANS.personal_monthly.features,
    planKey: { monthly: 'personal_monthly', annual: 'individual_annual' },
  },
  {
    tier: 'personal_advanced',
    entitlement: 'personal_advanced',
    name: PLANS.personal_advanced_monthly.name,
    features: PLANS.personal_advanced_monthly.features,
    planKey: { monthly: 'personal_advanced_monthly', annual: 'personal_advanced_annual' },
  },
  {
    tier: 'family',
    entitlement: 'family',
    name: PLANS.family_monthly.name,
    features: PLANS.family_monthly.features,
    planKey: { monthly: 'family_monthly', annual: 'family_annual' },
  },
  {
    tier: 'professional',
    entitlement: 'professional',
    name: PLANS.professional_monthly.name,
    features: PLANS.professional_monthly.features,
    planKey: { monthly: 'professional_monthly', annual: 'professional_annual' },
  },
];

export const productId = (tier, period) => `${APP_PRODUCT_PREFIX}.${tier}.${period}`;

/** Every store product id the apps sell. */
export const APP_PRODUCT_IDS = APP_PLANS.flatMap((p) => [
  productId(p.tier, 'monthly'),
  productId(p.tier, 'annual'),
]);

/**
 * Store product id -> { tier, period, planKey, entitlement } or null.
 * Google Play ids can carry a base plan suffix ("…monthly:base"), ignored.
 */
export function planForProduct(product) {
  const id = String(product || '').split(':')[0];
  const m = new RegExp(
    `^${APP_PRODUCT_PREFIX.replace(/\./g, '\\.')}\\.([a-z_]+)\\.(monthly|annual)$`,
  ).exec(id);
  if (!m) return null;
  const plan = APP_PLANS.find((p) => p.tier === m[1]);
  if (!plan) return null;
  return {
    tier: plan.tier,
    period: m[2],
    planKey: plan.planKey[m[2]],
    entitlement: plan.entitlement,
  };
}
