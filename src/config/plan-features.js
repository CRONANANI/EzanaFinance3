/**
 * Ezana plan and feature registry (Nov 21, 2026). The one place that says
 * which retail plan gets what. It feeds:
 *
 *   - the /pricing cards and comparison table (src/app/pricing/page.js),
 *   - the in-app plan picker (/select-plan),
 *   - server-side feature gates (src/lib/billing/feature-access.js),
 *   - the watchlist cap (/api/watchlists),
 *   - plan tiers for billing and gating (canonicalTierOfPlanKey, used by
 *     getPlanTier in src/lib/subscription.js).
 *
 * Sonar quotas are not restated here: they are read from the Sonar
 * entitlement matrix (src/lib/sonar/entitlements.js), which the Sonar routes
 * enforce. Pure module (no server imports), so client and server share it.
 *
 * Honesty rules (docs/pricing/PRICING_AUDIT_2026-11.md): a feature is listed
 * only when it works today on real data. `enforcement: 'server'` means an API
 * refuses the feature below `minTier`; 'open' means the feature is available
 * to every account and is listed as such. Planned and sample-data features
 * are in EXCLUDED_FEATURES and never appear as plan inclusions.
 */
import { getSonarEntitlements, SONAR_DATASETS } from '@/lib/sonar/entitlements';

/* ── Tiers ─────────────────────────────────────────────────────────────── */

export const TIER = { free: 0, starter: 1, advanced: 2, family: 3, professional: 4 };
export const TIER_NAME = {
  0: 'Free',
  1: 'Starter',
  2: 'Advanced',
  3: 'Family',
  4: 'Professional',
};

/**
 * Every plan key that has ever been sold (web Stripe catalog, mobile
 * RevenueCat, referral rewards) mapped to its tier. Keys are kept forever so
 * an existing subscriber is never downgraded by a catalog change. Internal
 * key names predate the retail names: "personal" is Starter, "individual" is
 * Starter yearly, "personal_advanced" is Advanced.
 */
export const PLAN_KEY_TIER = {
  free: 0,
  personal_monthly: 1,
  personal_quarterly: 1,
  individual_annual: 1,
  personal_advanced_monthly: 2,
  personal_advanced_quarterly: 2,
  personal_advanced_annual: 2,
  family_monthly: 3,
  family_quarterly: 3,
  family_annual: 3,
  professional_monthly: 4,
  professional_annual: 4,
};

/** Tier for a plan key; unknown or empty keys are tier 0. */
export function canonicalTierOfPlanKey(planKey) {
  return PLAN_KEY_TIER[planKey] ?? 0;
}

/* ── Watchlist cap (server-enforced in POST /api/watchlists) ──────────────
   Counts lists, not items. Lists that already exist are never removed: the
   cap only stops a new list being created past it. */
export const WATCHLIST_LIMITS = { 0: 3, 1: 10, 2: 50, 3: 50, 4: 100 };

export function watchlistLimitFor(tier) {
  const t = Math.max(0, Math.min(4, Number(tier) || 0));
  return WATCHLIST_LIMITS[t];
}

/* ── Sonar values, read from the enforced matrix ───────────────────────── */

const sonarFor = (tier) => getSonarEntitlements({ planTier: tier, version: 'regular' });
const SONAR = { 0: sonarFor(0), 1: sonarFor(1), 2: sonarFor(2), 3: sonarFor(3) };
const DEPTH_LABEL = { summary: 'Quick', standard: 'Standard', deep: 'Deep' };
const datasetLabels = (tier) => SONAR[tier].datasets.map((id) => SONAR_DATASETS[id]?.label);

export const SONAR_SUMMARY = {
  0: SONAR[0],
  1: SONAR[1],
  2: SONAR[2],
  3: SONAR[3],
};

/* ── Retail plans ──────────────────────────────────────────────────────── */

/**
 * Prices are USD (the Stripe Price objects are USD). `quarter`/`year` are
 * the amounts actually charged; `perMonth` is the effective monthly figure
 * shown beside them, never on its own.
 */
export const RETAIL_PLANS = {
  free: {
    id: 'free',
    tier: 0,
    name: 'Free',
    promise: 'Discover Ezana',
    audience: 'For curious investors getting to know the markets.',
    availability: 'waitlist',
    price: null,
    stripeKey: null,
    cta: 'Join Free waitlist',
  },
  starter: {
    id: 'starter',
    tier: 1,
    name: 'Starter',
    promise: 'Build your investing routine',
    audience: 'For investors who research a few names every week.',
    availability: 'waitlist',
    price: {
      quarter: { amount: 15, perMonth: 5 },
      year: { amount: 48, perMonth: 4 },
    },
    stripeKey: { quarter: 'personal_quarterly', year: 'individual_annual' },
    cta: 'Join Starter waitlist',
  },
  advanced: {
    id: 'advanced',
    tier: 2,
    name: 'Advanced',
    promise: 'From signal to conviction',
    audience: 'For self-directed investors, analysts and students who want the full workflow.',
    availability: 'available',
    price: {
      quarter: { amount: 57, perMonth: 19 },
      year: { amount: 180, perMonth: 15 },
    },
    stripeKey: { quarter: 'personal_advanced_quarterly', year: 'personal_advanced_annual' },
    cta: 'Start 30-day Advanced trial',
  },
  family: {
    id: 'family',
    tier: 3,
    name: 'Family',
    promise: 'Household plans',
    audience: 'Advanced research for a household. Join the waitlist to hear when it opens.',
    availability: 'waitlist',
    price: {
      quarter: { amount: 147, perMonth: 49 },
      year: { amount: 468, perMonth: 39 },
    },
    stripeKey: { quarter: 'family_quarterly', year: 'family_annual' },
    cta: 'Join Family waitlist',
  },
};

/** The three plans a visitor chooses between on /pricing, in order. */
export const PRIMARY_PLAN_IDS = ['free', 'starter', 'advanced'];

/** Yearly saving against four quarters, rounded to whole dollars and percent. */
export function yearlySaving(planId) {
  const p = RETAIL_PLANS[planId]?.price;
  if (!p) return null;
  const quarters = p.quarter.amount * 4;
  const saved = quarters - p.year.amount;
  return { saved, pct: Math.round((saved / quarters) * 100), quarters };
}

/* ── Feature registry ──────────────────────────────────────────────────── */

/**
 * One row per customer-facing capability.
 *   values      what each tier gets: true, false, or a short string
 *   minTier     lowest tier with access (for gates and "everything in")
 *   enforcement 'server' (an API refuses it below minTier) or 'open'
 *   maturity    'live' only; anything else is in EXCLUDED_FEATURES
 *   latency     plain-language data freshness, shown as a tooltip
 *   route       where it lives in the app
 */
export const FEATURE_GROUPS = [
  {
    id: 'basics',
    label: 'Market and investing basics',
    features: [
      {
        id: 'market-overview',
        label: 'Market overview, price charts and company profiles',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        latency:
          'Quotes come from market data providers and each view shows when it was last updated. They are not exchange-direct real-time quotes.',
        route: '/company-research',
      },
      {
        id: 'statements',
        label: 'Financial statements, ratios and analyst estimates',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        latency: 'Reported filings, updated after each company files.',
        route: '/company-research',
      },
      {
        id: 'echo',
        label: 'Ezana Echo editorial',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        route: '/ezana-echo',
      },
    ],
  },
  {
    id: 'sonar',
    label: 'Ezana Sonar research',
    features: [
      {
        id: 'sonar-pings',
        label: 'Sonar answers per day, every one cited',
        values: {
          0: String(SONAR[0].dailyQueries),
          1: String(SONAR[1].dailyQueries),
          2: String(SONAR[2].dailyQueries),
          3: String(SONAR[3].dailyQueries),
        },
        minTier: 0,
        enforcement: 'server',
        maturity: 'live',
        latency: 'Daily limits reset at midnight UTC.',
        route: '/sonar',
      },
      {
        id: 'sonar-deep',
        label: 'Deep research runs per day',
        values: {
          0: String(SONAR[0].deepRunsPerDay),
          1: String(SONAR[1].deepRunsPerDay),
          2: String(SONAR[2].deepRunsPerDay),
          3: String(SONAR[3].deepRunsPerDay),
        },
        minTier: 0,
        enforcement: 'server',
        maturity: 'live',
        latency: 'A deep run also counts as one of the day’s answers.',
        route: '/sonar',
      },
      {
        id: 'sonar-depth',
        label: 'Deepest synthesis Sonar writes',
        values: {
          0: DEPTH_LABEL[SONAR[0].depth],
          1: DEPTH_LABEL[SONAR[1].depth],
          2: DEPTH_LABEL[SONAR[2].depth],
          3: DEPTH_LABEL[SONAR[3].depth],
        },
        minTier: 0,
        enforcement: 'server',
        maturity: 'live',
        route: '/sonar',
      },
      {
        id: 'sonar-datasets',
        label: 'Ezana datasets Sonar searches',
        values: {
          0: String(SONAR[0].datasets.length),
          1: String(SONAR[1].datasets.length),
          2: String(SONAR[2].datasets.length),
          3: String(SONAR[3].datasets.length),
        },
        minTier: 0,
        enforcement: 'server',
        maturity: 'live',
        latency: `Free: ${datasetLabels(0).join(', ')}. Starter adds ${datasetLabels(1)
          .filter((l) => !datasetLabels(0).includes(l))
          .join(' and ')}. Advanced adds ${datasetLabels(2)
          .filter((l) => !datasetLabels(1).includes(l))
          .join(' and ')}.`,
        route: '/sonar',
      },
      {
        id: 'sonar-cross',
        label: '13F holdings and lobbying in Sonar answers',
        values: { 0: false, 1: false, 2: true, 3: true },
        minTier: 2,
        enforcement: 'server',
        maturity: 'live',
        latency: '13F holdings are filed up to 45 days after each quarter ends.',
        route: '/sonar',
      },
      {
        id: 'sonar-web',
        label: 'Live web sources per answer',
        values: {
          0: String(SONAR[0].webSearch.maxUses),
          1: String(SONAR[1].webSearch.maxUses),
          2: String(SONAR[2].webSearch.maxUses),
          3: String(SONAR[3].webSearch.maxUses),
        },
        minTier: 0,
        enforcement: 'server',
        maturity: 'live',
        route: '/sonar',
      },
      {
        id: 'sonar-library',
        label: 'Save answers to your research library',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        route: '/sonar',
      },
    ],
  },
  {
    id: 'models',
    label: 'Company research and valuation models',
    features: [
      {
        id: 'valuation-models',
        label: 'DCF and reverse DCF, three-statement forecast, comparable companies',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        latency: 'Built on reported statements and a recent quote, with drivers you can edit.',
        route: '/company-research?tool=dcf',
      },
      {
        id: 'earnings-analyzer',
        label: 'Earnings call analyzer',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        latency: 'Scores the language of published call transcripts, not financial performance.',
        route: '/company-research?tool=earnings',
      },
      {
        id: 'ai-model-reports',
        label: 'AI model reports: GRPV score and an AI read of every model',
        values: { 0: false, 1: false, 2: true, 3: true },
        minTier: 2,
        enforcement: 'server',
        maturity: 'live',
        latency:
          'Written by an AI model from the market data sent with the request. A structured opinion, not a priced valuation.',
        route: '/company-research?tool=grpv',
      },
      {
        id: 'analyst-accuracy',
        label: 'Analyst track records',
        values: { 0: false, 1: false, 2: true, 3: true },
        minTier: 2,
        enforcement: 'server',
        maturity: 'live',
        route: '/company-research',
      },
    ],
  },
  {
    id: 'alt',
    label: 'Alternative and institutional intelligence',
    features: [
      {
        id: 'congress',
        label: 'Congressional trading disclosures',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        latency:
          'Members of Congress can report a trade up to 45 days after it happens. Ezana shows it once the disclosure is published, never at trade time.',
        route: '/inside-the-capitol',
      },
      {
        id: 'institutional-datasets',
        label: 'Government contracts, lobbying, 13F holdings and sanctions datasets',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        latency:
          'Public filings: contracts from USAspending, lobbying from quarterly Senate reports, 13F holdings up to 45 days after quarter end, sanctions from OFAC.',
        route: '/datasets',
      },
    ],
  },
  {
    id: 'portfolio',
    label: 'Portfolios and watchlists',
    features: [
      {
        id: 'watchlists',
        label: 'Watchlists',
        values: {
          0: String(WATCHLIST_LIMITS[0]),
          1: String(WATCHLIST_LIMITS[1]),
          2: String(WATCHLIST_LIMITS[2]),
          3: String(WATCHLIST_LIMITS[3]),
        },
        minTier: 0,
        enforcement: 'server',
        maturity: 'live',
        latency: 'Lists you already have are kept if you change plan.',
        route: '/watchlist',
      },
      {
        id: 'portfolio-tracking',
        label: 'Portfolio tracking and brokerage linking',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        route: '/home',
      },
      {
        id: 'mock-trading',
        label: 'Mock trading with a simulated portfolio',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        latency: 'Simulated orders only. Ezana does not place real trades.',
        route: '/trading/mock',
      },
    ],
  },
  {
    id: 'quant',
    label: 'Quant Lab',
    features: [
      {
        id: 'quant-indicators',
        label: 'Model library and single-ticker indicators',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        route: '/for-the-quants',
      },
      {
        id: 'quant-lab',
        label:
          'Strategy Lab, backtesting, factor studies, pairs and correlation, portfolio risk, GARCH, PCA and Markov models',
        values: { 0: false, 1: false, 2: true, 3: true },
        minTier: 2,
        enforcement: 'server',
        maturity: 'live',
        latency:
          'Backtests run on daily price history. Results are research, not a validated strategy.',
        route: '/for-the-quants/strategy-lab',
      },
    ],
  },
  {
    id: 'community',
    label: 'Learning and community',
    features: [
      {
        id: 'learning',
        label: 'Learning center courses',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        route: '/learning-center',
      },
      {
        id: 'community',
        label: 'Community',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        route: '/community',
      },
    ],
  },
  {
    id: 'support',
    label: 'Support and access',
    features: [
      {
        id: 'support',
        label: 'Help center and email support',
        values: { 0: true, 1: true, 2: true, 3: true },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
        route: '/help-center',
      },
      {
        id: 'access',
        label: 'How to join',
        values: { 0: 'Waitlist', 1: 'Waitlist', 2: 'Available now', 3: 'Waitlist' },
        minTier: 0,
        enforcement: 'open',
        maturity: 'live',
      },
    ],
  },
];

/** Flat lookup by feature id. */
export const FEATURES = Object.fromEntries(
  FEATURE_GROUPS.flatMap((g) => g.features.map((f) => [f.id, { ...f, group: g.id }])),
);

/**
 * The 5 to 7 benefits on each /pricing card, written from the registry so a
 * card never promises more than the table. Numbers come from the enforced
 * matrices above.
 */
export const PLAN_HIGHLIGHTS = {
  free: [
    { feature: 'echo', text: 'Ezana Echo editorial and the learning center' },
    {
      feature: 'market-overview',
      text: 'Market overview, charts, profiles and financial statements',
    },
    {
      feature: 'sonar-pings',
      text: `${SONAR[0].dailyQueries} cited Sonar answers a day across ${SONAR[0].datasets.length} public datasets`,
    },
    { feature: 'congress', text: 'Congressional, contract and sanctions disclosures as published' },
    { feature: 'watchlists', text: `${WATCHLIST_LIMITS[0]} watchlists and portfolio tracking` },
    { feature: 'mock-trading', text: 'Mock trading with a simulated portfolio' },
  ],
  starter: [
    {
      feature: 'sonar-pings',
      text: `${SONAR[1].dailyQueries} Sonar answers a day at standard depth`,
    },
    { feature: 'sonar-datasets', text: 'Sonar adds SEC filings and prediction markets' },
    { feature: 'sonar-deep', text: `${SONAR[1].deepRunsPerDay} deep research runs a day` },
    { feature: 'watchlists', text: `${WATCHLIST_LIMITS[1]} watchlists with notes` },
    {
      feature: 'valuation-models',
      text: 'DCF, three-statement and comparable company workbenches',
    },
    { feature: 'echo', text: 'Everything in Free' },
  ],
  advanced: [
    {
      feature: 'sonar-deep',
      text: `${SONAR[2].dailyQueries} Sonar answers and ${SONAR[2].deepRunsPerDay} deep research runs a day`,
    },
    {
      feature: 'sonar-cross',
      text: `Deep synthesis across ${SONAR[2].datasets.length} datasets, adding 13F holdings and lobbying`,
    },
    {
      feature: 'ai-model-reports',
      text: 'AI model reports: GRPV score and an AI read of every valuation model',
    },
    {
      feature: 'quant-lab',
      text: 'Quant Lab: Strategy Lab, backtesting, factors, pairs and portfolio risk',
    },
    { feature: 'analyst-accuracy', text: 'Analyst track records on every company' },
    {
      feature: 'watchlists',
      text: `${WATCHLIST_LIMITS[2]} watchlists, plus everything in Starter`,
    },
  ],
};

/** The four outcomes the Advanced workflow is built around (hero and value strip). */
export const WORKFLOW_STEPS = [
  {
    id: 'signal',
    icon: 'bi-broadcast',
    title: 'Find a signal',
    body: 'Congressional disclosures, 13F position changes, lobbying, government contracts and sanctions, as they are published.',
    href: '/inside-the-capitol',
    linkLabel: 'Inside the Capitol',
  },
  {
    id: 'sonar',
    icon: 'bi-search',
    title: 'Investigate with Sonar',
    body: 'Ask a question in plain language. Sonar searches Ezana’s datasets and the web and answers with citations, showing what it searched.',
    href: '/sonar',
    linkLabel: 'Ezana Sonar',
  },
  {
    id: 'model',
    icon: 'bi-calculator',
    title: 'Test the thesis',
    body: 'Run a DCF, a three-statement forecast or comparable companies on reported numbers, then read the AI model report on Advanced.',
    href: '/company-research',
    linkLabel: 'Company research',
  },
  {
    id: 'monitor',
    icon: 'bi-eye',
    title: 'Monitor what changes',
    body: 'Keep the names on a watchlist, track your portfolio and test strategies in Quant Lab.',
    href: '/watchlist',
    linkLabel: 'Watchlists',
  },
];

/**
 * Built, but not sold: planned or sample-data features. Listed so the audit
 * and the FAQ can say what is not included yet. Never shown as an inclusion.
 */
export const EXCLUDED_FEATURES = [
  {
    label: 'Paper deployment of Quant Lab strategies',
    status: 'planned',
    route: '/for-the-quants/paper-trading',
  },
  {
    label: 'Universe-wide pairs scanner and saved pair experiments',
    status: 'planned',
    route: '/for-the-quants/statistical-arbitrage',
  },
  {
    label: 'More factors and saved factor studies',
    status: 'planned',
    route: '/for-the-quants/factor-research',
  },
  {
    label: 'Portfolio stress tests, liquidity and risk export',
    status: 'planned',
    route: '/for-the-quants/risk-portfolio',
  },
  {
    label: 'Backtest strategy comparison and simulation visuals',
    status: 'sample data',
    route: '/for-the-quants/backtesting',
  },
  {
    label: 'Quant Lab dataset registry and community strategy leaderboard',
    status: 'sample data',
    route: '/for-the-quants/datasets-research',
  },
  {
    label: 'Live brokerage order entry and copy trading',
    status: 'planned',
    route: '/trading/dashboard',
  },
  { label: 'Sonar report exports', status: 'planned', route: '/sonar' },
  {
    label: 'Shared household portfolios, household dashboard and parental controls',
    status: 'planned',
    route: null,
  },
  {
    label: 'SSO/SAML, custom integrations and a dedicated account manager',
    status: 'not offered',
    route: null,
  },
];

/** Plans available to start today without an invite (server checks this). */
export const OPEN_PLAN_KEYS = new Set([
  RETAIL_PLANS.advanced.stripeKey.quarter,
  RETAIL_PLANS.advanced.stripeKey.year,
]);
