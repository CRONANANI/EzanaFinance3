/**
 * Ezana API pricing, the single place the /pricing calculator reads its rates.
 *
 * PROPOSED RATES (Nov 19, 2026): set by product for the calculator launch and
 * not yet wired to Stripe metering. Change them here and the calculator, its
 * hints and its footnotes all follow.
 *
 *   standard: delayed quotes, fundamentals, filings, congressional and 13F
 *             disclosures, Echo and dataset reads
 *   premium:  real-time streams, Sonar research answers, Kairos signals
 *
 * Rates are USD per 1,000 requests. A month is 30 days.
 */
export const API_PRICING = {
  individual: {
    label: 'Individual',
    blurb: 'For Starter, Advanced and Family members building their own tools.',
    includedPerMonth: 10_000,
    standardPer1k: 0.5,
    premiumPer1k: 2,
    maxRequestsPerDay: 50_000,
  },
  enterprise: {
    label: 'Enterprise',
    blurb: 'For teams, RIAs and institutions. Volume rates, an annual commitment and SLAs.',
    platformFee: 499,
    includedPerMonth: 1_000_000,
    standardPer1k: 0.3,
    premiumPer1k: 1.2,
    maxRequestsPerDay: 2_000_000,
  },
};

export const API_DAYS_PER_MONTH = 30;
