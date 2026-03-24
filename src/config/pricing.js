/**
 * Stripe plan catalog — Price IDs from NEXT_PUBLIC_STRIPE_PRICE_* in `.env.local`.
 * Injected at build time for client bundles; ensure all vars are set before `next build`.
 */

export const PLANS = {
  personal_monthly: {
    name: 'Personal',
    description: 'For casual investors',
    price: 5,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PERSONAL_MONTHLY,
    interval: 'month',
    mode: 'subscription',
    features: ['Basic market data', 'Watchlist', 'Daily newsletter'],
  },
  personal_advanced_monthly: {
    name: 'Personal Advanced',
    description: 'For active traders',
    price: 19,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PERSONAL_ADVANCED_MONTHLY,
    interval: 'month',
    mode: 'subscription',
    popular: true,
    features: ['Everything in Personal', 'Advanced analytics', 'Real-time alerts'],
  },
  family_monthly: {
    name: 'Family',
    description: 'Households & shared portfolios',
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_MONTHLY,
    interval: 'month',
    mode: 'subscription',
    features: ['Everything in Personal Advanced', 'Up to 5 family members', 'Shared portfolios'],
  },
  professional_monthly: {
    name: 'Professional',
    description: 'Full-time traders & family offices',
    price: 119,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    interval: 'month',
    mode: 'subscription',
    features: ['Everything in Family', 'API access', 'Priority support', 'Custom reports'],
  },
  individual_annual: {
    name: 'Individual',
    description: 'For casual investors',
    price: 48,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_ANNUAL,
    interval: 'year',
    mode: 'subscription',
    features: ['Basic market data', 'Watchlist', 'Daily newsletter'],
  },
  personal_advanced_annual: {
    name: 'Personal Advanced',
    description: 'For active traders',
    price: 180,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PERSONAL_ADVANCED_ANNUAL,
    interval: 'year',
    mode: 'subscription',
    popular: true,
    features: ['Everything in Personal', 'Advanced analytics', 'Real-time alerts'],
  },
  family_annual: {
    name: 'Family',
    description: 'Households & shared portfolios',
    price: 468,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_ANNUAL,
    interval: 'year',
    mode: 'subscription',
    features: ['Everything in Personal Advanced', 'Up to 5 family members', 'Shared portfolios'],
  },
  professional_annual: {
    name: 'Professional',
    description: 'Full-time traders & family offices',
    price: 1140,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_ANNUAL,
    interval: 'year',
    mode: 'subscription',
    features: ['Everything in Family', 'API access', 'Priority support', 'Custom reports'],
  },
};

/** @returns {[string, (typeof PLANS)[keyof typeof PLANS]] | undefined} */
export function getPlanByPriceId(priceId) {
  if (!priceId) return undefined;
  return Object.entries(PLANS).find(([, plan]) => plan.priceId === priceId);
}

export function getPlanKeyByPriceId(priceId) {
  const entry = getPlanByPriceId(priceId);
  return entry ? entry[0] : null;
}
