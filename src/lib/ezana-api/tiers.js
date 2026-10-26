/**
 * Ezana API tiers: the single source for limits, delay and scopes. The
 * /ezana-api tier cards and rate-limit copy render from this, so the docs
 * cannot drift from what the router enforces. Pure, client-safe.
 */

/** Every scope a live endpoint can require (see registry.js). */
export const ALL_SCOPES = [
  'congress',
  'committees',
  'lobbying',
  'fec',
  'contracts',
  'predictions',
  'institutional',
  'insider',
  'exec-comp',
  'etf',
  'eyes',
  'macro',
  'sanctions',
  'cross',
];

/* The tier split below is a proposal for Axum to confirm. Public-domain
   series (Eyes Above, macro, sanctions) are open to Developer keys; the
   SEC-derived Titans sets and the cross-dimensional joins are paid tiers. */
const DEVELOPER_SCOPES = [
  'congress',
  'lobbying',
  'fec',
  'contracts',
  'predictions',
  'eyes',
  'macro',
  'sanctions',
];
const TRADER_SCOPES = [...DEVELOPER_SCOPES, 'committees', 'exec-comp', 'etf'];

export const TIERS = {
  developer: {
    id: 'developer',
    name: 'Developer',
    price: 'Free',
    detail: 'Self-serve evaluation key',
    ratePerMin: 60,
    delayDays: 30,
    scopes: DEVELOPER_SCOPES,
    selfServe: true,
    features: [
      '60 requests / min',
      'Data delayed 30 days',
      'Congress, lobbying, FEC, contracts, prediction markets',
      'Patents, supply chain, real estate, macro and sanctions',
      'Community support',
    ],
  },
  trader: {
    id: 'trader',
    name: 'Trader',
    price: 'Lease',
    detail: 'Per-seat monthly',
    ratePerMin: 600,
    delayDays: 0,
    scopes: TRADER_SCOPES,
    features: [
      '600 requests / min',
      'No delay',
      'Everything in Developer, plus committees, executive pay and ETF holdings',
      'Email support',
    ],
  },
  quant_firm: {
    id: 'quant_firm',
    name: 'Quant Firm',
    price: 'Scale',
    detail: 'Systematic desks',
    ratePerMin: 1500,
    delayDays: 0,
    scopes: ALL_SCOPES,
    highlight: true,
    features: [
      '1,500 requests / min',
      'No delay',
      'Every live dataset, including 13F, insider trades and cross-dimensional signals',
      'Priority support',
    ],
  },
  institution: {
    id: 'institution',
    name: 'Institution',
    price: 'Custom',
    detail: 'Volume + SLA',
    ratePerMin: null, // set per key on approval
    delayDays: 0,
    scopes: ALL_SCOPES,
    features: ['Custom rate limits', 'No delay', 'Every live dataset', 'Dedicated support + SLA'],
  },
};

export const TIER_ORDER = ['developer', 'trader', 'quant_firm', 'institution'];

/** Default tier for an access-request role value. */
export function tierForRole(role) {
  return TIERS[role] ? role : 'developer';
}

/** Max self-serve Developer keys per account. */
export const SELF_SERVE_KEY_LIMIT = 2;
