/**
 * Stripe plan catalog — replace `price_REPLACE_WITH_ACTUAL_ID` with real Price IDs
 * from Stripe Dashboard → Products → Price (price_xxx).
 */

const F = {
  personal: [
    'Congressional trade alerts (24hr delay)',
    'Basic 13F filing access',
    'Community forum access',
    'Weekly market digest',
    'Watchlist (up to 10 tickers)',
    'Ezana Echo access',
    'Email notifications',
  ],
  personalAdvanced: [
    'Everything in Personal',
    'Real-time congressional alerts',
    'Full 13F filing database',
    'Legendary investor portfolios',
    'Advanced filtering & search',
    'Unlimited watchlists',
    'AI-powered company research',
    'API access (10K calls/mo)',
    'Priority support',
  ],
  family: [
    'Everything in Personal Advanced',
    'Up to 5 user accounts',
    'Shared watchlists & alerts',
    'Family portfolio dashboard',
    'Consolidated reporting',
    'Joint investment tracking',
    'API access on main account (25K calls/mo)',
    'Dedicated family support',
  ],
  professional: [
    'Everything in Family',
    'Unlimited user accounts',
    'API access (100K calls/mo)',
    'Custom data exports & white-label reports',
    'Compliance & audit logs',
    'Team management & role-based access',
    'Copy trading infrastructure',
    'Dedicated account manager',
    'SLA guarantees',
    'Institutional-grade data feeds',
    'Direct support channel',
  ],
};

export const PLANS = {
  personal_monthly: {
    name: 'Personal Monthly',
    price: 5,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PERSONAL_MONTHLY || 'price_REPLACE_WITH_ACTUAL_ID',
    interval: 'month',
    mode: 'subscription',
    features: F.personal,
  },
  personal_advanced_monthly: {
    name: 'Personal Advanced Monthly',
    price: 19,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PERSONAL_ADVANCED_MONTHLY || 'price_REPLACE_WITH_ACTUAL_ID',
    interval: 'month',
    mode: 'subscription',
    features: F.personalAdvanced,
  },
  family_monthly: {
    name: 'Family Monthly',
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_MONTHLY || 'price_REPLACE_WITH_ACTUAL_ID',
    interval: 'month',
    mode: 'subscription',
    features: F.family,
  },
  professional_monthly: {
    name: 'Professional Monthly',
    price: 119,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_REPLACE_WITH_ACTUAL_ID',
    interval: 'month',
    mode: 'subscription',
    features: F.professional,
  },
  individual_annual: {
    name: 'Individual Annual',
    price: 48,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_ANNUAL || 'price_REPLACE_WITH_ACTUAL_ID',
    interval: 'year',
    mode: 'payment',
    features: ['Everything in Personal Monthly', 'Billed annually (one-time)'],
  },
  personal_advanced_annual: {
    name: 'Personal Advanced Annual',
    price: 180,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PERSONAL_ADVANCED_ANNUAL || 'price_REPLACE_WITH_ACTUAL_ID',
    interval: 'year',
    mode: 'payment',
    features: ['Everything in Personal Advanced Monthly', 'Billed annually (one-time)'],
  },
  family_annual: {
    name: 'Family Annual',
    price: 468,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_ANNUAL || 'price_REPLACE_WITH_ACTUAL_ID',
    interval: 'year',
    mode: 'payment',
    features: ['Everything in Family Monthly', 'Billed annually (one-time)'],
  },
  professional_annual: {
    name: 'Professional Annual',
    price: 1140,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_ANNUAL || 'price_REPLACE_WITH_ACTUAL_ID',
    interval: 'year',
    mode: 'payment',
    features: ['Everything in Professional Monthly', 'Billed annually (one-time)'],
  },
};

export function getPlanByPriceId(priceId) {
  if (!priceId) return undefined;
  return Object.values(PLANS).find((plan) => plan.priceId === priceId);
}

export function getPlanKeyByPriceId(priceId) {
  if (!priceId) return undefined;
  const entry = Object.entries(PLANS).find(([, plan]) => plan.priceId === priceId);
  return entry?.[0];
}
