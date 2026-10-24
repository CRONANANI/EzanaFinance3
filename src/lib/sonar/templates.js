/**
 * Sonar v2 template registry (sonar-templates-spec.md §2). One entry per
 * template: which datasets to sweep (priority order; the matches column
 * renders in this order), the brief's sections, the right-column chart
 * blocks, and the default follow-ups. sweepParams(entities, query) builds
 * the shared parameter bag the sweeps read (basket tickers, search terms).
 *
 * Declarations only: the sweeps live in sweeps.js, composition in
 * composer.js. A dataset listed here that returns no rows collapses to a
 * "no matches" chip; the brief never mentions it.
 */
import { resolveBasket, termsFor } from '@/lib/sonar/sweeps';
import { getIndustryRegistry, industryBasket } from '@/lib/sonar/industries';
import { getAdminClient } from '@/lib/supabase';

const FULL_SWEEP = [
  'market',
  'contracts',
  'f13',
  'activist',
  'congress',
  'lobbying',
  'pred_markets',
  'echo',
  'news',
];

async function basketParams(entities, query) {
  const tickers = await resolveBasket(entities);
  return { tickers, terms: termsFor(entities, query), query, entities };
}
async function termParams(entities, query) {
  return {
    tickers: entities.ticker ? [entities.ticker] : [],
    terms: termsFor(entities, query),
    query,
    entities,
  };
}

const T = (def) => ({
  charts: [],
  defaultFollowups: [],
  sweepParams: basketParams,
  ...def,
});

/* The industry layout sweeps the REGISTRY basket (public companies placed
   by their own filings), not a screener guess, and its terms are the
   industry's own words, never the raw query. */
async function industryLayoutParams(entities, query) {
  let tickers = [];
  try {
    const reg = await getIndustryRegistry(getAdminClient(), entities.industryId);
    tickers = industryBasket(reg).slice(0, 12);
  } catch {
    tickers = [];
  }
  return { tickers, terms: termsFor(entities, query), query, entities };
}

export const TEMPLATES = {
  industry_layout: T({
    label: 'Industry layout',
    datasets: FULL_SWEEP,
    briefSections: [
      'Structure',
      'Major players',
      'Where it operates',
      'Concentration',
      'Capital flows',
      'Key dependencies',
      'What to watch',
    ],
    charts: [
      { id: 'basket', type: 'ranked_bar', source: 'market', title: 'Registry companies by cap' },
      { id: 'gov_dollars', type: 'ranked_bar', source: 'contracts', title: 'Federal awards' },
    ],
    defaultFollowups: [
      'Top 10 companies by market cap',
      'Which funds hold the most of this industry?',
      'Which members of Congress trade these companies?',
      'Where are the new fabs being built?',
    ],
    sweepParams: industryLayoutParams,
  }),
  company: T({
    label: 'Company',
    datasets: FULL_SWEEP,
    briefSections: [
      'What it is',
      'Government money',
      'Smart money',
      'Political angle',
      'What to watch',
    ],
    charts: [
      { id: 'price_ytd', type: 'line', source: 'market', title: 'Price, YTD' },
      {
        id: 'contracts_by_agency',
        type: 'ranked_bar',
        source: 'contracts',
        title: 'Contracts by agency',
      },
    ],
    defaultFollowups: ['Who holds it?', 'Which politicians trade it?', 'Compare vs peers'],
  }),
  politician: T({
    label: 'Politician',
    datasets: ['congress', 'contracts', 'lobbying', 'pred_markets', 'echo', 'news'],
    briefSections: ['Who they are', 'Trading record', 'Committee angle', 'What to watch'],
    charts: [
      { id: 'trade_volume', type: 'timeline', source: 'congress', title: 'Trades over time' },
    ],
    defaultFollowups: [
      'Their biggest trades this year',
      'Committee conflicts',
      'Compare to another member',
    ],
  }),
  investor_fund: T({
    label: 'Investor / fund',
    datasets: ['f13', 'activist', 'market', 'echo', 'news'],
    briefSections: ['The book', 'Latest quarter moves', 'Activist posture', 'What to watch'],
    charts: [{ id: 'top_holdings', type: 'ranked_bar', source: 'f13', title: 'Top holdings' }],
    defaultFollowups: ['What did they buy last quarter?', 'Overlap with another fund'],
  }),
  executive_person: T({
    label: 'Executive',
    datasets: ['news', 'echo', 'market', 'congress'],
    briefSections: ['Who they are', 'Companies they are tied to', 'What to watch'],
    charts: [],
    defaultFollowups: ['Insider selling history', 'Companies they are tied to'],
  }),
  country: T({
    label: 'Country',
    datasets: ['market', 'contracts', 'pred_markets', 'echo', 'news'],
    briefSections: ['The economy now', 'Listed market', 'Cross-border money', 'What to watch'],
    charts: [
      { id: 'top_listed', type: 'ranked_bar', source: 'market', title: 'Top listed companies' },
    ],
    defaultFollowups: ['Top industries', 'Compare to the US', 'Trade exposure'],
  }),
  industry_country: T({
    label: 'Industry × country',
    datasets: FULL_SWEEP,
    briefSections: [
      'Market structure',
      'Policy & trade',
      'Government money',
      'Smart money',
      'Political angle',
      'What to watch',
    ],
    charts: [
      { id: 'basket', type: 'ranked_bar', source: 'market', title: 'Basket by market cap' },
      { id: 'sector_split', type: 'donut', source: 'market', title: 'Basket split' },
    ],
    defaultFollowups: ['Top 10 companies', 'Tariff impact', 'Compare countries'],
  }),
  industry: T({
    label: 'Industry',
    datasets: FULL_SWEEP,
    briefSections: [
      'Market structure',
      'Government money',
      'Smart money',
      'Political angle',
      'What to watch',
    ],
    charts: [
      { id: 'basket', type: 'ranked_bar', source: 'market', title: 'Top companies by cap' },
      { id: 'gov_dollars', type: 'ranked_bar', source: 'contracts', title: 'Federal awards' },
    ],
    defaultFollowups: ['Top 10 companies', 'Most-held by funds', 'Biggest lobbying spenders'],
  }),
  ranking: T({
    label: 'Ranking',
    datasets: ['market', 'contracts', 'f13', 'news'],
    briefSections: ['The ranking', 'What separates them', 'What to watch'],
    charts: [{ id: 'ranked', type: 'ranked_bar', source: 'market', title: 'Ranked by market cap' }],
    defaultFollowups: ['Rank by a different metric', 'Compare #1 vs #2'],
  }),
  comparison: T({
    label: 'Comparison',
    datasets: ['market', 'contracts', 'f13', 'congress', 'news'],
    briefSections: ['Side by side', 'Government exposure', 'Smart money', 'The verdict framing'],
    charts: [{ id: 'kpis', type: 'ranked_bar', source: 'market', title: 'Side-by-side KPIs' }],
    defaultFollowups: ['Which is cheaper?', 'Who has more government exposure?'],
    sweepParams: async (entities, query) => {
      const names = entities.compare || [];
      return {
        tickers: names.map((n) => n.toUpperCase()).filter((n) => /^[A-Z.]{1,6}$/.test(n)),
        terms: termsFor(entities, query),
        query,
        entities,
      };
    },
  }),
  policy: T({
    label: 'Policy',
    datasets: ['lobbying', 'congress', 'contracts', 'pred_markets', 'echo', 'news'],
    briefSections: [
      'What it does',
      'Who lobbied',
      'Who benefits',
      'Trading around it',
      'What to watch',
    ],
    charts: [
      {
        id: 'lobby_spend',
        type: 'ranked_bar',
        source: 'lobbying',
        title: 'Lobbying spend by client',
      },
    ],
    defaultFollowups: ['Who benefits?', 'Who lobbied for it?', 'Trades near the vote'],
    sweepParams: termParams,
  }),
  agency_program: T({
    label: 'Agency',
    datasets: ['contracts', 'lobbying', 'news', 'echo'],
    briefSections: ['The budget', 'Top recipients', 'What to watch'],
    charts: [
      { id: 'recipients', type: 'ranked_bar', source: 'contracts', title: 'Top recipients' },
    ],
    defaultFollowups: ['Top 10 contractors', 'Fastest-growing recipients'],
    sweepParams: termParams,
  }),
  commodity: T({
    label: 'Commodity',
    datasets: ['market', 'f13', 'pred_markets', 'echo', 'news'],
    briefSections: ['The price now', 'The producers', 'Who is positioned', 'What to watch'],
    charts: [{ id: 'producers', type: 'ranked_bar', source: 'market', title: 'Producers' }],
    defaultFollowups: ['Top producers', 'Who is buying producers?'],
  }),
  theme: T({
    label: 'Theme',
    datasets: FULL_SWEEP,
    briefSections: ['The thesis', 'The basket', 'Smart money', 'Government money', 'What to watch'],
    charts: [{ id: 'basket', type: 'ranked_bar', source: 'market', title: 'Theme basket' }],
    defaultFollowups: ['Picks-and-shovels names', 'Which funds are early?'],
  }),
  event_catalyst: T({
    label: 'Event',
    datasets: ['pred_markets', 'market', 'congress', 'news', 'echo'],
    briefSections: ['The setup', 'What markets price', 'Who traded before it', 'What to watch'],
    charts: [{ id: 'odds', type: 'timeline', source: 'pred_markets', title: 'Odds over time' }],
    defaultFollowups: ['How did it trade last time?', 'Who traded before it?'],
    sweepParams: termParams,
  }),
  prediction_question: T({
    label: 'Prediction market',
    datasets: ['pred_markets', 'market', 'lobbying', 'news'],
    briefSections: ['The odds', 'Why they sit there', 'Who is exposed', 'What to watch'],
    charts: [{ id: 'odds', type: 'timeline', source: 'pred_markets', title: 'Odds' }],
    defaultFollowups: ['Companies most exposed', 'Related markets'],
    sweepParams: termParams,
  }),
  supply_chain: T({
    label: 'Supply chain',
    datasets: ['contracts', 'news', 'echo', 'market'],
    briefSections: ['The relationships', 'Concentration risk', 'What to watch'],
    charts: [
      { id: 'graph', type: 'relationship_graph', source: 'contracts', title: 'Relationships' },
    ],
    defaultFollowups: ['Biggest supplier risk', 'Suppliers that politicians trade'],
    sweepParams: termParams,
  }),
  activism: T({
    label: 'Activism',
    datasets: ['activist', 'f13', 'market', 'news', 'echo'],
    briefSections: ['The campaigns', 'The filers', 'What to watch'],
    charts: [{ id: 'stakes', type: 'timeline', source: 'activist', title: 'Stakes over time' }],
    defaultFollowups: ['Activist history of the filer', 'Similar campaigns'],
    sweepParams: termParams,
  }),
  lobbying_topic: T({
    label: 'Lobbying topic',
    datasets: ['lobbying', 'congress', 'news', 'echo'],
    briefSections: ['Who spends', 'Who receives', 'What they want', 'What to watch'],
    charts: [{ id: 'spend', type: 'ranked_bar', source: 'lobbying', title: 'Spend by client' }],
    defaultFollowups: ['Members receiving most', 'Bills targeted'],
    sweepParams: termParams,
  }),
  region: T({
    label: 'Region',
    datasets: ['contracts', 'market', 'lobbying', 'news'],
    briefSections: ['The local economy', 'Government money', 'What to watch'],
    charts: [
      { id: 'region_map', type: 'choropleth', source: 'contracts', title: 'Contract dollars' },
    ],
    defaultFollowups: ['Top companies in the region', 'Government money by county'],
    sweepParams: termParams,
  }),
  etf_index: T({
    label: 'ETF / index',
    datasets: ['market', 'f13', 'congress', 'news'],
    briefSections: ['What it holds', 'Who holds it', 'What to watch'],
    charts: [{ id: 'holdings', type: 'donut', source: 'market', title: 'Holdings' }],
    defaultFollowups: ['Overlap with another ETF', 'Top holding deep-dive'],
    sweepParams: async (entities, query) => ({
      tickers: entities.etf ? [String(entities.etf).toUpperCase()] : [],
      terms: termsFor(entities, query),
      query,
      entities,
    }),
  }),
  macro_indicator: T({
    label: 'Macro indicator',
    datasets: ['macro_series', 'pred_markets', 'news', 'echo'],
    briefSections: ['The reading', 'What markets price', 'What to watch'],
    charts: [{ id: 'series', type: 'line', source: 'macro_series', title: 'The series' }],
    defaultFollowups: ['Sectors sensitive to it', 'Next release date'],
    sweepParams: termParams,
  }),
  open_question: T({
    label: 'Open question',
    datasets: ['echo', 'news', 'pred_markets', 'market', 'congress', 'contracts'],
    briefSections: ['The answer', 'What the datasets show', 'What to watch'],
    charts: [],
    defaultFollowups: [],
    sweepParams: termParams,
  }),
};

export function getTemplate(id) {
  return TEMPLATES[id] || TEMPLATES.open_question;
}
