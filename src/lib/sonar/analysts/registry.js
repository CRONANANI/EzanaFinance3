/**
 * Ezana Sonar analyst registry: 18 specialists + 3 control roles.
 *
 * Each profile is machine-readable: what research it leads, which evidence capabilities it
 * needs (dataset-capabilities.js), which methodology skill it loads (sonar-skills/<skill>),
 * which modes it runs in, its model tier, and the critical rules the methodology auditor
 * enforces. The router (analyst-router.js) scores profiles against the research spec, the
 * research-mode classification and the macro route; it never activates on keywords alone.
 *
 * Matching vocabularies (verified against the code, Nov 2026):
 *   spec.domains[].id   company politician country industry sector lobbying congress_trading
 *                       contracts institutional geopolitics company_financials
 *                       market_performance analyst_views commodity macro prediction ipo
 *                       competition editorial news
 *   spec.objective.primary  assess_fund_fit assess_positioning risk_assessment rank compare
 *                       assess_outlook assess_exposure explain (+ valuation, added by router)
 *   classification.operations  lookup list trend rank_screen compare breakdown exposure
 *                       dependence sustainability causal_impact opportunity risk_assessment
 *                       outlook_scenario relationship_map thesis_diligence discovery reconciliation
 *   route.themes        currency inflation rates credit housing debt trade energy oil gas power
 *                       food commodity metals geopolitics risk conflict sanctions governance
 *                       growth labour recession
 *
 * Pure data. Client-safe.
 */

export const ANALYST_GROUPS = {
  control: 'Research direction and quality',
  macro: 'Macroeconomics, currencies and sovereign risk',
  corporate: 'Corporate finance, equities and valuation',
  government: 'Government, political and regulatory intelligence',
  alternative: 'Commodities, alternative data and investment strategies',
};

/** Model tiers resolve to env-configured models in the orchestrator. */
export const MODEL_TIERS = {
  fast: 'SONAR_ANALYST_FAST_MODEL', // specialists in standard mode
  strong: 'SONAR_ANALYST_STRONG_MODEL', // director synthesis, deep specialists, red team
};

const A = (p) => ({
  modes: ['standard', 'deep'],
  tier: { standard: 'fast', deep: 'strong' },
  maxOutputTokens: { standard: 700, deep: 1600 },
  domains: {},
  objectives: [],
  operations: [],
  themes: [],
  secondaryThemes: [], // count half: the theme touches this analyst but belongs to another
  subjectKinds: [],
  required: [],
  preferred: [],
  rules: [],
  tenantOnly: false,
  ...p,
});

export const ANALYSTS = {
  /* ── Control roles ─────────────────────────────────────────────────────────── */
  'research-director': A({
    id: 'research-director',
    title: 'Chief Research Director',
    group: 'control',
    role: 'control',
    skill: 'research-direction',
    modes: ['standard', 'deep'],
    tier: { standard: 'fast', deep: 'strong' },
    maxOutputTokens: { standard: 1100, deep: 2600 },
    rules: [
      'Integrates specialists; does not act as another specialist',
      'Answer first; every material claim traceable to evidence or a computed metric',
      'Reconciles disagreements explicitly instead of averaging them away',
    ],
  }),
  'methodology-auditor': A({
    id: 'methodology-auditor',
    title: 'Research Data and Methodology Auditor',
    group: 'control',
    role: 'control',
    skill: 'methodology-audit',
    modes: ['quick', 'standard', 'deep'],
    /* Deterministic checks always; the model review runs in deep mode only. */
    tier: { quick: null, standard: null, deep: 'fast' },
    maxOutputTokens: { deep: 800 },
    rules: [
      'Never adds claims',
      'Numbers, units, periods, entities and citations checked in code first',
    ],
  }),
  'red-team': A({
    id: 'red-team',
    title: 'Independent Bear-Case and Red-Team Analyst',
    group: 'control',
    role: 'control',
    skill: 'red-team-review',
    modes: ['deep'],
    tier: { deep: 'strong' },
    maxOutputTokens: { deep: 900 },
    rules: [
      'Challenges with cited evidence or labelled hypotheses only; never invents counter-facts',
    ],
  }),

  /* ── Group A: macro, FX, sovereign, rates ────────────────────────────────── */
  macroeconomist: A({
    id: 'macroeconomist',
    title: 'Senior Macroeconomic Analyst',
    group: 'macro',
    phase: 2,
    skill: 'macroeconomic-analysis',
    domains: { macro: 1, country: 0.8 },
    objectives: ['explain', 'assess_outlook', 'assess_exposure', 'compare', 'rank'],
    operations: [
      'trend',
      'outlook_scenario',
      'causal_impact',
      'exposure',
      'compare',
      'rank_screen',
    ],
    themes: ['growth', 'inflation', 'labour', 'recession'],
    secondaryThemes: ['rates', 'currency', 'commodity', 'energy', 'food'],
    subjectKinds: ['country'],
    required: ['gdp_growth', 'inflation_monthly', 'unemployment', 'policy_rate'],
    preferred: [
      'inflation_annual',
      'gov_balance',
      'gov_debt',
      'activity',
      'oecd_macro',
      'uncertainty',
    ],
    rules: [
      'Projections labelled and never shown as observed',
      'Real vs nominal stated',
      'Periods named for every figure',
    ],
  }),
  'fx-strategist': A({
    id: 'fx-strategist',
    title: 'Senior FX and Currency Strategist',
    group: 'macro',
    phase: 2,
    skill: 'fx-currency-analysis',
    domains: { macro: 0.8, country: 0.8 },
    objectives: ['assess_exposure', 'assess_outlook', 'explain', 'compare'],
    operations: ['trend', 'exposure', 'sustainability', 'outlook_scenario', 'compare'],
    themes: ['currency'],
    subjectKinds: ['country'],
    required: ['fx_spot', 'inflation_monthly', 'policy_rate', 'fx_effective'],
    preferred: ['fx_reserves', 'bop', 'current_account', 'external_debt', 'geopolitical_risk'],
    rules: [
      'Quote both conventions for a currency move',
      'Ex-post real rate labelled as ex-post',
      'Downgrade when no fresh FX observation exists; a monthly BIS value is not a current quote',
      'No crisis claim without evidence of disorderly moves, capital flight, low reserves vs obligations or lost market access',
    ],
  }),
  'sovereign-risk': A({
    id: 'sovereign-risk',
    title: 'Senior Sovereign Risk and Emerging Markets Analyst',
    group: 'macro',
    phase: 2,
    skill: 'sovereign-risk-analysis',
    domains: { country: 0.8, macro: 0.7, geopolitics: 0.3 },
    objectives: ['assess_exposure', 'risk_assessment', 'assess_outlook'],
    operations: ['sustainability', 'exposure', 'risk_assessment', 'dependence', 'outlook_scenario'],
    themes: ['debt'],
    secondaryThemes: ['currency', 'credit'],
    subjectKinds: ['country'],
    required: ['current_account', 'external_debt', 'gov_debt', 'fx_reserves'],
    preferred: ['bop', 'trade_goods', 'gov_balance', 'policy_rate', 'remittances', 'governance'],
    rules: [
      'Gross reserves are not net or usable reserves',
      'Liquidity stress distinguished from solvency',
      'CDS and maturity profiles are not in Ezana data',
    ],
  }),
  'rates-strategist': A({
    id: 'rates-strategist',
    title: 'Senior Fixed Income and Rates Strategist',
    group: 'macro',
    phase: 4,
    skill: 'rates-fixed-income-analysis',
    domains: { macro: 0.6, market_performance: 0.3 },
    objectives: ['assess_outlook', 'assess_exposure', 'explain'],
    operations: ['causal_impact', 'exposure', 'outlook_scenario', 'trend'],
    themes: ['rates', 'credit'],
    subjectKinds: ['country', 'company'],
    required: ['policy_rate', 'inflation_monthly'],
    preferred: ['credit_gap', 'debt_service', 'gov_debt', 'market_prices'],
    rules: [
      'Broad sovereign yield curves and bond prices are not in Ezana data; say so and answer conceptually where needed',
    ],
  }),

  /* ── Group B: corporate ──────────────────────────────────────────────────── */
  'equity-research': A({
    id: 'equity-research',
    title: 'Senior Equity Research Analyst',
    group: 'corporate',
    phase: 2,
    skill: 'equity-fundamentals',
    domains: { company: 1, company_financials: 1, analyst_views: 0.5, market_performance: 0.4 },
    objectives: [
      'risk_assessment',
      'assess_positioning',
      'assess_fund_fit',
      'explain',
      'compare',
      'assess_exposure',
    ],
    operations: [
      'dependence',
      'sustainability',
      'risk_assessment',
      'opportunity',
      'thesis_diligence',
      'compare',
      'trend',
    ],
    themes: [],
    subjectKinds: ['company'],
    required: ['sec_fundamentals', 'company_profile_segments'],
    preferred: ['peer_set', 'analyst_estimates', 'sec_filings', 'market_prices', 'capex_customers'],
    rules: ['Fiscal periods named', 'Management commentary limited to companies with filing text'],
  }),
  valuation: A({
    id: 'valuation',
    title: 'Senior Valuation and Financial Modelling Analyst',
    group: 'corporate',
    phase: 2,
    skill: 'valuation-modelling',
    domains: { company_financials: 0.7, analyst_views: 0.6, market_performance: 0.5 },
    objectives: ['valuation', 'assess_fund_fit'],
    operations: ['thesis_diligence', 'outlook_scenario'],
    themes: [],
    subjectKinds: ['company'],
    required: ['sec_fundamentals', 'market_prices'],
    preferred: ['analyst_estimates', 'peer_set', 'policy_rate', 'org_ips'],
    rules: [
      'All arithmetic by the engine',
      'Ranges and sensitivities, never a price target in Ezana voice',
      'Assumptions justified from evidence and labelled',
    ],
  }),
  'industry-analyst': A({
    id: 'industry-analyst',
    title: 'Senior Industry and Competitive Intelligence Analyst',
    group: 'corporate',
    phase: 4,
    skill: 'industry-competitive-analysis',
    domains: { industry: 1, sector: 0.8, competition: 1 },
    objectives: ['assess_positioning', 'assess_exposure', 'compare', 'rank'],
    operations: ['opportunity', 'exposure', 'compare', 'rank_screen', 'relationship_map'],
    themes: [],
    subjectKinds: ['industry', 'company'],
    required: ['peer_set', 'company_profile_segments'],
    preferred: [
      'industry_registry',
      'competitor_milestones',
      'contract_history',
      'lobbying_filings',
      'news',
    ],
    rules: [
      'Market growth separated from company value capture',
      'Registry covers only 2 industries; say so',
    ],
  }),
  'ownership-analyst': A({
    id: 'ownership-analyst',
    title: 'Senior Institutional Ownership and Capital Flows Analyst',
    group: 'corporate',
    phase: 3,
    skill: 'ownership-flows-analysis',
    domains: { institutional: 1 },
    objectives: ['explain', 'rank', 'compare'],
    operations: ['trend', 'rank_screen', 'breakdown'],
    themes: [],
    subjectKinds: ['company'],
    required: ['holdings_13f'],
    preferred: ['etf_holdings', 'activist_stakes', 'insider_transactions'],
    rules: [
      '13F is lagged, long-only and not current holdings',
      'Disclosed positions are not motives',
      'Holdings deduplicated across tables',
    ],
  }),

  /* ── Group C: government and political ──────────────────────────────────── */
  'contracts-analyst': A({
    id: 'contracts-analyst',
    title: 'Senior Government Contracts and Procurement Analyst',
    group: 'government',
    phase: 2,
    skill: 'government-contracts-analysis',
    domains: { contracts: 1 },
    objectives: ['assess_exposure', 'rank', 'explain', 'compare'],
    operations: ['dependence', 'trend', 'rank_screen', 'breakdown'],
    themes: [],
    subjectKinds: ['company', 'industry'],
    required: ['contract_awards', 'contract_history'],
    preferred: ['sec_fundamentals', 'lobbying_filings'],
    rules: [
      'Award value is never revenue without reconciliation',
      'Ceiling vs obligation vs outlay distinguished',
      'Federal fiscal year starts 1 October',
    ],
  }),
  'lobbying-analyst': A({
    id: 'lobbying-analyst',
    title: 'Senior Lobbying and Public Policy Analyst',
    group: 'government',
    phase: 3,
    skill: 'lobbying-policy-analysis',
    domains: { lobbying: 1 },
    objectives: ['rank', 'explain', 'compare'],
    operations: ['rank_screen', 'trend', 'breakdown', 'relationship_map'],
    themes: [],
    subjectKinds: ['company', 'industry'],
    required: ['lobbying_filings'],
    preferred: ['lobbying_contributions', 'congress_bills', 'contract_history'],
    rules: ['Disclosed advocacy is not proven influence', 'Income vs expenses distinguished'],
  }),
  'congress-analyst': A({
    id: 'congress-analyst',
    title: 'Senior Congressional Trading and Political Intelligence Analyst',
    group: 'government',
    phase: 3,
    skill: 'congressional-trading-analysis',
    domains: { congress_trading: 1, politician: 1 },
    objectives: ['explain', 'rank', 'compare'],
    operations: ['list', 'trend', 'rank_screen', 'relationship_map'],
    themes: [],
    subjectKinds: ['politician', 'company'],
    required: ['congress_trades', 'congress_members'],
    preferred: ['congress_bills', 'lobbying_filings', 'fec_candidates'],
    rules: [
      'Ranges are not exact amounts',
      'Transaction vs disclosure dates',
      'No inference of motive or misconduct',
    ],
  }),
  'sanctions-analyst': A({
    id: 'sanctions-analyst',
    title: 'Senior Sanctions and Trade Compliance Analyst',
    group: 'government',
    phase: 3,
    skill: 'sanctions-trade-compliance',
    domains: { geopolitics: 0.8, country: 0.3 },
    objectives: ['assess_exposure', 'explain', 'rank'],
    operations: ['exposure', 'list', 'breakdown', 'relationship_map'],
    themes: ['sanctions'],
    subjectKinds: ['company', 'country', 'industry'],
    required: ['sanctions_ofac', 'sanctions_intl'],
    preferred: ['export_controls', 'company_profile_segments'],
    rules: [
      'Name match is not identity',
      'Country exposure is not being sanctioned',
      'Not a legal determination',
    ],
  }),
  'geopolitical-analyst': A({
    id: 'geopolitical-analyst',
    title: 'Senior Geopolitical and Country Risk Analyst',
    group: 'government',
    phase: 4,
    skill: 'geopolitical-country-risk',
    domains: { geopolitics: 1, country: 0.3 },
    objectives: ['risk_assessment', 'assess_exposure', 'assess_outlook'],
    operations: ['risk_assessment', 'exposure', 'outlook_scenario', 'causal_impact'],
    themes: ['geopolitics', 'risk', 'conflict', 'governance'],
    secondaryThemes: ['sanctions', 'energy'],
    subjectKinds: ['country', 'company', 'industry'],
    required: ['geopolitical_risk', 'uncertainty'],
    preferred: [
      'conflict',
      'governance',
      'sanctions_intl',
      'export_controls',
      'ports_chokepoints',
      'news',
    ],
    rules: [
      'No causal claim from timing alone',
      'Established evidence separated from hypothetical pathways',
    ],
  }),

  /* ── Group D: commodities, quant, portfolio, prediction ────────────────── */
  'commodities-analyst': A({
    id: 'commodities-analyst',
    title: 'Senior Energy and Commodities Analyst',
    group: 'alternative',
    phase: 3,
    skill: 'energy-commodities-analysis',
    domains: { commodity: 1, macro: 0.2 },
    objectives: ['assess_outlook', 'explain', 'rank', 'assess_exposure'],
    operations: ['trend', 'outlook_scenario', 'rank_screen', 'exposure', 'causal_impact'],
    themes: ['energy', 'oil', 'gas', 'power', 'commodity', 'metals'],
    subjectKinds: ['country', 'industry', 'company'],
    required: ['commodity_price'],
    preferred: [
      'oil_production',
      'oil_demand',
      'oil_stocks',
      'gas_production',
      'gas_demand',
      'gas_imports',
      'gas_stocks',
      'trade_goods',
    ],
    rules: ['Units and periods on every price', 'Exporter vs importer effects distinguished'],
  }),
  'food-analyst': A({
    id: 'food-analyst',
    title: 'Senior Agriculture, Food and Climate Risk Analyst',
    group: 'alternative',
    phase: 4,
    skill: 'agriculture-food-analysis',
    domains: { commodity: 0.5, country: 0.3 },
    objectives: ['assess_exposure', 'rank', 'explain'],
    operations: ['exposure', 'rank_screen', 'trend'],
    themes: ['food'],
    secondaryThemes: ['commodity'],
    subjectKinds: ['country'],
    required: ['food_prices_local', 'commodity_price'],
    preferred: ['food_producer_prices', 'inflation_monthly', 'trade_goods'],
    rules: [
      'Market-level prices aggregated by product median per country',
      'No live weather data in Ezana',
    ],
  }),
  'quant-analyst': A({
    id: 'quant-analyst',
    title: 'Senior Quantitative Research and Statistical Analyst',
    group: 'alternative',
    phase: 3,
    skill: 'quantitative-research',
    domains: { market_performance: 0.5, prediction: 0.3, congress_trading: 0.3 },
    objectives: ['explain', 'compare'],
    operations: ['causal_impact', 'trend', 'compare', 'reconciliation', 'discovery'],
    themes: [],
    subjectKinds: [],
    required: ['market_prices'],
    preferred: ['sec_fundamentals', 'congress_trades', 'prediction_markets', 'contract_history'],
    rules: [
      'Engine computes every statistic',
      'No look-ahead or survivorship bias',
      'Small-sample and multiple-testing warnings',
    ],
  }),
  'portfolio-analyst': A({
    id: 'portfolio-analyst',
    title: 'Senior Portfolio Management and Risk Analyst',
    group: 'alternative',
    phase: 4,
    skill: 'portfolio-risk-analysis',
    domains: { company: 0.2 },
    objectives: ['assess_portfolio', 'assess_fund_fit', 'assess_exposure', 'risk_assessment'],
    operations: ['exposure', 'risk_assessment', 'breakdown'],
    themes: [],
    subjectKinds: ['portfolio', 'company'],
    required: ['org_portfolio', 'market_prices'],
    preferred: ['org_ips', 'sec_fundamentals'],
    tenantOnly: true,
    rules: [
      'Active organization, membership permissions and RLS respected',
      'Educational framing, no trade instructions',
    ],
  }),
  'prediction-analyst': A({
    id: 'prediction-analyst',
    title: 'Senior Prediction Markets and Event Probability Analyst',
    group: 'alternative',
    phase: 4,
    skill: 'prediction-markets-analysis',
    domains: { prediction: 1 },
    objectives: ['assess_outlook', 'explain', 'compare'],
    operations: ['outlook_scenario', 'compare', 'trend'],
    themes: [],
    subjectKinds: [],
    required: ['prediction_markets'],
    preferred: ['news'],
    rules: [
      'A price is not a calibrated probability',
      'Settlement wording checked',
      'Liquidity caveats',
    ],
  }),
};

export const SPECIALIST_IDS = Object.keys(ANALYSTS).filter((id) => ANALYSTS[id].role !== 'control');
export const CONTROL_IDS = ['research-director', 'methodology-auditor', 'red-team'];
