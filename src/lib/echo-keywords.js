/**
 * Ezana Echo — keyword registry.
 *
 * Keywords are pedagogically-relevant terms surfaced inside articles. When a
 * reader clicks one, a popup opens with a short definition + a visual template
 * (timeline / comparison / formula / schema) + a link to a learning-center course.
 *
 * To add a keyword:
 *   1. Add an entry to KEYWORDS keyed by slug
 *   2. Reference it in article text using [[kw:slug]]display text[[/kw]]
 */

export const KEYWORDS = {
  /* ════════════════════════════════════════════════════════════════════════
     Sector Dominance article keywords
     ════════════════════════════════════════════════════════════════════════ */

  'market-indices': {
    id: 'market-indices',
    term: 'Stock Market Indices',
    definition:
      'A weighted basket of stocks that represents a portion of the market. Indices like the S&P 500, NASDAQ Composite, and Dow Jones Industrial Average let investors track how a group of companies is performing without buying every stock individually.',
    template: 'comparison',
    templateData: {
      title: 'How major US indices differ',
      headers: ['Index', 'Stocks', 'Weighting'],
      rows: [
        { label: 'S&P 500', cells: ['500 large-cap US', 'Market-cap weighted'] },
        { label: 'Dow Jones', cells: ['30 large US companies', 'Price-weighted'] },
        { label: 'NASDAQ Comp.', cells: ['~3,000 NASDAQ stocks', 'Market-cap weighted'] },
        { label: 'Russell 2000', cells: ['2,000 small-caps', 'Market-cap weighted'] },
      ],
      footnote: 'Each index tells a different story about the market.',
    },
    realWorld:
      "When a news headline says 'the market was up 1% today,' it usually means the S&P 500 rose 1%. The Dow's 30 stocks make it a narrower picture; the Russell 2000 captures smaller companies that bigger indices miss.",
    courseId: 'stocks-basic-4',
    courseTitle: 'Understanding Market Indices',
  },

  'market-capitalization': {
    id: 'market-capitalization',
    term: 'Market Capitalization',
    definition:
      "Market cap is the total dollar value of a company's outstanding shares. Calculated as: share price × shares outstanding. It's how investors compare company sizes regardless of share price alone.",
    template: 'formula',
    templateData: {
      formula: 'Market Cap = Share Price × Shares Outstanding',
      example: {
        title: 'Apple example',
        substitution: '$200 × 15.4 billion shares = $3.08 trillion',
      },
      tiers: [
        { label: 'Mega-cap', value: '$200B+', color: '#10b981' },
        { label: 'Large-cap', value: '$10B–$200B', color: '#3b82f6' },
        { label: 'Mid-cap', value: '$2B–$10B', color: '#f59e0b' },
        { label: 'Small-cap', value: '$300M–$2B', color: '#a855f7' },
      ],
    },
    realWorld:
      "When the article says Apple's market cap passed $3 trillion, that means the total value of every share — if you summed every shareholder's holdings — equals 3 trillion dollars. For context, that's larger than the entire GDP of France.",
    courseId: 'stocks-basic-3',
    courseTitle: 'How to Read a Stock Quote',
  },

  'sector-rotation': {
    id: 'sector-rotation',
    term: 'Sector Rotation',
    definition:
      'The pattern of investors moving capital between different sectors of the economy as economic conditions change. Different sectors tend to outperform at different stages of the business cycle.',
    template: 'schema',
    templateData: {
      title: 'Sectors that lead at each economic stage',
      nodes: [
        { label: 'Early recovery', sectors: ['Technology', 'Consumer Discretionary'], color: '#10b981' },
        { label: 'Mid-expansion', sectors: ['Industrials', 'Materials'], color: '#3b82f6' },
        { label: 'Late expansion', sectors: ['Energy', 'Financials'], color: '#f59e0b' },
        { label: 'Recession', sectors: ['Utilities', 'Consumer Staples', 'Healthcare'], color: '#a855f7' },
      ],
    },
    realWorld:
      "The article shows sector rotation playing out across CENTURIES instead of business cycles. The same logic applies on shorter timescales: when interest rates fall, defensive sectors lose favor and growth sectors take the lead.",
    courseId: 'stocks-intermediate-4',
    courseTitle: 'Sector Analysis',
  },

  antitrust: {
    id: 'antitrust',
    term: 'Antitrust Law',
    definition:
      "Federal laws designed to prevent monopolies, cartels, and anti-competitive business practices. The Sherman Act (1890) and Clayton Act (1914) are the foundations of US antitrust regulation, used to break up Standard Oil, AT&T, and others.",
    template: 'timeline',
    templateData: {
      title: 'Major US antitrust actions',
      events: [
        { year: '1890', label: 'Sherman Act passed', detail: 'First federal antitrust law' },
        { year: '1911', label: 'Standard Oil broken up', detail: 'Split into 34 companies' },
        { year: '1914', label: 'Clayton Act passed', detail: 'Strengthened Sherman Act' },
        { year: '1982', label: 'AT&T breakup', detail: 'Created the "Baby Bells"' },
        { year: '2001', label: 'Microsoft case settled', detail: 'Avoided breakup, restricted practices' },
        { year: '2024+', label: 'Big Tech scrutiny', detail: 'Google, Amazon, Apple, Meta cases ongoing' },
      ],
    },
    realWorld:
      "When the article describes Standard Oil being broken up in 1911 into 34 companies — Exxon, Chevron, Mobil, Amoco — that's antitrust law in action. The same legal framework is now being applied to today's tech giants.",
    courseId: 'stocks-advanced-7',
    courseTitle: 'Macroeconomics for Traders',
  },

  dividends: {
    id: 'dividends',
    term: 'Dividends',
    definition:
      "Cash payments companies make to shareholders, usually quarterly. They represent a portion of profits paid out rather than reinvested. Mature, profitable companies pay dividends; high-growth companies typically don't.",
    template: 'comparison',
    templateData: {
      title: 'Dividend stocks vs growth stocks',
      headers: ['Type', 'Examples', 'Yield'],
      rows: [
        { label: 'Dividend Aristocrats', cells: ['Coca-Cola, Johnson & Johnson', '2-4%'] },
        { label: 'High-Yield Stocks', cells: ['REITs, utilities', '4-7%'] },
        { label: 'Growth Stocks', cells: ['Tesla, Nvidia, Amazon', '0%'] },
        { label: 'Mixed', cells: ['Microsoft, Apple', '0.5-1%'] },
      ],
      footnote: '"Aristocrats" are S&P 500 companies that have raised dividends for 25+ consecutive years.',
    },
    realWorld:
      "The article describes the post-war energy & materials era as paying 'generous dividends.' That meant a $10,000 stake in US Steel or Standard Oil might pay $400-700 per year just in cash dividends — without selling a single share.",
    courseId: 'stocks-intermediate-5',
    courseTitle: 'Dividend Investing',
  },

  'growth-vs-value': {
    id: 'growth-vs-value',
    term: 'Growth vs Value Investing',
    definition:
      "Two opposing investment philosophies. Growth investors buy companies expanding rapidly, accepting high valuations for future potential. Value investors buy companies trading below their intrinsic worth, betting the market will eventually recognize them.",
    template: 'comparison',
    templateData: {
      title: 'Two opposing schools',
      headers: ['Style', 'Looks for', 'Famous practitioners'],
      rows: [
        { label: 'Growth', cells: ['High revenue growth, large addressable market', 'Cathie Wood, Peter Lynch'] },
        { label: 'Value', cells: ['Low P/E ratio, strong cash flow, undervalued', 'Warren Buffett, Charlie Munger'] },
        { label: 'GARP', cells: ['Growth At Reasonable Price (hybrid)', 'Peter Lynch (later years)'] },
        { label: 'Quality', cells: ['Best businesses regardless of price', 'Terry Smith, Nick Train'] },
      ],
      footnote: 'Most professional investors blend elements of both approaches.',
    },
    realWorld:
      "When the article describes early 1980s investors learning to value tech companies differently than steel manufacturers, that was growth-vs-value tension at work. Buying Microsoft in 1990 looked expensive on traditional value metrics but was a bargain on growth metrics.",
    courseId: 'stocks-intermediate-6',
    courseTitle: 'Growth vs Value Investing',
  },

  'pe-ratio': {
    id: 'pe-ratio',
    term: 'P/E Ratio',
    definition:
      "Price-to-Earnings ratio: a company's share price divided by its earnings per share. The most-cited single number for measuring whether a stock is expensive. Low P/E = cheap, high P/E = expensive — but interpretation depends on growth rate and sector norms.",
    template: 'formula',
    templateData: {
      formula: 'P/E = Share Price ÷ Earnings Per Share',
      example: {
        title: 'Apple example',
        substitution: '$200 ÷ $6.50 = 30.8',
      },
      tiers: [
        { label: 'Low (often value)', value: '< 15', color: '#10b981' },
        { label: 'Average', value: '15–25', color: '#3b82f6' },
        { label: 'High (growth)', value: '25–50', color: '#f59e0b' },
        { label: 'Very high', value: '> 50', color: '#ef4444' },
      ],
    },
    realWorld:
      "The article describes early-1980s railroad stocks trading at low single-digit P/Es — investors paid less than $5 for every $1 of earnings. By the 2000 dot-com peak, some tech stocks had P/Es over 200. Today, Nvidia's P/E sits around 50 — high, but justified by triple-digit growth.",
    courseId: 'stocks-intermediate-1',
    courseTitle: 'Fundamental Analysis 101',
  },

  /* ════════════════════════════════════════════════════════════════════════
     Fiber Optic Cable article keywords
     ════════════════════════════════════════════════════════════════════════ */

  'producer-price-index': {
    id: 'producer-price-index',
    term: 'Producer Price Index (PPI)',
    definition:
      'The PPI measures the average change over time in selling prices received by domestic producers. Unlike CPI (which tracks consumer prices), PPI captures price movements at the wholesale/factory level — before goods reach retail shelves.',
    template: 'comparison',
    templateData: {
      title: 'PPI vs CPI',
      headers: ['Metric', 'What it measures', 'Who uses it'],
      rows: [
        { label: 'PPI', cells: ['Prices received by producers', 'Manufacturers, commodity traders'] },
        { label: 'CPI', cells: ['Prices paid by consumers', 'Fed policy, wage negotiations'] },
      ],
      footnote: 'Rising PPI often leads CPI — factory price increases eventually pass through to consumers.',
    },
    realWorld:
      "When the PPI for fiber optic cable rises, it signals that demand is outrunning supply at the factory level. Cable installers and data center operators will soon pay more, which flows into Corning's revenue and margins.",
    courseId: 'macro-indicators-2',
    courseTitle: 'Understanding Economic Indicators',
  },

  'compound-annual-growth-rate': {
    id: 'compound-annual-growth-rate',
    term: 'CAGR (Compound Annual Growth Rate)',
    definition:
      'CAGR measures the mean annual growth rate of an investment or market over a specified time period longer than one year. It smooths out volatility to show a steady trajectory — useful for comparing growth across different time horizons.',
    template: 'formula',
    templateData: {
      formula: 'CAGR = (End Value / Start Value)^(1/n) – 1',
      example: {
        title: 'Fiber optic market example',
        substitution: 'Start (2024): $6.7B · End (2034): $30.6B · Years: 10 · CAGR: ~16.4%',
      },
    },
    realWorld:
      'A 16% CAGR means the fiber optic cable market roughly doubles every 4.5 years. For investors, CAGR is more honest than "total growth" because it accounts for compounding and time.',
    courseId: 'valuation-101-3',
    courseTitle: 'Growth Rate Analysis',
  },

  'data-center': {
    id: 'data-center',
    term: 'Data Center',
    definition:
      'A facility housing networked computers and storage used to organize, process, store, and disseminate large amounts of data. AI training requires massive data center buildouts with thousands of GPU racks connected by fiber optic cables.',
    template: 'schema',
    templateData: {
      title: 'Data center infrastructure stack',
      nodes: [
        { label: 'Power Grid', sectors: [], color: '#10b981' },
        { label: 'Cooling Systems', sectors: [], color: '#3b82f6' },
        { label: 'Server Racks (GPUs)', sectors: [], color: '#f59e0b' },
        { label: 'Networking (Fiber Optic)', sectors: [], color: '#a855f7' },
        { label: 'Storage (SSD/HDD)', sectors: [], color: '#64748b' },
        { label: 'Software Layer', sectors: [], color: '#0ea5e9' },
      ],
    },
    realWorld:
      'A single hyperscale data center can cost $500M–$2B to build. Meta, Microsoft, Amazon, and Google are each spending $30–50B+ per year on data center capex — and most of that networking layer is fiber optic cable.',
    courseId: 'tech-fundamentals-5',
    courseTitle: 'Understanding Cloud Infrastructure',
  },

  'multicore-fiber': {
    id: 'multicore-fiber',
    term: 'Multicore Fiber (MCF)',
    definition:
      'An optical fiber strand containing multiple light-carrying cores within a single 125-micron cladding. Traditional fiber has one core; MCF packs 4+ cores in the same diameter, multiplying data density without increasing cable bulk.',
    template: 'comparison',
    templateData: {
      title: 'Single-core vs Multicore fiber',
      headers: ['Type', 'Cores', 'Density', 'Use case'],
      rows: [
        { label: 'Single-core', cells: ['1', '1× baseline', 'Telecom backhaul, submarine cables'] },
        { label: 'MCF (4-core)', cells: ['4', '4× density', 'AI data centers, rack-to-rack'] },
      ],
      footnote: "Corning's MCF reduces cable count by 75% in data center deployments.",
    },
    realWorld:
      "When a data center needs to connect 100,000 GPU racks, the difference between 1-core and 4-core fiber is the difference between 200,000 cable runs and 50,000. That's not just cost savings — it's physical space savings in conduits and trays.",
    courseId: 'tech-fundamentals-6',
    courseTitle: 'Fiber Optic Technology Basics',
  },

  hyperscale: {
    id: 'hyperscale',
    term: 'Hyperscale',
    definition:
      'Refers to the massive scale at which cloud providers (Meta, Amazon, Microsoft, Google) build and operate infrastructure. Hyperscale data centers have 100,000+ servers and are designed for horizontal scaling — adding capacity by adding more identical units.',
    template: 'comparison',
    templateData: {
      title: 'Hyperscale vs enterprise data centers',
      headers: ['Feature', 'Enterprise', 'Hyperscale'],
      rows: [
        { label: 'Servers', cells: ['100–10,000', '100,000–1,000,000+'] },
        { label: 'Capex', cells: ['$5M–$50M', '$500M–$2B+'] },
        { label: 'Operators', cells: ['Company IT teams', 'Big Tech (Meta, AWS, Azure, GCP)'] },
      ],
      footnote: 'Hyperscale operators are the primary buyers of fiber optic cable today.',
    },
    realWorld:
      "When Corning signs a $6B deal with Meta for optical fiber, that's hyperscale purchasing power. A single hyperscale customer can justify building an entire new factory.",
    courseId: 'tech-fundamentals-7',
    courseTitle: 'Cloud Computing Economics',
  },

  'supply-chain': {
    id: 'supply-chain',
    term: 'Supply Chain',
    definition:
      'The entire system of organizations, people, activities, and resources involved in moving a product from supplier to customer. For fiber optic cables, this spans glass preform manufacturing, fiber drawing, cable assembly, and installation.',
    template: 'schema',
    templateData: {
      title: 'Fiber optic cable supply chain',
      nodes: [
        { label: 'Glass preform mfg (Corning, YOFC)', sectors: [], color: '#10b981' },
        { label: 'Fiber drawing', sectors: [], color: '#3b82f6' },
        { label: 'Cable assembly', sectors: [], color: '#f59e0b' },
        { label: 'Distribution', sectors: [], color: '#a855f7' },
        { label: 'Installation (telcos, data centers)', sectors: [], color: '#64748b' },
      ],
    },
    realWorld:
      'The fiber optic supply chain is oligopolistic — Corning, Prysmian, and YOFC control ~60% of global preform capacity. When AI demand surges, supply chain constraints create pricing power for manufacturers.',
    courseId: 'economics-101-4',
    courseTitle: 'Supply Chain Economics',
  },

  capex: {
    id: 'capex',
    term: 'Capital Expenditure (CapEx)',
    definition:
      'Money spent by a company to acquire, upgrade, or maintain physical assets like buildings, equipment, or infrastructure. CapEx is distinct from operating expenses (OpEx) — it represents long-term investment that gets depreciated over time.',
    template: 'formula',
    templateData: {
      formula: 'Free Cash Flow = Operating Cash Flow – CapEx',
      example: {
        title: "Meta's AI capex",
        substitution: '2025 CapEx guidance: $37B–$40B · Primarily: data center construction · Includes: fiber optic cable, GPUs, cooling',
      },
    },
    realWorld:
      "When Meta commits $6B to Corning for fiber optic cable, that's a CapEx line item on Meta's income statement. For Corning, it's revenue. Following Big Tech capex budgets tells you where infrastructure demand is heading.",
    courseId: 'accounting-101-3',
    courseTitle: 'Understanding Financial Statements',
  },

  'single-mode-vs-multi-mode': {
    id: 'single-mode-vs-multi-mode',
    term: 'Single-Mode vs Multi-Mode Fiber',
    definition:
      'Single-mode fiber has a narrow core (~9 microns) that carries one light mode over long distances with low attenuation. Multi-mode fiber has a wider core (~50 microns) that carries multiple light modes over short distances. Data centers use both: multi-mode for rack-to-rack, single-mode for building-to-building.',
    template: 'comparison',
    templateData: {
      title: 'Single-mode vs multi-mode fiber',
      headers: ['Feature', 'Single-Mode', 'Multi-Mode'],
      rows: [
        { label: 'Core diameter', cells: ['~9 µm', '~50 µm'] },
        { label: 'Distance', cells: ['Up to 100+ km', 'Up to 500 m'] },
        { label: 'Cost', cells: ['Higher (precision laser)', 'Lower (LED source)'] },
        { label: 'Use case', cells: ['Telecom backhaul, submarine', 'Data center, campus'] },
      ],
      footnote: 'AI data centers consume massive quantities of both types.',
    },
    realWorld:
      'Submarine cables spanning oceans use single-mode exclusively. Inside a data center, multi-mode handles the short rack-to-rack connections. Both segments are growing because AI drives demand across the full distance spectrum.',
    courseId: 'tech-fundamentals-6',
    courseTitle: 'Fiber Optic Technology Basics',
  },

  'margin-of-safety': {
    id: 'margin-of-safety',
    term: 'Margin of Safety',
    definition:
      'A principle from Benjamin Graham: only buy a stock when its market price is significantly below your estimate of intrinsic value. The gap between price and value is your "margin of safety" — it protects you if your analysis is wrong.',
    template: 'formula',
    templateData: {
      formula: 'Margin of Safety = (Intrinsic Value – Market Price) / Intrinsic Value',
      example: {
        title: 'Example',
        substitution: 'Intrinsic value: $150 · Market price: $120 · Margin of safety: 20%',
      },
    },
    realWorld:
      "Graham's Golden Fleece — the concept that protects investors from overpaying. If you estimate a stock is worth $150 but only buy at $120, you have a 20% buffer if your valuation is off. Infrastructure companies like Corning often trade with visible margins of safety during cyclical lows.",
    courseId: 'valuation-101-1',
    courseTitle: 'Value Investing Foundations',
  },

  'dot-com-bubble': {
    id: 'dot-com-bubble',
    term: 'Dot-Com Bubble',
    definition:
      'The speculative bubble in internet-related stocks from 1995–2001. The NASDAQ rose 400% before crashing 78%. Many telecom companies overbuilt fiber optic networks during the bubble, creating a supply glut that depressed prices for over a decade.',
    template: 'timeline',
    templateData: {
      events: [
        { year: '1995', label: 'Netscape IPO — internet mania begins' },
        { year: '1999', label: 'NASDAQ peaks above 5,000' },
        { year: '2000', label: 'Bubble bursts — NASDAQ crashes 78%' },
        { year: '2001–2003', label: 'Fiber optic overcapacity, Corning stock drops 99%' },
        { year: '2017–present', label: '5G + AI drive fiber demand recovery' },
      ],
    },
    realWorld:
      'The dot-com bust left millions of miles of unused fiber optic cable buried underground ("dark fiber"). It took nearly two decades for demand to catch up to supply. The AI buildout is the first time since the bubble that demand has genuinely outpaced installed capacity.',
    courseId: 'market-history-2',
    courseTitle: 'Market Bubbles & Crashes',
  },

  /* ════════════════════════════════════════════════════════════════════════
     Iran / Commodities article keywords
     ════════════════════════════════════════════════════════════════════════ */

  'strait-of-hormuz': {
    id: 'strait-of-hormuz',
    term: 'Strait of Hormuz',
    definition:
      "A narrow waterway between Iran and Oman connecting the Persian Gulf to the Gulf of Oman. Roughly 20% of the world's oil supply passes through this chokepoint. Any disruption (military, political, or logistical) can spike global oil prices instantly.",
    template: 'schema',
    templateData: {
      title: 'Strait of Hormuz: key facts',
      nodes: [
        { label: 'Width: ~39 km at narrowest', sectors: [], color: '#ef4444' },
        { label: '~20% of global oil transit', sectors: [], color: '#f59e0b' },
        { label: '~25% of global LNG transit', sectors: [], color: '#10b981' },
        { label: 'Iran controls the northern shore', sectors: [], color: '#64748b' },
        { label: 'Key for: Saudi, Iraq, Kuwait, UAE, Qatar exports', sectors: [], color: '#3b82f6' },
      ],
    },
    realWorld:
      'When tensions rise between Iran and the US, oil traders immediately price in "Hormuz risk" — the possibility that Iran could mine, blockade, or disrupt shipping through the strait. Even a partial disruption can add $10–20/barrel to crude prices.',
    courseId: 'geopolitics-101-1',
    courseTitle: 'Geopolitical Risk in Markets',
  },

  'commodity-supercycle': {
    id: 'commodity-supercycle',
    term: 'Commodity Supercycle',
    definition:
      'A prolonged period (10–25 years) of above-trend commodity prices driven by structural demand shifts. Previous supercycles: 1900s (US industrialization), 1950s (post-WWII rebuilding), 1970s (oil shocks), 2000s (China urbanization).',
    template: 'timeline',
    templateData: {
      events: [
        { year: '1900–1920', label: 'US industrialization supercycle' },
        { year: '1945–1965', label: 'Post-WWII reconstruction' },
        { year: '1970–1980', label: 'Oil embargo / stagflation' },
        { year: '2000–2011', label: 'China urbanization demand' },
        { year: '2020–?', label: 'Energy transition + AI infrastructure (ongoing?)' },
      ],
    },
    realWorld:
      'Some analysts argue we are in the early stages of a new commodity supercycle driven by the energy transition (copper, lithium, nickel for EVs), AI infrastructure (power, cooling), and geopolitical supply disruptions (sanctions, reshoring).',
    courseId: 'commodities-101-1',
    courseTitle: 'Understanding Commodity Markets',
  },

  sanctions: {
    id: 'sanctions',
    term: 'Economic Sanctions',
    definition:
      'Restrictions imposed by governments to limit trade, financial transactions, or economic activity with targeted countries, entities, or individuals. Sanctions are a foreign policy tool used as an alternative to military action.',
    template: 'comparison',
    templateData: {
      title: 'Types of sanctions',
      headers: ['Type', 'What it restricts', 'Example'],
      rows: [
        { label: 'Trade embargo', cells: ['Import/export of goods', 'US-Cuba embargo'] },
        { label: 'Financial', cells: ['Banking, SWIFT access', 'Russia post-2022'] },
        { label: 'Sectoral', cells: ['Specific industries (oil, tech)', 'Iran oil sanctions'] },
        { label: 'Targeted', cells: ['Named individuals/entities', 'Asset freezes, travel bans'] },
      ],
      footnote: 'Sanctions often have unintended consequences — they can spike commodity prices globally.',
    },
    realWorld:
      "When the US sanctions Iranian oil exports, the lost supply (1–2M barrels/day) tightens the global market and lifts prices for every other producer. Saudi Aramco, ExxonMobil, and Chevron benefit even though they're not the target.",
    courseId: 'geopolitics-101-2',
    courseTitle: 'Sanctions & Market Impact',
  },

  'supply-disruption': {
    id: 'supply-disruption',
    term: 'Supply Disruption',
    definition:
      'An unexpected reduction in the availability of a commodity or good, typically caused by geopolitical events, natural disasters, or infrastructure failures. Supply disruptions create immediate price spikes because demand is relatively inelastic in the short term.',
    template: 'schema',
    templateData: {
      title: 'Supply disruption transmission mechanism',
      nodes: [
        { label: 'Event (war, storm, embargo)', sectors: [], color: '#ef4444' },
        { label: 'Physical supply reduced', sectors: [], color: '#f59e0b' },
        { label: 'Inventory drawdown', sectors: [], color: '#eab308' },
        { label: 'Spot price spikes', sectors: [], color: '#10b981' },
        { label: 'Futures curve shifts to backwardation', sectors: [], color: '#3b82f6' },
        { label: 'End-user costs rise', sectors: [], color: '#64748b' },
      ],
    },
    realWorld:
      'The Iran conflict disrupted tanker traffic through the Strait of Hormuz, cutting ~3M barrels/day of accessible supply. Oil prices jumped 40–55% in weeks — not because global oil ran out, but because deliverable supply shrank faster than demand could adjust.',
    courseId: 'commodities-101-2',
    courseTitle: 'Commodity Price Dynamics',
  },

  'strategic-reserves': {
    id: 'strategic-reserves',
    term: 'Strategic Petroleum Reserve (SPR)',
    definition:
      'Government-held stockpiles of crude oil maintained for emergency supply disruptions. The US SPR is the world\'s largest at ~370M barrels (down from 700M+ after drawdowns in 2022). The SPR acts as a buffer — releasing barrels can temporarily moderate price spikes.',
    template: 'timeline',
    templateData: {
      events: [
        { year: '1975', label: 'US SPR created after 1973 oil embargo' },
        { year: '2011', label: '30M barrel release during Libya conflict' },
        { year: '2022', label: '180M barrel release (largest ever) — Ukraine war' },
        { year: '2024–26', label: 'Partial refill at ~$70–80/barrel' },
      ],
    },
    realWorld:
      'After the 2022 drawdown, the US SPR dropped to its lowest level since 1984. With less buffer available, future supply disruptions (like the Iran conflict) have a larger impact on prices because the government has fewer barrels to release.',
    courseId: 'commodities-101-3',
    courseTitle: 'Oil Markets & Government Policy',
  },

  backwardation: {
    id: 'backwardation',
    term: 'Backwardation',
    definition:
      'A futures curve shape where near-term contracts trade at a higher price than longer-dated ones. It signals that the market wants supply NOW — buyers are willing to pay a premium for immediate delivery. Opposite of contango.',
    template: 'comparison',
    templateData: {
      title: 'Backwardation vs Contango',
      headers: ['Curve shape', 'Signal', 'What it means'],
      rows: [
        { label: 'Backwardation', cells: ['Near > Far', 'Current supply shortage, urgency'] },
        { label: 'Contango', cells: ['Near < Far', 'Ample supply, storage costs priced in'] },
      ],
      footnote: 'Oil markets shifted into steep backwardation during the Iran conflict — a clear supply-fear signal.',
    },
    realWorld:
      'When oil is in backwardation, refiners and airlines are scrambling for barrels today, not next month. For investors, backwardation in commodity futures is one of the strongest signals that a supply disruption is real, not just media noise.',
    courseId: 'commodities-101-4',
    courseTitle: 'Futures Curves & Trading',
  },

  tungsten: {
    id: 'tungsten',
    term: 'Tungsten',
    definition:
      'A rare metal with the highest melting point of any element (3,422°C). Used in ammunition, armor-piercing projectiles, cutting tools, and electronics. China controls ~80% of global tungsten supply, making it a critical strategic mineral during geopolitical conflicts.',
    template: 'schema',
    templateData: {
      title: 'Tungsten supply chain',
      nodes: [
        { label: 'Mining (80% China)', sectors: [], color: '#ef4444' },
        { label: 'Processing (APT conversion)', sectors: [], color: '#f59e0b' },
        { label: 'Alloy manufacturing', sectors: [], color: '#10b981' },
        { label: 'End uses: defense, tooling, electronics', sectors: [], color: '#3b82f6' },
      ],
    },
    realWorld:
      'Tungsten prices surged 557% since the Iran conflict began — the largest gain of any commodity tracked. Military demand for ammunition and armor-piercing rounds, combined with China restricting exports as geopolitical leverage, created a perfect supply squeeze.',
    courseId: 'commodities-101-5',
    courseTitle: 'Strategic Minerals & Defense',
  },

  'fertilizer-market': {
    id: 'fertilizer-market',
    term: 'Fertilizer Markets',
    definition:
      'The global market for nitrogen, phosphorus, and potassium (NPK) compounds used in agriculture. Natural gas is the primary feedstock for nitrogen fertilizers. When energy prices spike (oil, gas), fertilizer costs follow — directly impacting food prices worldwide.',
    template: 'schema',
    templateData: {
      title: 'Energy → fertilizer → food price chain',
      nodes: [
        { label: 'Natural gas price rises', sectors: [], color: '#ef4444' },
        { label: 'Ammonia production costs up', sectors: [], color: '#f59e0b' },
        { label: 'Urea/NPK fertilizer prices up', sectors: [], color: '#eab308' },
        { label: 'Farm input costs up', sectors: [], color: '#10b981' },
        { label: 'Food prices up', sectors: [], color: '#3b82f6' },
        { label: 'Consumer inflation', sectors: [], color: '#64748b' },
      ],
    },
    realWorld:
      'The Iran conflict disrupted Middle East energy flows, pushing natural gas prices higher. Since natural gas is ~70–80% of the cost of producing ammonia (the base for nitrogen fertilizers), fertilizer prices surged ~75% — directly threatening food security in import-dependent nations.',
    courseId: 'commodities-101-6',
    courseTitle: 'Agricultural Commodities',
  },

  /* ════════════════════════════════════════════════════════════════════════
     Hantavirus article keywords
     ════════════════════════════════════════════════════════════════════════ */

  'hantavirus-definition': {
    id: 'hantavirus-definition',
    term: 'Hantavirus',
    definition:
      'A family of viruses carried by rodents that cause two main diseases in humans: Hantavirus Pulmonary Syndrome (HPS) in the Americas and Hemorrhagic Fever with Renal Syndrome (HFRS) in Europe and Asia. HPS has a ~38% case fatality rate. There is no approved vaccine or antiviral treatment.',
    template: 'comparison',
    templateData: {
      title: 'Two forms of hantavirus disease',
      headers: ['Disease', 'Region', 'Fatality rate', 'Primary carrier'],
      rows: [
        { label: 'HPS', cells: ['Americas', '~38%', 'Deer mouse (Peromyscus maniculatus)'] },
        { label: 'HFRS', cells: ['Europe, Asia', '1–15%', 'Bank vole, striped field mouse'] },
      ],
      footnote: '~150,000 HFRS cases reported annually worldwide, mainly in China. HPS cases are rarer but far more lethal.',
    },
    realWorld:
      'Hantavirus is named after the Hantan River in South Korea, where it was first isolated in 1978. In the US, it was identified in 1993 after a cluster of mysterious deaths on a Navajo reservation in the Four Corners region.',
    courseId: 'health-101-1',
    courseTitle: 'Infectious Disease & Markets',
  },

  'andes-virus': {
    id: 'andes-virus',
    term: 'Andes Virus',
    definition:
      'A strain of hantavirus endemic to South America, primarily carried by the long-tailed pygmy rice rat. It is the ONLY hantavirus with documented human-to-human transmission — all other strains are "dead-end infections" that pass from rodent to human but not person to person.',
    template: 'schema',
    templateData: {
      title: 'Why Andes virus is unique',
      nodes: [
        { label: 'Carried by rice rats in Argentina/Chile' },
        { label: 'Can spread person-to-person (respiratory droplets)' },
        { label: 'All other hantaviruses: rodent → human only' },
        { label: 'Incubation: 1–8 weeks' },
        { label: 'Cruise ship outbreak: possible first closed-environment cluster' },
      ],
    },
    realWorld:
      'The 2018–2019 Epuyen outbreak in Argentina confirmed person-to-person transmission of Andes virus for the first time. That outbreak infected 34 people and killed 11. The MV Hondius cruise ship outbreak in 2026 may be the second.',
    courseId: 'health-101-2',
    courseTitle: 'Emerging Infectious Disease',
  },

  'who-notification': {
    id: 'who-notification',
    term: 'WHO Outbreak Notification',
    definition:
      'Under the International Health Regulations (IHR), WHO member states must notify the WHO within 24 hours of any event that may constitute a Public Health Emergency of International Concern (PHEIC). The WHO then coordinates global response through its GOARN (Global Outbreak Alert and Response Network).',
    template: 'timeline',
    templateData: {
      events: [
        { year: 'Day 0', label: 'Outbreak detected in a member state' },
        { year: '24 hours', label: 'National IHR Focal Point notifies WHO' },
        { year: '48 hours', label: 'WHO assesses risk, notifies all member states' },
        { year: '72 hours', label: 'GOARN coordination, lab networks activated' },
      ],
    },
    realWorld:
      'The US withdrew from WHO in January 2025. This means the US no longer receives IHR notifications through the formal cascade — it gets outbreak information on the same timeline as anyone reading the news. For the 2026 World Cup across 11 American cities, this gap in early warning capability is a tangible epidemiological risk.',
    courseId: 'geopolitics-101-3',
    courseTitle: 'Global Health Governance',
  },

  nndss: {
    id: 'nndss',
    term: 'NNDSS (National Notifiable Diseases Surveillance System)',
    definition:
      'The CDC system that collects and publishes data on nationally notifiable infectious diseases in the United States. Physicians and labs are required by law to report certain diseases — including hantavirus — to state health departments, which relay the data to the CDC through NNDSS.',
    template: 'schema',
    templateData: {
      title: 'How disease surveillance flows',
      nodes: [
        { label: 'Patient presents symptoms' },
        { label: 'Lab confirms pathogen' },
        { label: 'Physician reports to state' },
        { label: 'State reports to CDC/NNDSS' },
        { label: 'CDC publishes weekly MMWR tables' },
      ],
    },
    realWorld:
      'NNDSS is how we know there have been 864 hantavirus cases in the US since 1993. Without this surveillance system, outbreaks in rural areas would go undetected and uncounted.',
    courseId: 'health-101-3',
    courseTitle: 'Public Health Infrastructure',
  },

  'rodent-population-dynamics': {
    id: 'rodent-population-dynamics',
    term: 'Rodent Population Dynamics',
    definition:
      'The cyclical rise and fall of rodent populations driven by food availability, weather patterns, and predator pressure. Deer mouse populations boom after wet years (El Niño) when vegetation and seed production increase. More mice = more hantavirus exposure for humans.',
    template: 'schema',
    templateData: {
      title: 'El Niño → mice → hantavirus cycle',
      nodes: [
        { label: 'Heavy rains (El Niño)' },
        { label: 'Abundant vegetation/seeds' },
        { label: 'Deer mouse population boom' },
        { label: 'Mice invade human structures' },
        { label: 'Humans inhale aerosolized excreta' },
        { label: 'Hantavirus cases spike' },
      ],
    },
    realWorld:
      'The 1993 hantavirus discovery year — with 48 cases, the highest ever — followed a period of heavy El Niño rains in the Four Corners region. Researchers at UNM have found over 30 small mammal species in New Mexico that carry live hantavirus, beyond just the deer mouse.',
    courseId: 'health-101-4',
    courseTitle: 'Environmental Drivers of Disease',
  },

  'four-corners-region': {
    id: 'four-corners-region',
    term: 'Four Corners Region',
    definition:
      'The geographic area where Utah, Colorado, New Mexico, and Arizona meet — the only place in the US where four states share a single boundary point. This arid, rural region is the epicenter of US hantavirus cases due to the high density of deer mice in proximity to human dwellings.',
    template: 'comparison',
    templateData: {
      title: 'Four Corners states: hantavirus cases (1993–2023)',
      headers: ['State', 'Cases', '% of US total'],
      rows: [
        { label: 'New Mexico', cells: ['129', '14.9%'] },
        { label: 'Colorado', cells: ['121', '14.0%'] },
        { label: 'Arizona', cells: ['92', '10.6%'] },
        { label: 'Utah', cells: ['48', '5.6%'] },
      ],
      footnote: 'Combined: 390 of 864 US cases (45%) from just four states.',
    },
    realWorld:
      'Hantavirus was originally called "Four Corners disease" before it was formally named. The Navajo Nation, which spans parts of all four states, was particularly affected in 1993. Traditional Navajo knowledge already recognized a connection between increased mouse populations and respiratory illness — long before Western medicine identified the virus.',
    courseId: 'health-101-5',
    courseTitle: 'Geography of Disease',
  },

  'incubation-period': {
    id: 'incubation-period',
    term: 'Incubation Period',
    definition:
      'The time between exposure to a pathogen and the onset of symptoms. For hantavirus, the incubation period is unusually long: 1 to 8 weeks (most commonly 2-4 weeks). This long window makes contact tracing difficult because patients may not remember their exposure event.',
    template: 'comparison',
    templateData: {
      title: 'Incubation periods of notable pathogens',
      headers: ['Pathogen', 'Incubation', 'Implication'],
      rows: [
        { label: 'Influenza', cells: ['1–4 days', 'Rapid spread, rapid detection'] },
        { label: 'COVID-19', cells: ['2–14 days', 'Moderate tracing window'] },
        { label: 'Hantavirus', cells: ['1–8 weeks', 'Very difficult to trace exposure'] },
        { label: 'HIV', cells: ['2–4 weeks (acute)', 'Years before AIDS'] },
      ],
      footnote: 'Longer incubation periods make outbreak investigation harder.',
    },
    realWorld:
      'On the MV Hondius, the first patient developed symptoms on April 6 — five days after departure from Ushuaia on April 1. With a 1-8 week incubation period, he could have been infected anytime from early February to early April, including before boarding.',
    courseId: 'health-101-6',
    courseTitle: 'Epidemiology Basics',
  },

  'contact-tracing': {
    id: 'contact-tracing',
    term: 'Contact Tracing',
    definition:
      'The process of identifying, notifying, and monitoring people who have been in contact with an infected person. For the MV Hondius outbreak, contact tracing spans passengers who disembarked at multiple ports across different countries, co-passengers on medical evacuation flights, and healthcare workers at receiving hospitals.',
    template: 'schema',
    templateData: {
      title: 'MV Hondius contact tracing challenge',
      nodes: [
        { label: '147 passengers from 23 countries' },
        { label: 'Multiple port stops (Antarctica → Saint Helena → Ascension → Cabo Verde)' },
        { label: 'Medical evacuations to South Africa' },
        { label: 'Flight co-passengers at risk' },
        { label: '5 countries coordinating response' },
      ],
    },
    realWorld:
      'Contact tracing for a cruise ship is exponentially harder than for a land-based outbreak. Passengers scattered to 23 countries after disembarking, each with different health surveillance systems. The WHO is coordinating between Cabo Verde, Netherlands, Spain, South Africa, and the UK.',
    courseId: 'health-101-7',
    courseTitle: 'Outbreak Response Methods',
  },

  ecmo: {
    id: 'ecmo',
    term: 'ECMO (Extracorporeal Membrane Oxygenation)',
    definition:
      'A life-support machine that pumps blood outside the body through an artificial lung (oxygenator) and back in. Used when the lungs are too damaged to oxygenate blood on their own. In severe hantavirus cases, ECMO can keep patients alive while their lungs recover — but it requires specialized ICU equipment and trained perfusionists.',
    template: 'schema',
    templateData: {
      title: 'How ECMO works',
      nodes: [
        { label: 'Blood drawn from patient via catheter' },
        { label: 'Pumped through artificial oxygenator' },
        { label: 'CO₂ removed, O₂ added' },
        { label: 'Blood returned to patient' },
        { label: 'Buys time for lung recovery (days to weeks)' },
      ],
    },
    realWorld:
      'ECMO machines cost $100K-$250K each and require 24/7 specialist staffing. Most rural hospitals in the Four Corners region — where hantavirus is most common — do not have ECMO capability. Patients must be airlifted to urban tertiary care centers, adding critical delay.',
    courseId: 'health-101-8',
    courseTitle: 'Critical Care Technology',
  },

  'pandemic-preparedness': {
    id: 'pandemic-preparedness',
    term: 'Pandemic Preparedness',
    definition:
      "Government and institutional programs to develop countermeasures (vaccines, antivirals, diagnostics) for pathogens with pandemic potential BEFORE an outbreak occurs. The NIH's ReVAMPP program and BARDA's medical countermeasure stockpile are the primary US mechanisms.",
    template: 'comparison',
    templateData: {
      title: 'US pandemic preparedness agencies',
      headers: ['Agency', 'Role', 'Budget (est.)'],
      rows: [
        { label: 'BARDA', cells: ['Develop & stockpile countermeasures', '~$8B/year'] },
        { label: 'NIH/NIAID', cells: ['Basic research, grants, clinical trials', '~$6B/year'] },
        { label: 'CDC', cells: ['Surveillance, outbreak response', '~$9B/year'] },
        { label: 'ASPR', cells: ['Strategic National Stockpile', '~$3B/year'] },
      ],
      footnote: 'Hantavirus is classified by NIH as a Category A priority pathogen for biodefense research.',
    },
    realWorld:
      'In 2024, the NIH identified hantaviruses as one of several pathogen families with no effective vaccines or treatments, making them "of special concern for pandemic potential." The ReVAMPP grants fund structural biology, vaccine candidates, and antibody therapies — but progress is slow without a commercial market to incentivize pharma investment.',
    courseId: 'health-101-9',
    courseTitle: 'Biodefense & Market Implications',
  },

  'pcr-diagnostics': {
    id: 'pcr-diagnostics',
    term: 'PCR Diagnostics',
    definition:
      "Polymerase Chain Reaction (PCR) testing amplifies tiny amounts of viral genetic material to detectable levels. It is the gold standard for confirming hantavirus infection. The MV Hondius outbreak was confirmed when PCR testing at South Africa's National Institute for Communicable Diseases detected hantavirus RNA in a critically ill patient.",
    template: 'schema',
    templateData: {
      title: 'PCR testing process',
      nodes: [
        { label: 'Patient blood/tissue sample' },
        { label: 'RNA extraction' },
        { label: 'Reverse transcription to cDNA' },
        { label: 'PCR amplification (30-40 cycles)' },
        { label: 'Detection: positive if viral RNA present' },
        { label: 'Sequencing to identify strain (Andes, Sin Nombre, etc.)' },
      ],
    },
    realWorld:
      'On the MV Hondius, initial testing for influenza, COVID-19, and legionella all came back negative. It took two rounds of negative results before clinicians in South Africa tested for hantavirus — a rarely considered diagnosis. This diagnostic delay cost critical time. Companies like Cepheid (Danaher) and BioMérieux make multiplexed PCR platforms that could include hantavirus on respiratory panels.',
    courseId: 'health-101-10',
    courseTitle: 'Diagnostic Technology',
  },

  'ihr-notifications': {
    id: 'ihr-notifications',
    term: 'IHR (International Health Regulations)',
    definition:
      'A legally binding framework of 196 countries that requires WHO member states to detect, assess, report, and respond to public health events that may cross borders. The IHR notification cascade compresses the time between outbreak detection and global response from weeks to hours.',
    template: 'timeline',
    templateData: {
      events: [
        { year: '2005', label: 'Current IHR adopted after SARS' },
        { year: '2009', label: 'H1N1 declared PHEIC under IHR' },
        { year: '2020', label: 'COVID-19 PHEIC — IHR stress-tested' },
        { year: '2025', label: 'US withdraws from WHO — exits IHR framework' },
        { year: '2026', label: 'MV Hondius outbreak: US gets no formal IHR notification' },
      ],
    },
    realWorld:
      'The IHR notification cascade is not a diplomatic nicety — it is the system that compresses outbreak detection-to-response timelines. Without it, the US receives the same information as anyone with an internet connection, on the same timeline. During the 2026 FIFA World Cup, this gap means American public health authorities may learn about relevant outbreaks later than countries still in the WHO system.',
    courseId: 'geopolitics-101-3',
    courseTitle: 'Global Health Governance',
  },

  /* ════════════════════════════════════════════════════════════════════════
     Semiconductor / Silicon Shield article keywords
     ════════════════════════════════════════════════════════════════════════ */

  'nanometer-process': {
    id: 'nanometer-process',
    term: 'Nanometer Process Node',
    definition:
      'The "nm" number (e.g., 2nm, 7nm) refers to the size of transistor features on a chip. Smaller nodes pack more transistors per square millimeter, delivering higher performance and lower power consumption. TSMC leads at 2nm; China\'s SMIC targets 7nm domestically.',
    template: 'comparison',
    templateData: {
      title: 'Process node comparison',
      headers: ['Node', 'Transistor density', 'Performance vs 7nm', 'Leading producer'],
      rows: [
        { label: '2nm', cells: ['~490M/mm²', '+45% perf, −75% power', 'TSMC (2025+)'] },
        { label: '3nm', cells: ['~290M/mm²', '+30% perf, −35% power', 'TSMC, Samsung'] },
        { label: '5nm', cells: ['~170M/mm²', '+15% perf, −20% power', 'TSMC, Samsung'] },
        { label: '7nm', cells: ['~96M/mm²', 'Baseline', 'TSMC, Samsung, SMIC (limited)'] },
      ],
      footnote: 'Smaller node = more powerful, more efficient, and much harder to manufacture.',
    },
    realWorld:
      'Each node shrink costs $15-20 billion in fab construction and takes 3-5 years of R&D. This is why only TSMC and Samsung can manufacture at the leading edge — the capital barrier is insurmountable for most companies.',
    courseId: 'tech-fundamentals-8',
    courseTitle: 'Semiconductor Manufacturing',
  },

  chokepoint: {
    id: 'chokepoint',
    term: 'Economic Chokepoint',
    definition:
      "A single point in a supply chain where disruption would cascade through the entire global economy. Taiwan's chip manufacturing is the most consequential chokepoint — more concentrated than oil (multiple producers) or rare earths (substitutes exist).",
    template: 'comparison',
    templateData: {
      title: 'Global economic chokepoints',
      headers: ['Chokepoint', 'Controls', 'Disruption impact'],
      rows: [
        { label: 'Taiwan (TSMC)', cells: ['90% advanced chips', 'Global tech, AI, military — $600B-$1T GDP hit'] },
        { label: 'Strait of Hormuz', cells: ['20% global oil', 'Energy prices, inflation — $200-400B GDP hit'] },
        { label: 'ASML (Netherlands)', cells: ['100% EUV lithography machines', 'No new advanced fabs without ASML'] },
      ],
      footnote: 'TSMC + ASML together form a two-node chokepoint — you need both to make advanced chips.',
    },
    realWorld:
      'The concentration of advanced chip manufacturing in Taiwan is more extreme than oil in the Middle East. At least 13 countries produce significant oil. Only one company produces 90%+ of advanced chips.',
    courseId: 'geopolitics-101-4',
    courseTitle: 'Supply Chain Geopolitics',
  },

  'pure-play-foundry': {
    id: 'pure-play-foundry',
    term: 'Pure-Play Foundry Model',
    definition:
      'A business model where a company manufactures chips designed by other companies, without designing or selling its own branded chips. Invented by Morris Chang at TSMC in 1987. This eliminated the conflict of interest that prevented chip designers from outsourcing to competitors.',
    template: 'schema',
    templateData: {
      title: 'How the foundry model works',
      nodes: [
        { label: 'Chip designer (Nvidia, Apple, AMD) creates design' },
        { label: 'Sends design files to TSMC' },
        { label: 'TSMC manufactures on its fab lines' },
        { label: 'Ships finished wafers back to designer' },
        { label: 'Designer packages, tests, and sells to end customers' },
      ],
    },
    realWorld:
      'Before TSMC, every major chip company had to build its own fabs ($10B+ each). The foundry model let startups like Nvidia focus entirely on design while TSMC handled the capital-intensive manufacturing. This unlocked the fabless revolution.',
    courseId: 'tech-fundamentals-9',
    courseTitle: 'Semiconductor Business Models',
  },

  'silicon-shield': {
    id: 'silicon-shield',
    term: 'Silicon Shield',
    definition:
      "The geopolitical theory that Taiwan's semiconductor manufacturing dominance deters Chinese invasion — because disrupting TSMC would cause catastrophic global economic damage, compelling Taiwan's allies to intervene militarily.",
    template: 'schema',
    templateData: {
      title: 'Silicon shield deterrence logic',
      nodes: [
        { label: 'China considers invasion' },
        { label: 'TSMC operations disrupted/destroyed' },
        { label: 'Global chip supply collapses' },
        { label: 'Tech, auto, defense industries halt' },
        { label: '$600B-$1T global GDP loss' },
        { label: 'US/Japan/allies compelled to intervene' },
      ],
    },
    realWorld:
      'Former President Tsai Ing-wen explicitly named this strategy in Foreign Affairs in 2021. Critics argue the shield is weakening as the US and China build domestic chip capacity — reducing dependence on Taiwan and potentially reducing the deterrent.',
    courseId: 'geopolitics-101-5',
    courseTitle: 'Taiwan & Semiconductor Geopolitics',
  },

  'chips-act': {
    id: 'chips-act',
    term: 'CHIPS and Science Act',
    definition:
      'A US federal law signed in 2022 providing $52 billion in subsidies and tax credits to incentivize domestic semiconductor manufacturing. The largest recipients include TSMC ($6.6B for Arizona fab), Intel ($8.5B for Ohio/Arizona), and Samsung ($6.4B for Texas).',
    template: 'comparison',
    templateData: {
      title: 'Major CHIPS Act recipients',
      headers: ['Company', 'Award', 'Location', 'Commitment'],
      rows: [
        { label: 'Intel', cells: ['$8.5B', 'Ohio, Arizona, Oregon', '$100B total investment'] },
        { label: 'TSMC', cells: ['$6.6B', 'Phoenix, Arizona', '$165B total investment'] },
        { label: 'Samsung', cells: ['$6.4B', 'Taylor, Texas', '$45B total investment'] },
        { label: 'Micron', cells: ['$6.1B', 'New York, Idaho', '$50B total investment'] },
      ],
      footnote: 'Total CHIPS Act funding: $52.7B in manufacturing incentives + $13.2B in R&D.',
    },
    realWorld:
      'The CHIPS Act is the largest US industrial policy intervention since the Interstate Highway Act. It reflects bipartisan recognition that semiconductor manufacturing is a national security priority, not just an economic one.',
    courseId: 'policy-101-1',
    courseTitle: 'Industrial Policy & Markets',
  },

  'made-in-china-2025': {
    id: 'made-in-china-2025',
    term: 'Made in China 2025',
    definition:
      "A Chinese industrial policy announced in 2015 aiming to transform China into a high-tech manufacturing superpower by 2025. Semiconductors were a key target — China aimed for 70% chip self-sufficiency by 2025 but achieved only ~33%, making it the strategy's biggest shortfall.",
    template: 'timeline',
    templateData: {
      events: [
        { year: '2015', label: 'Made in China 2025 announced — 70% chip self-sufficiency target' },
        { year: '2020', label: 'US export controls block ASML EUV sales to China' },
        { year: '2023', label: "Huawei's Mate 60 Pro uses SMIC 7nm chip — surprise breakthrough" },
        { year: '2025', label: 'China reaches ~33% self-sufficiency — misses 70% target' },
        { year: '2026', label: 'New 80% target set for 2030 by Chinese chip executives' },
      ],
    },
    realWorld:
      "China's chip ambitions are real but constrained. Without access to ASML's EUV lithography machines (blocked by US/Dutch export controls), Chinese fabs cannot manufacture below ~7nm using standard techniques. SMIC's 7nm breakthrough used older DUV equipment in a multi-patterning process that is slower, more expensive, and lower-yield than EUV.",
    courseId: 'geopolitics-101-6',
    courseTitle: "China's Technology Strategy",
  },

  'two-nanometer': {
    id: 'two-nanometer',
    term: '2-Nanometer Chips',
    definition:
      "The current leading edge of semiconductor manufacturing. TSMC's 2nm (N2) process uses Gate-All-Around (GAA) transistor architecture — a fundamental redesign from FinFET transistors used since 2012. 2nm chips deliver 45% more performance at 75% less power vs 7nm.",
    template: 'comparison',
    templateData: {
      title: '2nm vs 7nm chips',
      headers: ['Metric', '7nm', '2nm', 'Improvement'],
      rows: [
        { label: 'Performance', cells: ['Baseline', '+45%', '1.45× faster'] },
        { label: 'Power', cells: ['Baseline', '−75%', '4× more efficient'] },
        { label: 'Density', cells: ['96M/mm²', '~490M/mm²', '5× more transistors'] },
        { label: 'Fab cost', cells: ['~$5B', '~$20B+', '4× more expensive to build'] },
      ],
      footnote: 'Only TSMC and Samsung are attempting 2nm production. Intel targets 18A (roughly equivalent).',
    },
    realWorld:
      "For AI training, the difference between 7nm and 2nm is roughly the difference between training a model in 6 months versus 6 weeks — same compute, fraction of the power bill. This is why every hyperscaler is competing for TSMC 2nm allocation.",
    courseId: 'tech-fundamentals-8',
    courseTitle: 'Semiconductor Manufacturing',
  },

  'fabless-model': {
    id: 'fabless-model',
    term: 'Fabless Semiconductor Company',
    definition:
      'A company that designs chips but does not own fabrication facilities (fabs). Instead, it outsources manufacturing to foundries like TSMC. Nvidia, AMD, Qualcomm, Apple, and Broadcom are all fabless — they design the chips that TSMC manufactures.',
    template: 'comparison',
    templateData: {
      title: 'Fabless vs IDM vs Foundry',
      headers: ['Model', 'Design?', 'Manufacture?', 'Examples'],
      rows: [
        { label: 'Fabless', cells: ['Yes', 'No (outsource)', 'Nvidia, AMD, Qualcomm, Apple'] },
        { label: 'IDM', cells: ['Yes', 'Yes (own fabs)', 'Intel, Micron, Texas Instruments'] },
        { label: 'Foundry', cells: ['No', 'Yes (for others)', 'TSMC, Samsung Foundry, GlobalFoundries'] },
      ],
      footnote: 'Fabless companies capture the highest margins — Nvidia\'s net margin is ~52% vs Intel\'s negative.',
    },
    realWorld:
      'The fabless model is why Nvidia can be worth $5 trillion without owning a single factory. All the manufacturing risk, capital expenditure, and yield headaches belong to TSMC. Nvidia focuses purely on design, software, and ecosystem — the highest-margin activities.',
    courseId: 'tech-fundamentals-9',
    courseTitle: 'Semiconductor Business Models',
  },

  idm: {
    id: 'idm',
    term: 'Integrated Device Manufacturer (IDM)',
    definition:
      'A semiconductor company that both designs AND manufactures its own chips in its own fabrication facilities. Intel is the most prominent IDM. The model requires massive capital expenditure ($20B+ per fab) but provides full control over the manufacturing process.',
    template: 'schema',
    templateData: {
      title: 'IDM value chain (fully vertical)',
      nodes: [
        { label: 'Chip design (in-house)' },
        { label: 'Wafer fabrication (own fabs)' },
        { label: 'Testing & packaging' },
        { label: 'Sales to OEMs and consumers' },
      ],
    },
    realWorld:
      "Intel's struggle illustrates the IDM challenge: you must be world-class at BOTH design and manufacturing simultaneously. When Intel fell behind TSMC in manufacturing (stuck at 10nm while TSMC shipped 5nm), its entire product line suffered — because unlike Nvidia, Intel couldn't just switch to a better foundry.",
    courseId: 'tech-fundamentals-9',
    courseTitle: 'Semiconductor Business Models',
  },

  'idm-2-0': {
    id: 'idm-2-0',
    term: 'IDM 2.0 Strategy',
    definition:
      "Intel's strategic pivot announced in 2021: splitting into separate design and foundry divisions, and opening Intel's fabs to manufacture chips for external customers (Intel Foundry Services / IFS). The goal is to combine IDM vertical integration with foundry-model revenue.",
    template: 'timeline',
    templateData: {
      events: [
        { year: '2021', label: 'Pat Gelsinger announces IDM 2.0 at Intel' },
        { year: '2022', label: 'IFS launched — Intel accepts external foundry orders' },
        { year: '2024', label: 'Intel 18A process in development (comparable to 2nm)' },
        { year: '2025', label: 'CHIPS Act awards Intel $8.5B for Ohio/Arizona fabs' },
        { year: '2026', label: 'Intel reports -$20.5B net income TTM — turnaround uncertain' },
      ],
    },
    realWorld:
      "IDM 2.0 is Intel's bet-the-company strategy. If it works, Intel becomes both a leading chip designer AND a TSMC competitor. If it fails, Intel may need to split or sell its foundry business. The -$20.5B net income shows the cost of this transition — Intel is spending massively on new fabs while its existing products lose market share to AMD and Nvidia.",
    courseId: 'tech-fundamentals-10',
    courseTitle: "Intel's Transformation",
  },

  terafab: {
    id: 'terafab',
    term: 'Terafab',
    definition:
      "Elon Musk's planned advanced chip fabrication facility in Texas for Tesla and SpaceX. The concept consolidates every stage of semiconductor production — design, fabrication, packaging, testing — under one roof. Estimated cost: $25 billion.",
    template: 'schema',
    templateData: {
      title: 'Terafab concept: vertically integrated chip production',
      nodes: [
        { label: 'Chip design (Tesla AI team)' },
        { label: 'Wafer fabrication (on-site)' },
        { label: 'Advanced packaging' },
        { label: 'Testing & validation' },
        { label: 'Direct integration into Tesla/SpaceX products' },
      ],
    },
    realWorld:
      "Musk's motivation: TSMC cannot produce enough chips for Tesla's Full Self-Driving compute needs and SpaceX's Starlink satellite processors. Building a captive fab eliminates supply chain dependence but requires replicating capabilities that took TSMC 37 years to develop.",
    courseId: 'tech-fundamentals-11',
    courseTitle: 'Vertical Integration in Tech',
  },

  onshoring: {
    id: 'onshoring',
    term: 'Onshoring / Reshoring',
    definition:
      'The process of moving manufacturing from overseas locations back to the home country. In semiconductors, onshoring refers to the US and European efforts to build domestic chip fabrication capacity to reduce dependence on Taiwan.',
    template: 'comparison',
    templateData: {
      title: 'Semiconductor onshoring efforts',
      headers: ['Country', 'Investment', 'Key projects'],
      rows: [
        { label: 'United States', cells: ['$52B (CHIPS Act) + private', 'TSMC Arizona, Intel Ohio, Samsung Texas'] },
        { label: 'European Union', cells: ['€43B (EU Chips Act)', 'Intel Magdeburg, TSMC Dresden'] },
        { label: 'Japan', cells: ['¥3.9T ($26B)', 'TSMC Kumamoto, Rapidus Hokkaido'] },
        { label: 'India', cells: ['$10B incentives', 'Tata-PSMC Gujarat fab'] },
      ],
      footnote: 'Even with these investments, analysts expect Taiwan to retain 60%+ of advanced chip production through 2030.',
    },
    realWorld:
      'Onshoring sounds straightforward but is extraordinarily difficult. TSMC\'s Arizona fab has faced delays, cost overruns, and talent shortages. Building a fab is a $20B+ commitment that takes 3-5 years — and the technology may advance a full node in that time, requiring redesigns.',
    courseId: 'policy-101-2',
    courseTitle: 'Manufacturing Reshoring',
  },
};

export function getKeywordById(id) {
  return KEYWORDS[id] || null;
}

/** @param {string} [_articleId] Reserved for per-article filtering (sprint 2). */
export function getKeywordsForArticle(_articleId) {
  return Object.values(KEYWORDS);
}
