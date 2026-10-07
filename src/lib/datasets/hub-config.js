/**
 * What each dimension hub shows beyond its taxonomy: the example prompts on
 * its EzanaQL bar, its linkage cards, the planned source for each dataset
 * that is not live yet, and (for dimensions without data) what the first two
 * roadmap datasets will show. Sources follow docs/DATASETS_ROADMAP.md.
 * Pure, no imports.
 */

export const HUB_EXAMPLE_PROMPTS = {
  capitol: [
    'Which members bought stock in the last 90 days?',
    'Top 10 contractors by award value this fiscal year',
    'Members who raised the most money this cycle',
  ],
  titans: [
    'Stocks held by the most institutional funds',
    'Activist stakes above 5 percent in the last 90 days',
    'The highest scored whale moves',
  ],
  hive: [
    'The biggest prediction markets by volume',
    'Close calls: markets near 50 percent with real volume',
    'The most liquid markets right now',
  ],
  lighthouse: [
    'Which countries have the highest unemployment in 2025?',
    'Every indicator for the United States since 2020',
    'Real GDP growth by country in 2025',
  ],
};

/**
 * Linkage cards per dimension. `id` keys getLinkage in hub-data.js.
 * `preview` cards show data from a dataset that is not live yet and say so.
 */
export const HUB_LINKAGES = {
  capitol: [
    {
      id: 'capitol-near-contracts',
      title: 'Trades near contract awards',
      wide: true,
      why: 'The best 30-day returns on trades made within 30 days of a federal contract award to the same company, by politicians, corporate insiders, institutions and whales.',
      window: 'Trades and filings in the last 2 years; awards within 30 days either side',
      sources:
        'House Clerk and Senate disclosures, SEC Forms 4, 13F, 13D and 13G, USAspending.gov, daily closing prices',
      coverage:
        'Returns run from the first close on or after the trade to the first close 30 days later; a sale counts as a gain when the price fell. Institutions and whales are measured from the filing date, since 13F and 13D/G filings carry no trade date.',
      empty:
        'Appears once a trade near an award has 30 days of price history after it. New awards and disclosures arrive daily.',
    },
    {
      id: 'capitol-award-leaders',
      title: 'Who reads contract awards best',
      why: 'Rankings of the traders whose moves around federal contract awards paid off most often, and the companies whose stock tends to rise after their awards.',
      window: 'Trades and awards in the last 2 years',
      sources:
        'House Clerk and Senate disclosures, SEC filings, USAspending.gov, daily closing prices',
      coverage:
        'Insight score: average 30-day return times hit rate, scaled down for small samples so one lucky trade does not top the table.',
      empty: 'Fills once traders have measured trades near contract awards.',
      badges: true,
    },
    {
      id: 'capitol-committee-sectors',
      title: "Trades in sectors a member's committees oversee",
      why: 'Companies a member traded in a sector their committee oversees, ranked by confidence: the largest share of any one committee whose members hold the stock. Every committee with a holder is listed.',
      window: 'Trades in the last 180 days; holdings as of the latest disclosures',
      sources: 'House Clerk and Senate disclosures, congress-legislators project',
      empty:
        'Appears when a member trades a mapped ticker in a sector one of their committees oversees. Tickers outside the sector map are not guessed.',
      noteKey: 'committee',
      coverage:
        'Committee counts cover full committees of 10 or more members, not subcommittees or smaller panels. Holding means disclosures show a purchase not followed by a full sale; members report up to 45 days after a trade.',
    },
    {
      id: 'capitol-lobbying-contracts',
      title: 'Lobbying and contracts, same company',
      why: 'Companies that lobbied this year and won federal contracts in the last 12 months.',
      window: 'Lobbying this calendar year; awards in the last 12 months',
      sources: 'Senate LDA filings (lda.gov), USAspending.gov',
      empty:
        'Appears when a verified public lobbying client also has contract awards in the window.',
      coverage: 'Verified public lobbying clients only.',
    },
    {
      id: 'capitol-raisers-trade',
      title: 'Top raisers who also trade',
      why: 'The members raising the most this cycle, and how often they disclosed trades.',
      window: 'Current FEC cycle; trades in the last 12 months',
      sources: 'FEC (api.open.fec.gov), House Clerk and Senate disclosures',
      empty: 'Appears when a top raiser this cycle has disclosed a trade in the last 12 months.',
    },
  ],
  titans: [
    {
      id: 'titans-confluence',
      title: 'Confluence: funds adding with other groups active',
      why: 'Big funds are adding and insiders, an activist or members of Congress are active in the same stock.',
      window: 'Fund moves from the latest quarters; other signals in the last 90 days',
      sources: 'SEC EDGAR Forms 13F, 13D, 13G and 4; House Clerk and Senate disclosures',
      empty:
        'Appears when a stock funds are adding also has insider buying, an activist stake or member purchases.',
    },
    {
      id: 'titans-insider-adds',
      title: 'Insider buying into fund adds',
      why: 'Officers and directors buying on the open market in stocks funds are adding.',
      window: 'Insider buys in the last 90 days',
      sources: 'SEC EDGAR Forms 13F and 4',
      empty: 'Appears once Form 4 open-market buys land in a stock funds are adding.',
    },
    {
      id: 'titans-crowded',
      title: 'Most crowded adds this quarter',
      why: 'The stocks the most funds opened or added to in the latest scored quarter.',
      window: 'Latest quarter of scored whale moves',
      sources: 'SEC EDGAR Form 13F (Ezana whale score)',
      empty: 'Appears as scored whale moves for the quarter land.',
    },
    {
      id: 'titans-activist-targets',
      title: 'Activist targets',
      why: 'The newest 5 percent stakes, and whether insiders sold in the 30 days after.',
      window: 'Newest Schedule 13D and 13G filings',
      sources: 'SEC EDGAR Schedules 13D and 13G, Form 4',
      empty: 'Appears as Schedule 13D and 13G stakes are filed.',
    },
  ],
  lighthouse: [
    {
      id: 'lighthouse-oecd-moves',
      title: 'Largest moves in the latest OECD release',
      why: 'The biggest changes between the latest and the prior observation, by country and series.',
      window: 'Latest two annual observations per series',
      sources: 'OECD Economic Outlook (CC BY 4.0)',
      empty: 'Appears once two annual observations are loaded for a series.',
    },
  ],
  hive: [
    {
      id: 'hive-biggest',
      title: 'Biggest markets now',
      why: 'Open prediction markets ranked by money traded.',
      window: 'Open markets',
      sources: 'Polymarket',
      empty: 'Appears as open markets are indexed.',
    },
    {
      id: 'hive-tickers',
      title: 'Markets tied to tickers',
      why: 'Markets whose outcome is tied to a listed company.',
      window: 'Open markets',
      sources: 'Polymarket',
      empty:
        'Appears when a market is matched to a listed company. None are matched in the index yet.',
    },
  ],
  regulatory: [
    {
      id: 'regulatory-bills',
      title: 'Bills with the newest actions',
      why: 'Congressional bills, newest floor or committee action first.',
      window: 'Latest actions on file',
      sources: 'Congress.gov API',
      empty: 'Appears as bills are synced from Congress.gov.',
      preview: true,
    },
    {
      id: 'regulatory-meetings',
      title: 'Committee meetings',
      why: 'Scheduled and recent committee meetings and hearings.',
      window: 'Latest meetings on file',
      sources: 'Congress.gov API',
      empty: 'Appears as committee meetings are synced from Congress.gov.',
      preview: true,
    },
  ],
};

/** Planned source for each dataset without live data (docs/DATASETS_ROADMAP.md). */
export const PLANNED_SOURCE = {
  'Patent Activity': 'USPTO PatentsView and the USPTO Open Data Portal',
  'Satellite Imagery': 'Copernicus Sentinel-2 and 5P, NASA Black Marble, NASA FIRMS',
  'Commercial Real Estate Activity':
    'FRED commercial real estate series, Census construction spending',
  'Supply Chain Monitoring': 'IMF PortWatch, NY Fed supply chain pressure index, Census trade API',
  'Search Interest Data': 'Google Trends API (by application), Wikipedia pageviews',
  'Web Traffic Analytics': 'Cloudflare Radar, Tranco ranking',
  'App Download Velocity': 'Apple top-chart rankings',
  'Consumer Spending Trends': 'FRED, Census Monthly Retail Trade, BEA, Opportunity Insights',
  'Prediction Markets': 'Polymarket (live index), Kalshi, Manifold',
  'Platform Community Signals': 'Ezana community (first-party)',
  'Retail Sentiment Data': 'ApeWisdom',
  'Crowdsourced Intelligence': 'Metaculus, Manifold',
  'Global & Macro': 'IMF Data (SDMX) and FRED',
  'World Bank Economic Indicators': 'World Bank Indicators API',
  'Geopolitical Risk Indices': 'Caldara and Iacoviello GPR index',
  'Sanctions & Trade Policy Tracking': 'OFAC sanctions lists, WTO tariff and trade API',
  'GDELT Global Events Database': 'GDELT 2.0',
  'New Laws & Policy Legislation': 'Congress.gov API, GovInfo API',
  'Lawsuits & Legal Proceedings': 'CourtListener and RECAP federal dockets',
  'Regulatory Investigations & Enforcement': 'SEC, DOJ, CFPB and openFDA enforcement data',
  'Government Agency Rulings & Decisions': 'Federal Register API, Regulations.gov API',
};

/** For dimensions without live data: the first two roadmap datasets and their signal. */
export const HUB_WILL_SHOW = {
  eyes: [
    {
      dataset: 'Patent Activity',
      signal: 'Patent grant and application momentum by assignee, matched to tickers.',
    },
    {
      dataset: 'Supply Chain Monitoring',
      signal: 'Daily port calls and chokepoint transits, and the supply chain pressure index.',
    },
  ],
  whispers: [
    {
      dataset: 'Consumer Spending Trends',
      signal: 'Turns in retail sales and personal consumption, by category.',
    },
    {
      dataset: 'Search Interest Data',
      signal: 'Attention spikes for companies and products from pageview momentum.',
    },
  ],
  regulatory: [
    {
      dataset: 'New Laws & Policy Legislation',
      signal: 'Bills moving through Congress, linked to the sectors and tickers they touch.',
    },
    {
      dataset: 'Government Agency Rulings & Decisions',
      signal:
        'Rules and agency decisions that name a company, matched to tickers members or funds hold.',
    },
  ],
};
