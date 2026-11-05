/**
 * Sonar research engine: research domains, evidence sources and the default
 * retrieval configuration (Nov 2026, engine v3).
 *
 * A DOMAIN is a kind of question (lobbying, congressional trading,
 * institutional ownership, geopolitical exposure...). A SOURCE is one evidence
 * producer (a Supabase dataset read, a market data call, a retriever). The
 * retrieval CONFIG is a versioned matrix of domain x source weights: how
 * useful a source is for a domain. The planner multiplies a query's domain
 * scores by these weights to decide which sources run, how much capacity
 * each gets, and which are excluded.
 *
 * The config here is v1, the code default. Recalibration (recalibrate.js)
 * proposes new versions from telemetry and evaluation; an approved version
 * is stored in sonar_engine_configs and loaded by config-store.js. A version
 * is never promoted without passing the benchmark gate.
 *
 * Pure data and pure functions. Client-safe.
 */

/** Research domains, with the cues that activate them. Cues are a prior, not
    the decision: the planner combines them with the understood intent and
    entities. */
export const DOMAINS = {
  company: { label: 'Company intelligence', cues: [] },
  politician: { label: 'Politician intelligence', cues: [] },
  country: {
    label: 'Country intelligence',
    cues: [/\b(econom(y|ies)|gdp|growth|recession|inflation|outlook)\b/i],
  },
  industry: {
    label: 'Industry intelligence',
    cues: [/\b(industry|industries|sector|value chain|supply chain|manufacturers?|makers?)\b/i],
  },
  sector: { label: 'Sector screen', cues: [] },
  lobbying: {
    label: 'Lobbying and influence',
    cues: [/\b(lobby\w*|lobbyists?|influence|lda|registrants?|trade associations?)\b/i],
  },
  congress_trading: {
    label: 'Congressional trading',
    cues: [
      /\b(congress(?:ional|man|woman|men|women)?|lawmakers?|politicians?|senators?|representatives|members of (?:the )?(?:house|senate|congress)|stock act)\b/i,
    ],
  },
  contracts: {
    label: 'Government contracts',
    cues: [
      /\b(contracts?|contractors?|awards?|awarded|pentagon|dod|procurement|federal spending|government spending)\b/i,
    ],
  },
  institutional: {
    label: 'Institutional ownership',
    cues: [
      /\b(institutional|institutions|13f|hedge funds?|asset managers?|holders?|holdings|ownership|accumulat\w*|positions in)\b/i,
    ],
  },
  geopolitics: {
    label: 'Geopolitical and sanctions exposure',
    cues: [
      /\b(sanction\w*|ofac|export controls?|embargo\w*|tensions?|conflict|war|invasion|blockade|tariffs?|geopolitic\w*|escalat\w*|disruption)\b/i,
    ],
  },
  company_financials: {
    label: 'Company financials and exposure',
    cues: [
      /\b(revenue|sales|earnings|margins?|financially|exposed|exposure|dependence|dependent|guidance|capex|spending)\b/i,
    ],
  },
  market_performance: {
    label: 'Market performance',
    cues: [
      /\b(performance|performing|returns?|rall\w*|sell-?off|price action|outperform\w*|best|worst|gainers|losers)\b/i,
    ],
  },
  analyst_views: {
    label: 'Analyst expectations',
    cues: [
      /\b(analysts?|price targets?|ratings?|upgrades?|downgrades?|consensus|expectations?)\b/i,
    ],
  },
  commodity: {
    label: 'Commodity markets',
    cues: [
      /\b(copper|oil|crude|brent|gold|silver|natural gas|lithium|uranium|wheat|corn|soybeans|coffee|cocoa|sugar|aluminum|platinum|palladium|commodit\w*)\b/i,
    ],
  },
  macro: {
    label: 'Macroeconomic context',
    cues: [
      /\b(interest rates?|fed|federal reserve|inflation|gdp|recession|dollar|china demand|global growth)\b/i,
    ],
  },
  prediction: {
    label: 'Prediction markets',
    cues: [/\b(odds|probability|chance|likely|will .+ (?:happen|pass|win))\b/i],
  },
  ipo: {
    label: 'IPO intelligence',
    cues: [/\b(ipo|initial public offering|listing|went public|go public)\b/i],
  },
  competition: {
    label: 'Competitive landscape',
    cues: [/\b(competit\w*|rivals?|market share|peers?|custom silicon|substitut\w*)\b/i],
  },
  editorial: { label: 'Ezana editorial', cues: [] },
  news: {
    label: 'Recent developments',
    cues: [/\b(latest|recent|news|developments?|today|this week)\b/i],
  },
};

/**
 * Evidence sources. `category` drives the evidence explorer grouping;
 * `reliability` is a 0..1 prior used in evidence scoring (official filings
 * and government records above market vendors above news above editorial
 * analysis). `needs` lists the params a source requires; the planner skips a
 * source whose needs cannot be met and records why.
 */
export const SOURCES = {
  lobbying_leaders: { category: 'government_records', reliability: 0.95, needs: [] },
  lobbying_company: { category: 'government_records', reliability: 0.95, needs: ['tickers'] },
  congress_sector: { category: 'government_records', reliability: 0.95, needs: ['tickers'] },
  congress_company: { category: 'government_records', reliability: 0.95, needs: ['tickers'] },
  politician_dossier: { category: 'government_records', reliability: 0.95, needs: ['politician'] },
  contracts_history: { category: 'government_records', reliability: 0.95, needs: ['tickers'] },
  institutional_13f: { category: 'corporate_filings', reliability: 0.9, needs: ['tickers'] },
  sec_filings: { category: 'corporate_filings', reliability: 0.9, needs: ['tickers'] },
  market_snapshot: { category: 'market_data', reliability: 0.85, needs: ['ticker'] },
  analysts: { category: 'market_data', reliability: 0.75, needs: ['ticker'] },
  revenue_geo: { category: 'corporate_filings', reliability: 0.85, needs: ['tickers'] },
  price_performance: { category: 'market_data', reliability: 0.85, needs: ['tickers'] },
  commodity_series: { category: 'market_data', reliability: 0.85, needs: ['commodity'] },
  sanctions: { category: 'government_records', reliability: 0.95, needs: [] },
  macro_country: { category: 'historical', reliability: 0.85, needs: ['country'] },
  industry_registry: { category: 'ezana_datasets', reliability: 0.8, needs: ['industry'] },
  prediction_markets: { category: 'ezana_datasets', reliability: 0.6, needs: [] },
  echo: { category: 'supporting_research', reliability: 0.6, needs: [] },
  news: { category: 'news', reliability: 0.6, needs: [] },
  ipo_filings: { category: 'corporate_filings', reliability: 0.9, needs: ['ticker'] },
  company_financials: { category: 'corporate_filings', reliability: 0.95, needs: ['ticker'] },
  product_segments: { category: 'corporate_filings', reliability: 0.85, needs: ['ticker'] },
  holder_positioning: { category: 'corporate_filings', reliability: 0.9, needs: ['ticker'] },
  peer_financials: { category: 'corporate_filings', reliability: 0.9, needs: ['ticker'] },
  customer_capex: { category: 'corporate_filings', reliability: 0.9, needs: ['ticker'] },
  estimates: { category: 'market_data', reliability: 0.75, needs: ['ticker'] },
};

/** Evidence explorer groups, in display order. */
export const EVIDENCE_CATEGORIES = [
  ['ezana_datasets', 'Ezana proprietary datasets'],
  ['government_records', 'Government records'],
  ['corporate_filings', 'Corporate filings'],
  ['market_data', 'Financial and market data'],
  ['news', 'News and publications'],
  ['historical', 'Historical information'],
  ['calculated', 'Calculated metrics'],
  ['supporting_research', 'Supporting research'],
];

/**
 * Retrieval configuration v1: domain -> source -> weight (0..1). A missing
 * pair is 0, so a domain never pulls in a source it has no use for (the OECD
 * figures never ride along on an AI lobbying question).
 */
export const DEFAULT_CONFIG = {
  version: 'v1',
  threshold: 0.3,
  weights: {
    company: {
      market_snapshot: 0.9,
      analysts: 0.7,
      sec_filings: 0.5,
      news: 0.6,
      echo: 0.3,
      institutional_13f: 0.5,
      contracts_history: 0.4,
      congress_company: 0.4,
      lobbying_company: 0.4,
    },
    politician: { politician_dossier: 1, news: 0.6, echo: 0.3 },
    country: { macro_country: 1, news: 0.6, prediction_markets: 0.4, echo: 0.4, sanctions: 0.3 },
    industry: { industry_registry: 0.9, price_performance: 0.5, news: 0.5, echo: 0.4 },
    sector: { congress_sector: 0.8, price_performance: 0.8, contracts_history: 0.7, news: 0.4 },
    lobbying: { lobbying_leaders: 1, lobbying_company: 0.9, news: 0.5, echo: 0.3 },
    congress_trading: {
      congress_sector: 1,
      congress_company: 1,
      politician_dossier: 0.9,
      news: 0.3,
    },
    contracts: { contracts_history: 1, news: 0.3 },
    institutional: { holder_positioning: 1, institutional_13f: 0.8, sec_filings: 0.5 },
    geopolitics: {
      sanctions: 0.8,
      revenue_geo: 0.9,
      news: 0.8,
      prediction_markets: 0.5,
      echo: 0.5,
    },
    company_financials: {
      company_financials: 1,
      product_segments: 0.8,
      revenue_geo: 0.9,
      market_snapshot: 0.7,
      analysts: 0.6,
      sec_filings: 0.5,
    },
    competition: { peer_financials: 1, industry_registry: 0.5, news: 0.6 },
    market_performance: { price_performance: 1, market_snapshot: 0.7 },
    analyst_views: { analysts: 1, estimates: 0.9 },
    commodity: { commodity_series: 1, news: 0.8, prediction_markets: 0.4, echo: 0.4 },
    macro: { macro_country: 0.7, news: 0.6, prediction_markets: 0.4 },
    prediction: { prediction_markets: 1, news: 0.4 },
    ipo: { ipo_filings: 1, market_snapshot: 0.8, news: 0.6 },
    editorial: { echo: 1 },
    news: { news: 1 },
  },
};

/** The weight of a source for a domain under a config. */
export function weightOf(config, domain, source) {
  return Number(config?.weights?.[domain]?.[source]) || 0;
}
