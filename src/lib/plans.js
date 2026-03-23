/**
 * Subscription plan metadata + Stripe Price IDs (public env vars).
 * Safe to import from client components — no secret keys.
 */

export const PLANS = {
  free: {
    key: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      'Congressional trade alerts (delayed)',
      'Basic 13F filing access',
      'Community forum access',
      'Weekly market digest',
      'Limited watchlist (5 tickers)',
    ],
  },
  individual_monthly: {
    key: 'individual_monthly',
    name: 'Individual',
    price: 19,
    interval: 'month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_MONTHLY || null,
    features: [
      'Real-time congressional alerts',
      'Full 13F filing database',
      'Legendary investor portfolios',
      'Advanced filtering & search',
      'Unlimited watchlists',
      'Email & push notifications',
      'Priority support',
    ],
  },
  individual_yearly: {
    key: 'individual_yearly',
    name: 'Individual (Annual)',
    price: 182,
    interval: 'year',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_YEARLY || null,
    features: ['Everything in Individual monthly', 'Save 20% vs monthly'],
  },
  family_monthly: {
    key: 'family_monthly',
    name: 'Family',
    price: 39,
    interval: 'month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_MONTHLY || null,
    features: [
      'Everything in Individual',
      'Up to 5 user accounts',
      'Shared watchlists & alerts',
      'Family portfolio dashboard',
      'Consolidated reporting',
      'Dedicated family support',
    ],
  },
  family_yearly: {
    key: 'family_yearly',
    name: 'Family (Annual)',
    price: 374,
    interval: 'year',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_YEARLY || null,
    features: ['Everything in Family monthly', 'Save ~20% vs monthly'],
  },
  professional_monthly: {
    key: 'professional_monthly',
    name: 'Professional',
    price: 99,
    interval: 'month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_MONTHLY || null,
    features: [
      'Everything in Family',
      'API access (100K calls/mo)',
      'Custom data exports',
      'White-label reports',
      'Compliance & audit logs',
      'Dedicated account manager',
    ],
  },
  professional_yearly: {
    key: 'professional_yearly',
    name: 'Professional (Annual)',
    price: 950,
    interval: 'year',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_YEARLY || null,
    features: ['Everything in Professional monthly', 'Save vs monthly'],
  },
};
