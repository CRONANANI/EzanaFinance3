/**
 * DATASET_TAXONOMY — the SINGLE source of truth for Ezana's dataset categories.
 *
 * These are the SAME seven dimensions the landing-page orbital map
 * (ResourcesSection / PersonalizationRadar) shows — the ids and labels are
 * identical and must not drift. Every consumer imports from here:
 *   - components/landing/ResourcesSection.js  (orbital card + radar sources)
 *   - components/landing/PersonalizationRadar.jsx (7 axes)
 *   - components/datasets/CategoryBar.jsx     (in-page 7-trigger bar)
 *   - components/Layout/Navbar.js             (top-nav Datasets mega-menu)
 *   - app/datasets/DatasetsOverviewClient.jsx (signal map: 7 arcs/colors)
 *
 * Each dimension folds in the datasets from the OLD four nav buckets so nothing
 * is lost (see the per-item comments). Every dataset lives in exactly ONE
 * dimension — no duplication.
 *
 * `live`:
 *   true  — a real dataset PAGE backs this item (reachable, real product).
 *   false — roadmap / marketing-ahead-of-build (mostly the orbital alt-data
 *           sources: satellite, web traffic, GDELT, …). Shown as "soon", never
 *           presented as live data. Roadmap items route to the dimension's
 *           nearest page or the /datasets overview.
 *
 * Colors are theme tokens only (7-colour palette from the branding guide):
 *   Capitol Watch --emerald · Titans Shadow --info · Eyes Above --cyan ·
 *   Consumer Whispers --orange · The Hive --pink ·
 *   Global Empire Lighthouse --indigo · Regulatory Winds --amber.
 */

export const DATASET_TAXONOMY = [
  {
    id: 'capitol',
    label: 'Capitol Watch',
    color: 'var(--emerald)',
    corner: 'CAPITOL WATCH',
    tagline: "Follow your politicians' investment activity",
    blurb:
      'Congressional trading, committee power, campaign money, lobbying, and the federal contracts that political influence moves.',
    items: [
      // orbital sources
      {
        label: 'US House Financial Disclosures',
        description: 'Official House member trades and holdings disclosed under the STOCK Act',
        href: '/datasets/political',
        live: true,
        source: 'House Clerk disclosures · FMP/Quiver',
        sourceType: 'gov',
      },
      {
        label: 'US Senate Financial Disclosures',
        description: 'Official Senate member trades and holdings disclosed under the STOCK Act',
        href: '/datasets/political',
        live: true,
        source: 'Senate eFD · FMP',
        sourceType: 'gov',
      },
      {
        label: 'Campaign Finance Records',
        description: 'Federal Election Commission contribution and spending data',
        href: '/datasets/campaignfinancerecords',
        live: true,
        source: 'FEC API (api.open.fec.gov)',
        sourceType: 'gov',
      },
      {
        label: 'Lobbying Activity',
        description: 'Lobbying Disclosure Act filings tracking influence efforts',
        href: '/datasets/government/lobbying',
        live: true,
        source: 'Senate LDA API (lda.gov)',
        sourceType: 'gov',
      },
      // folded in from the old nav buckets
      {
        label: 'Government Contracts', // was "Government Activity"
        description: 'Federal contract awards by recipient and agency (USAspending.gov)',
        href: '/datasets/government/contracts',
        live: true,
        source: 'USAspending.gov',
        sourceType: 'gov',
      },
      {
        label: 'Committee Assignments', // was "Congressional"
        description: 'Which committees members sit on, cross-referenced with their trades',
        href: '/datasets/political',
        live: true,
        source: 'Congress.gov API',
        sourceType: 'gov',
      },
    ],
  },
  {
    id: 'titans',
    label: 'Titans Shadow',
    color: 'var(--info)',
    corner: 'TITANS SHADOW',
    tagline: 'Keep up with the giants of finance',
    blurb:
      'Institutional and corporate-insider filings — 13F/13D-13G positions, insider trades, executive pay, ETF flows, and market prices.',
    items: [
      // orbital sources
      {
        label: '13F Filings',
        description: 'SEC quarterly institutional investor holdings and changes',
        href: '/datasets/sec-filings',
        live: true,
        source: 'SEC EDGAR · Quiver',
        sourceType: 'gov',
      },
      {
        label: '13D / 13G Filings',
        description: 'SEC filings for significant investor positions and stakes',
        href: '/datasets/sec-filings',
        live: true,
        source: 'SEC EDGAR',
        sourceType: 'gov',
      },
      {
        label: 'Fund Holdings Data',
        description: 'Institutional fund composition and manager positioning',
        href: '/datasets/sec-filings',
        live: true,
        source: 'SEC EDGAR · FMP',
        sourceType: 'gov',
      },
      {
        label: 'SEC EDGAR',
        description: 'Fund prospectuses, disclosures, and institutional reports',
        href: '/datasets/sec-filings',
        live: true,
        source: 'SEC EDGAR API (data.sec.gov)',
        sourceType: 'gov',
      },
      // folded in from the old nav buckets
      {
        label: 'Insider Trading', // was "SEC & Institutional"
        description: 'Corporate officer and director Form 4 transactions',
        href: '/datasets/sec-filings',
        live: true,
        source: 'SEC EDGAR — Form 4',
        sourceType: 'gov',
      },
      {
        label: 'Executive Compensation', // was "SEC & Institutional"
        description: 'Named-executive pay and equity awards from proxy filings',
        href: '/datasets/sec-filings',
        live: true,
        source: 'SEC EDGAR — DEF 14A',
        sourceType: 'gov',
      },
      {
        label: 'Whale Moves', // was "SEC & Institutional" (13D/13G-adjacent)
        description: 'Large activist and block positions as they cross reporting thresholds',
        href: '/datasets/sec-filings',
        live: true,
        source: 'SEC EDGAR — 13D/13G',
        sourceType: 'gov',
      },
      {
        label: 'ETF Holdings', // was "SEC & Institutional"
        description: 'ETF constituent weights and the flows that move them',
        href: '/datasets/sec-filings',
        live: true,
        source: 'SEC EDGAR — N-PORT',
        sourceType: 'gov',
      },
      {
        label: 'Prices & Fundamentals', // was "Markets & Equities"
        description: 'Real-time prices, fundamentals, and analyst ratings',
        href: '/datasets/markets',
        live: true,
        source: 'FMP · Finnhub · Alpha Vantage',
        sourceType: 'licensed',
      },
    ],
  },
  {
    id: 'eyes',
    label: 'Eyes Above',
    color: 'var(--cyan)',
    corner: 'EYES ABOVE',
    tagline: 'Watch the economy from above',
    blurb:
      'Real-world activity signals — patent momentum today, plus geospatial and supply-chain data on the roadmap.',
    items: [
      {
        label: 'Patent Activity', // folded in from the old "Government Activity"
        description: 'Granted patents and application momentum mapped to assignees',
        href: '/datasets/government',
        live: true,
        source: 'USPTO PatentsView',
        sourceType: 'gov',
      },
      // orbital alt-data sources (roadmap)
      {
        label: 'Satellite Imagery',
        description:
          'Geospatial monitoring: parking-lot occupancy, foot traffic, infrastructure use',
        href: '/datasets/alternative',
        live: false,
        source: 'NASA/USGS raw · commercial analytics',
        sourceType: 'none',
      },
      {
        label: 'Commercial Real Estate Activity',
        description: 'Property-level economic signals and utilization',
        href: '/datasets/alternative',
        live: false,
        source: 'Commercial providers',
        sourceType: 'none',
      },
      {
        label: 'Supply Chain Monitoring',
        description: 'Warehouse and logistics activity across global networks',
        href: '/datasets/alternative',
        live: false,
        source: 'Census intl. trade · CBP (partial)',
        sourceType: 'gov',
      },
    ],
  },
  {
    id: 'whispers',
    label: 'Consumer Whispers',
    color: 'var(--orange)',
    corner: 'CONSUMER WHISPERS',
    tagline: 'Catch signals from shifts in consumer behaviour',
    blurb:
      'Alternative demand signals — search interest, web traffic, app installs, and card-spend trends. On the roadmap.',
    items: [
      // the old nav "Alternative Signals" bucket folds into these orbital sources
      {
        label: 'Search Interest Data',
        description: 'Google Trends demand signals and keyword-volume tracking',
        href: '/datasets/alternative',
        live: false,
        source: 'Google Trends (unofficial)',
        sourceType: 'none',
      },
      {
        label: 'Web Traffic Analytics',
        description: 'Similarweb audience trends and traffic patterns',
        href: '/datasets/alternative',
        live: false,
        source: 'Cloudflare Radar · Similarweb',
        sourceType: 'public',
      },
      {
        label: 'App Download Velocity',
        description: 'Application growth and adoption-rate tracking',
        href: '/datasets/alternative',
        live: false,
        source: 'Commercial (data.ai / Sensor Tower)',
        sourceType: 'none',
      },
      {
        label: 'Consumer Spending Trends',
        description: 'Card and transaction data and consumer-behaviour patterns',
        href: '/datasets/alternative',
        live: false,
        source: 'Census MARTS · BEA (aggregate)',
        sourceType: 'gov',
      },
    ],
  },
  {
    id: 'hive',
    label: 'The Hive',
    color: 'var(--pink)',
    corner: 'THE HIVE',
    tagline: 'Tap into the collective wisdom',
    blurb:
      'Crowd and market-consensus signals — prediction-market odds today, with community and retail sentiment on the roadmap.',
    items: [
      {
        label: 'Prediction Markets', // = orbital "Prediction Market Odds"; old nav "Prediction Markets"
        description: 'Real-money market consensus and event odds (Polymarket)',
        href: '/datasets/prediction-markets',
        live: true,
        source: 'Polymarket · Kalshi',
        sourceType: 'public',
      },
      {
        label: 'Platform Community Signals',
        description: 'Ezana user watchlists, discussions, and posts',
        href: '/datasets',
        live: false,
        source: 'Ezana first-party',
        sourceType: 'none',
      },
      {
        label: 'Retail Sentiment Data',
        description: 'Reddit, StockTwits, and social-media investor activity',
        href: '/datasets',
        live: false,
        source: 'Reddit · StockTwits',
        sourceType: 'public',
      },
      {
        label: 'Crowdsourced Intelligence',
        description: 'Aggregate positioning and conviction levels',
        href: '/datasets',
        live: false,
        source: 'Ezana first-party · Reddit',
        sourceType: 'none',
      },
    ],
  },
  {
    id: 'lighthouse',
    label: 'Global Empire Lighthouse',
    color: 'var(--indigo)',
    corner: 'GLOBAL EMPIRE LIGHTHOUSE',
    tagline: 'Track shifts in global power and trade',
    blurb:
      'Macro and geopolitical context — global indicators and wealth today, with risk indices, sanctions, and GDELT events ahead.',
    items: [
      {
        label: 'Global & Macro', // folded in from the old "Markets" bucket
        description: 'Macro indicators, global markets, and billionaire / wealth tracking',
        href: '/datasets/global',
        live: true,
        source: 'FRED · World Bank',
        sourceType: 'gov',
      },
      {
        label: 'World Bank Economic Indicators',
        description: 'Global GDP, growth rates, and economic-health metrics',
        href: '/datasets/global',
        live: false,
        source: 'World Bank API',
        sourceType: 'gov',
      },
      {
        label: 'Geopolitical Risk Indices',
        description: 'Geopolitical-tension tracking and political-stability data',
        href: '/datasets/global',
        live: false,
        source: 'GDELT',
        sourceType: 'public',
      },
      {
        label: 'Sanctions & Trade Policy Tracking',
        description: 'Policy changes and international trade restrictions',
        href: '/datasets/global',
        live: false,
        source: 'Treasury OFAC · Census trade',
        sourceType: 'gov',
      },
      {
        label: 'GDELT Global Events Database',
        description: 'Global news events and geopolitical developments in real time',
        href: '/datasets/global',
        live: false,
        source: 'GDELT 2.0 API',
        sourceType: 'public',
      },
    ],
  },
  {
    id: 'regulatory',
    label: 'Regulatory Winds',
    color: 'var(--amber)',
    corner: 'REGULATORY WINDS',
    tagline: 'Anticipate regulatory and legal catalysts before they hit',
    blurb:
      'Legal and policy catalysts — legislation tracking today, with litigation, enforcement, and agency rulings on the roadmap.',
    items: [
      {
        label: 'New Laws & Policy Legislation', // Legislation Search page is live
        description: 'Congressional bills, new legislation, and policy changes',
        href: '/datasets/political',
        live: true,
        source: 'Congress.gov · GovInfo',
        sourceType: 'gov',
      },
      {
        label: 'Lawsuits & Legal Proceedings',
        description: 'Class actions, litigation tracking, and legal settlements',
        href: '/datasets',
        live: false,
        source: 'CourtListener · PACER',
        sourceType: 'public',
      },
      {
        label: 'Regulatory Investigations & Enforcement',
        description: 'SEC enforcement, FTC investigations, and agency actions',
        href: '/datasets',
        live: false,
        source: 'SEC · DOJ · FTC feeds',
        sourceType: 'gov',
      },
      {
        label: 'Government Agency Rulings & Decisions',
        description: 'FDA approvals/denials, EPA rulings, and major agency decisions',
        href: '/datasets',
        live: false,
        source: 'Federal Register API',
        sourceType: 'gov',
      },
    ],
  },
];

/** id → dimension, for O(1) lookups. */
export const DIMENSION_BY_ID = DATASET_TAXONOMY.reduce((m, d) => ((m[d.id] = d), m), {});

/** Ordered list of the 7 ids (orbital order). */
export const DIMENSION_IDS = DATASET_TAXONOMY.map((d) => d.id);

/** Radar hover-card details keyed by dimension id ({ tagline, sources[] }). */
export const DIMENSION_SOURCE_DETAILS = DATASET_TAXONOMY.reduce((acc, d) => {
  acc[d.id] = {
    tagline: d.tagline,
    sources: d.items.map((it) => ({ name: it.label, description: it.description, live: it.live })),
  };
  return acc;
}, {});

/** Count of live (page-backed) vs roadmap items across all dimensions. */
export const TAXONOMY_STATS = DATASET_TAXONOMY.reduce(
  (s, d) => {
    for (const it of d.items) it.live ? (s.live += 1) : (s.roadmap += 1);
    return s;
  },
  { live: 0, roadmap: 0, dimensions: DATASET_TAXONOMY.length },
);

/**
 * Source-attribution metadata (from Ezana_Dataset_Sources_Reference). Each item
 * carries `source` (the recommended provider) + `sourceType`:
 *   gov      — free U.S. government API (🟢): SEC EDGAR, USAspending, FEC, USPTO…
 *   public   — free non-gov / public API (🔵): Polymarket, GDELT, CourtListener…
 *   licensed — paid/keyed commercial data (🟡): equity prices/fundamentals (FMP,
 *              Finnhub, Alpha Vantage) — there is no government stock-price API.
 *   none     — no clean free source; genuinely commercial or first-party (⚪),
 *              kept honest as roadmap rather than claiming coverage.
 * The label is what powers the small source tag on the datasets overview.
 */
export const SOURCE_TYPE_META = {
  gov: { label: 'Gov API', tone: 'gov' },
  public: { label: 'Free API', tone: 'public' },
  licensed: { label: 'Licensed', tone: 'licensed' },
  none: { label: 'Commercial', tone: 'none' },
};
