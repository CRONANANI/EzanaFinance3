/**
 * Valuation Method Map: single source of truth for "which valuation method
 * fits which kind of company". Consumed by:
 *   - the Learning Center course stocks-intermediate-9 (comparison table)
 *   - the Company Research "Valuation Method Selector" model card
 *
 * Rules of thumb, not rules of law. Every archetype lists a primary method,
 * the cross-checks a professional would run next to it, and the reason the
 * primary method fits. `ezanaModel` points at an existing Company Research
 * model id when Ezana already ships a tool for that method.
 *
 * Educational content only. Not investment advice.
 */

export const VALUATION_ARCHETYPES = [
  {
    id: 'mining',
    label: 'Mining companies',
    icon: 'bi-minecart-loaded',
    primary: 'NAV',
    primaryLong: 'Net Asset Value (mine by mine)',
    crossChecks: ['P/NAV vs peers', 'EV/EBITDA at spot and deck prices'],
    why: 'Value sits in finite reserves. Each mine is modeled to depletion at an assumed commodity price deck, discounted, then summed.',
    keyInputs: [
      'Reserves and grade',
      'Commodity price deck',
      'All-in sustaining cost',
      'Mine life',
    ],
    ezanaModel: null,
  },
  {
    id: 'financials',
    label: 'Banks and insurers',
    icon: 'bi-bank',
    primary: 'DDM',
    primaryLong: 'Dividend Discount Model',
    crossChecks: ['P/TBV (price to tangible book)', 'Residual income vs cost of equity'],
    why: 'Debt is raw material for a bank, not financing, so free cash flow and EV multiples break down. Distributable earnings and book value carry the signal.',
    keyInputs: ['Dividend per share', 'Payout sustainability', 'Cost of equity', 'Long-run growth'],
    ezanaModel: null,
  },
  {
    id: 'distressed',
    label: 'Distressed companies',
    icon: 'bi-graph-down-arrow',
    primary: 'Liquidation',
    primaryLong: 'Liquidation value (recovery analysis)',
    crossChecks: [
      'Recovery waterfall by capital structure',
      'Going-concern DCF under restructuring',
    ],
    why: 'When survival is in doubt, what the assets fetch in a sale sets the floor. Creditors are paid first, so equity may be worth little or nothing.',
    keyInputs: ['Asset recovery rates', 'Debt seniority', 'Wind-down costs'],
    ezanaModel: null,
  },
  {
    id: 'startups',
    label: 'Startups (private)',
    icon: 'bi-rocket-takeoff',
    primary: 'Venture Capital',
    primaryLong: 'Venture Capital method',
    crossChecks: ['Recent round pricing', 'Scorecard vs comparable private deals'],
    why: 'No stable cash flows yet. Investors estimate an exit value, divide by their target return multiple, and work back to a post-money valuation.',
    keyInputs: ['Exit value estimate', 'Target return multiple', 'Expected dilution'],
    ezanaModel: null,
    privateOnly: true,
  },
  {
    id: 'consumer_discretionary',
    label: 'Consumer discretionary',
    icon: 'bi-bag',
    primary: 'DCF + Comps',
    primaryLong: 'Discounted Cash Flow plus Comparable Companies',
    crossChecks: ['Normalize margins through the cycle', 'EV/EBITDA vs close peers'],
    why: 'Mature, cash generative, and well covered by listed peers. Demand is cyclical, so project cash flows over a full cycle, not a peak year.',
    keyInputs: ['Free cash flow', 'WACC', 'Terminal growth', 'Peer multiples'],
    ezanaModel: 'dcf',
    secondaryModel: 'comps',
  },
  {
    id: 'conglomerate',
    label: 'Conglomerates',
    icon: 'bi-diagram-3',
    primary: 'Sum-of-the-Parts',
    primaryLong: 'Sum-of-the-Parts (SOTP)',
    crossChecks: ['Segment peer multiples', 'Conglomerate discount vs history'],
    why: 'Unrelated segments deserve different multiples. Value each segment on its own peer group, add them up, then subtract net debt and corporate costs.',
    keyInputs: ['Segment EBITDA', 'Segment peer multiples', 'Net debt', 'Holding company costs'],
    ezanaModel: 'comps',
  },
  {
    id: 'reit',
    label: 'REITs',
    icon: 'bi-buildings',
    primary: 'NAV',
    primaryLong: 'Net Asset Value (property portfolio)',
    crossChecks: ['P/FFO and P/AFFO', 'Implied cap rate vs private market'],
    why: 'REITs are portfolios of income properties. Capitalize net operating income at market cap rates, subtract debt, and divide by shares.',
    keyInputs: ['Net operating income', 'Market cap rates', 'Debt', 'Share count'],
    ezanaModel: null,
  },
  {
    id: 'high_growth_tech',
    label: 'High growth tech',
    icon: 'bi-cpu',
    primary: 'Revenue Multiples',
    primaryLong: 'EV/Revenue (forward) multiples',
    crossChecks: ['Rule of 40 (growth plus margin)', 'Long-horizon DCF with explicit margin ramp'],
    why: 'Earnings are small or negative because the company is reinvesting. Revenue is the most stable base; quality is judged by growth, gross margin, and retention.',
    keyInputs: ['Forward revenue', 'Growth rate', 'Gross margin', 'Peer EV/Revenue'],
    ezanaModel: 'comps',
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: 'bi-lightning-charge',
    primary: 'DDM or DCF',
    primaryLong: 'Dividend Discount Model or Discounted Cash Flow',
    crossChecks: ['Allowed return on rate base', 'Dividend yield vs bond yields'],
    why: 'Regulated returns make cash flows unusually predictable and payouts high, so both dividend and cash flow discounting work well.',
    keyInputs: ['Dividend per share', 'Rate base growth', 'Allowed ROE', 'Cost of equity'],
    ezanaModel: 'dcf',
  },
];

/** Fallback for listed operating companies that match no archetype. */
export const GENERAL_ARCHETYPE = {
  id: 'general',
  label: 'Other operating companies',
  icon: 'bi-building',
  primary: 'DCF + Comps',
  primaryLong: 'Discounted Cash Flow plus Comparable Companies',
  crossChecks: ['EV/EBITDA vs close peers', 'Reverse DCF: what growth is priced in'],
  why: 'The default for a cash generative business: value the cash flows, then sanity check against how the market prices close peers.',
  keyInputs: ['Free cash flow', 'WACC', 'Terminal growth', 'Peer multiples'],
  ezanaModel: 'dcf',
  secondaryModel: 'comps',
};

const BY_ID = Object.fromEntries(
  [...VALUATION_ARCHETYPES, GENERAL_ARCHETYPE].map((a) => [a.id, a]),
);

export function getArchetype(id) {
  return BY_ID[id] || GENERAL_ARCHETYPE;
}

/**
 * Screening thresholds. Heuristics shown to the user verbatim so the
 * classification is transparent. Tune here, never inline.
 */
export const SCREEN_RULES = {
  highGrowthRevenuePct: 20, // revenue growth YoY at or above this reads as high growth
  distressNetMarginPct: -15, // net margin at or below this is one distress signal
  distressDebtToEquity: 2, // with leverage above this, or
  distressCurrentRatio: 1, // liquidity below this
};

const INDUSTRY_PATTERNS = [
  { id: 'mining', re: /metals|mining|gold|silver|copper|coal|precious/i },
  { id: 'reit', re: /real estate|reit/i },
  { id: 'utilities', re: /utilit/i },
  { id: 'financials', re: /bank|insurance|financial services|capital markets|thrift|savings/i },
  { id: 'conglomerate', re: /conglomerate/i },
  {
    id: 'consumer_discretionary',
    re: /retail|hotel|restaurant|leisure|automobile|auto components|textile|apparel|luxury|consumer products|diversified consumer|household durables|homebuilding/i,
  },
];

const TECH_RE = /technology|software|semiconductor|internet|communications|media|it services/i;

function num(v) {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/**
 * Classify a listed company into a valuation archetype.
 *
 * @param {object} input
 * @param {string|null} input.industry          e.g. Finnhub `finnhubIndustry`
 * @param {number|null} [input.revenueGrowthPct] YoY revenue growth, percent
 * @param {number|null} [input.netMarginPct]     TTM net margin, percent
 * @param {number|null} [input.debtToEquity]     total debt / total equity (ratio)
 * @param {number|null} [input.currentRatio]
 * @returns {{ archetype: object, sectorArchetype: object, reasons: string[], distressFlag: boolean }}
 */
export function classifyValuationArchetype(input = {}) {
  const industry = (input.industry || '').trim();
  const growth = num(input.revenueGrowthPct);
  const margin = num(input.netMarginPct);
  const de = num(input.debtToEquity);
  const cr = num(input.currentRatio);
  const reasons = [];

  let sectorId = 'general';
  const hit = INDUSTRY_PATTERNS.find((p) => p.re.test(industry));
  if (hit) {
    sectorId = hit.id;
    reasons.push(`Industry reads as "${industry}".`);
  } else if (TECH_RE.test(industry)) {
    if (growth != null && growth >= SCREEN_RULES.highGrowthRevenuePct) {
      sectorId = 'high_growth_tech';
      reasons.push(
        `Tech industry ("${industry}") with revenue growth of ${growth.toFixed(1)}%, at or above the ${SCREEN_RULES.highGrowthRevenuePct}% high growth screen.`,
      );
    } else {
      reasons.push(
        growth != null
          ? `Tech industry ("${industry}") but revenue growth of ${growth.toFixed(1)}% is below the ${SCREEN_RULES.highGrowthRevenuePct}% high growth screen, so cash flow methods apply.`
          : `Tech industry ("${industry}"); revenue growth unavailable, so defaulting to cash flow methods.`,
      );
    }
  } else if (industry) {
    reasons.push(
      `Industry "${industry}" matches no special case, so the operating company default applies.`,
    );
  } else {
    reasons.push('Industry unavailable, so the operating company default applies.');
  }

  const leverageStress = de != null && de > SCREEN_RULES.distressDebtToEquity;
  const liquidityStress = cr != null && cr < SCREEN_RULES.distressCurrentRatio;
  const distressFlag =
    sectorId !== 'financials' &&
    margin != null &&
    margin <= SCREEN_RULES.distressNetMarginPct &&
    (leverageStress || liquidityStress);

  if (distressFlag) {
    reasons.push(
      `Distress screen triggered: net margin ${margin.toFixed(1)}% with ${
        leverageStress
          ? `debt to equity of ${de.toFixed(2)}`
          : `a current ratio of ${cr.toFixed(2)}`
      }. Liquidation value sets the floor.`,
    );
  }

  const sectorArchetype = getArchetype(sectorId);
  return {
    archetype: distressFlag ? getArchetype('distressed') : sectorArchetype,
    sectorArchetype,
    reasons,
    distressFlag,
  };
}

/** Pure Gordon growth DDM: V = D0 x (1 + g) / (k - g). Returns null when k <= g. */
export function gordonGrowthValue(d0, k, g) {
  const D = num(d0);
  const K = num(k);
  const G = num(g);
  if (D == null || K == null || G == null || K <= G) return null;
  return (D * (1 + G)) / (K - G);
}
