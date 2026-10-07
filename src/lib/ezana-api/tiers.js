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
];

const DEVELOPER_SCOPES = ['congress', 'lobbying', 'fec', 'contracts', 'predictions'];

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
    scopes: [...DEVELOPER_SCOPES, 'committees'],
    features: [
      '600 requests / min',
      'No delay',
      'Everything in Developer, plus committee activity',
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
      'Every live dataset, including 13F, activist, whale moves and insider trades',
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
