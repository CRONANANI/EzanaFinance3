// src/lib/ezana-echo-article-industry-net-margins-2026.js
// Ezana Echo article: which US-listed industries actually keep the money.
// Built on Aswath Damodaran's "Price and Value to Sales Ratios and Margins by
// Industry Sector (US)" table at NYU Stern, data as of January 2026, and the
// circulating Buysiders graphic drawn from it (industries with at least 20
// listed firms). Every number below is a figure from that table or simple
// Ezana arithmetic on it (implied price/earnings = price/sales ÷ net margin).
// No chart colour is hardcoded (figures read the --echo-chart-* tokens).
// Findings only, not advice.
//
// No hero image ships with this piece: the hub lays out a text tile until one
// is added under public/echo/ and referenced from heroImage.
export const industryNetMargins2026 = {
  id: 'industries-that-actually-make-money-net-margins-2026',
  title: 'Which Industries Actually Keep the Money? Reading the 2026 Margin Map',
  excerpt:
    'Semiconductors keep 30 cents of every revenue dollar; biotech loses five. A widely shared ranking of US industry net margins is right on the numbers, but the columns it leaves out (operating margin, valuation, sample size) change what the ranking means.',
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'A chart titled "Industries that actually make money" has been circulating on finance Instagram this month. It ranks US-listed industries by net margin, the share of revenue left after every cost, interest payment and tax bill, and it only admits industries with at least 20 listed firms, on the sensible grounds that a thin sample can swing on one bad year. Semiconductors top it at 30.45%. Biotechnology sits at the bottom at -5.00%.',
    },
    {
      type: 'paragraph',
      text: "We pulled the source, Aswath Damodaran's January 2026 industry margin table at NYU Stern, and checked every bar. The numbers are right. What the chart leaves out is where the story gets interesting: how those margins compare with the market as a whole, how much of the gap is operating profit versus everything below it, and what investors are already paying for each industry's earnings.",
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Semiconductor net margin',
          value: '30.45%',
          change: '66 firms · top of the table',
        },
        { label: 'Total US market net margin', value: '9.74%', change: '5,994 firms' },
        { label: 'Biotech net margin', value: '-5.00%', change: '496 firms · bottom of the table' },
        { label: 'Semiconductor price/sales', value: '15.46x', change: 'vs 3.07x for the market' },
      ],
    },
    {
      type: 'paragraph',
      text: 'This is a findings piece, not advice. We are reading a dataset, not recommending a position.',
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 1 · THE MARGIN MAP',
      kicker:
        'NET MARGIN BY INDUSTRY, % (BARS, LEFT AXIS) · NUMBER OF US-LISTED FIRMS (LINE, RIGHT AXIS) · THE SIX MOST PROFITABLE AND FIVE MOST LOSS-MAKING INDUSTRIES WITH 20+ FIRMS',
      hint: 'Hover any industry for its margin and how many companies it averages over.',
      source:
        'Aswath Damodaran, Price and Value to Sales Ratios and Margins by Industry Sector (US), NYU Stern, January 2026.',
      categories: [
        'Semiconductor',
        'Software (Ent.)',
        'Precious Metals',
        'Banks (Regional)',
        'Software (Sys. & App.)',
        'Retail (REITs)',
        'Advertising',
        'Software (Internet)',
        'Chemical (Basic)',
        'Recreation',
        'Drugs (Biotech)',
      ],
      series: [
        {
          label: 'Net margin',
          kind: 'bar',
          unit: '%',
          values: [30.45, 29.93, 28.59, 27.49, 25.49, 23.0, -0.3, -0.93, -3.73, -4.72, -5.0],
        },
        {
          label: 'Firms',
          kind: 'line',
          unit: '',
          values: [66, 77, 56, 568, 309, 26, 52, 29, 29, 49, 496],
          dash: true,
        },
      ],
    },

    { type: 'heading', text: 'The top six keep three times the market average', level: 2 },
    {
      type: 'paragraph',
      text: 'Across all 5,994 US-listed companies in the dataset, the aggregate net margin is 9.74%; strip out financials and it is 8.56%. Every one of the six industries at the top of the chart keeps between 23% and 30.45% of revenue, roughly two and a half to three times the market. Semiconductors at 30.45% and entertainment software at 29.93% are a hair apart; precious metals (28.59%), regional banks (27.49%), system and application software (25.49%) and retail REITs (23.00%) follow.',
    },
    {
      type: 'paragraph',
      text: 'One caveat matters before anything else. Damodaran builds these industry figures as aggregates, summing net income and revenue across the group, so the largest companies dominate. The semiconductor number describes the industry as a pool of revenue, not the typical chipmaker, and an investor holding a small-cap semiconductor name should not assume it keeps 30 cents on the dollar.',
    },
    {
      type: 'paragraph',
      text: 'The 20-firm cut-off also changes the leaderboard in one visible place. Money-center banks, the 15 largest US lenders, post a 28.89% net margin in the same table. With five more listed firms they would rank fourth, above their regional peers.',
    },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 2 · BEFORE AND AFTER THE BOTTOM LINE',
      kicker:
        'PRE-TAX OPERATING MARGIN (FILLED) VS NET MARGIN (HOLLOW), % · THE GAP IS EVERYTHING BELOW THE OPERATING LINE: INTEREST, TAXES, WRITE-DOWNS AND ONE-OFF ITEMS · CLICK A ROW FOR THE RECORD',
      hint: 'The longer the bar, the more an industry loses between operating profit and the bottom line.',
      source:
        'Aswath Damodaran, NYU Stern, January 2026: pre-tax operating margin and net margin columns. Ezana arithmetic for the gaps.',
      scale: 'linear',
      unit: '%',
      rows: [
        {
          label: 'Precious Metals',
          sub: '56 firms',
          before: 28.59,
          after: 40.43,
          beforeDisplay: '28.59%',
          afterDisplay: '40.43%',
          delta: 11.84,
          deltaDisplay: '+11.84 pts',
          favorable: 'up',
          record:
            'The highest pre-tax operating margin of any industry on the chart, 40.43%, narrows to a 28.59% net margin. Nearly 12 points of revenue go to items below the operating line.',
        },
        {
          label: 'Retail (REITs)',
          sub: '26 firms',
          before: 23.0,
          after: 38.64,
          beforeDisplay: '23.00%',
          afterDisplay: '38.64%',
          delta: 15.64,
          deltaDisplay: '+15.64 pts',
          favorable: 'up',
          record:
            'The widest gap among the six leaders: a 38.64% pre-tax operating margin against 23.00% net. Shopping-centre landlords carry property debt, so interest expense sits between the two.',
        },
        {
          label: 'Semiconductor',
          sub: '66 firms',
          before: 30.45,
          after: 35.31,
          beforeDisplay: '30.45%',
          afterDisplay: '35.31%',
          delta: 4.86,
          deltaDisplay: '+4.86 pts',
          favorable: 'up',
          record:
            'A 35.31% pre-tax operating margin and a 30.45% net margin: under five points lost below the operating line, the narrowest gap of the six.',
        },
        {
          label: 'Software (Sys. & App.)',
          sub: '309 firms',
          before: 25.49,
          after: 33.21,
          beforeDisplay: '25.49%',
          afterDisplay: '33.21%',
          delta: 7.72,
          deltaDisplay: '+7.72 pts',
          favorable: 'up',
          record:
            'A 33.21% pre-tax operating margin and 25.49% net across 309 firms, the largest sample among the profitable industries outside regional banks.',
        },
        {
          label: 'Software (Ent.)',
          sub: '77 firms',
          before: 29.93,
          after: 33.67,
          beforeDisplay: '29.93%',
          afterDisplay: '33.67%',
          delta: 3.74,
          deltaDisplay: '+3.74 pts',
          favorable: 'up',
          record:
            'Entertainment software converts operating profit to net profit most efficiently of the six: 33.67% pre-tax operating, 29.93% net.',
        },
        {
          label: 'Drugs (Pharmaceutical)',
          sub: '228 firms · not on the chart',
          before: 18.54,
          after: 29.54,
          beforeDisplay: '18.54%',
          afterDisplay: '29.54%',
          delta: 11.0,
          deltaDisplay: '+11.00 pts',
          favorable: 'up',
          record:
            'Included for contrast with biotech: established drugmakers post a 29.54% pre-tax operating margin and an 18.54% net margin. They do not make the top six, but they are nowhere near the bottom five.',
        },
      ],
      verdict:
        'Regional banks are left off this figure on purpose: their pre-tax operating margin in the table is -0.12%, a number that is not meaningful for lenders, whose main cost is the interest they pay.',
    },

    { type: 'heading', text: 'Banks are a different animal', level: 2 },
    {
      type: 'paragraph',
      text: 'Regional banks are the surprise entry in the top six, and the one most likely to be misread. Their 27.49% net margin is real, but bank "revenue" is not the same object as a chipmaker\'s sales. A lender\'s core business is the spread between what it earns on loans and what it pays on deposits, which is why the operating-margin column in the same table reads -0.12% for regional banks and 0.08% for money-center banks. That column was designed for companies that sell goods and services. For banks, read the net margin alongside credit quality and funding costs, not instead of them.',
    },
    {
      type: 'paragraph',
      text: 'The sample is also the largest on the chart by a distance. At 568 firms, regional banks contribute more companies than the other five profitable industries combined.',
    },

    { type: 'heading', text: 'Margin is not the same as a bargain', level: 2 },
    {
      type: 'paragraph',
      text: 'The same Damodaran table carries a price-to-sales ratio for each industry: what the market pays for a dollar of revenue. Dividing it by net margin gives a rough implied price-to-earnings multiple, and that is where the ranking stops being a shopping list.',
    },
    {
      type: 'bubble-field',
      figureLabel: 'FIG. 3 · WHAT THE MARKET ALREADY PAYS',
      kicker:
        'NET MARGIN, % (ACROSS) VS PRICE/SALES, X (UP) · BUBBLE AREA = NUMBER OF US-LISTED FIRMS · DASHED LINES = TOTAL-MARKET 9.74% NET MARGIN AND 3.07X PRICE/SALES',
      hint: 'Upper right is high margin and already richly priced; upper left is richly priced without the margin.',
      source:
        'Aswath Damodaran, NYU Stern, January 2026: net margin, price/sales and firm-count columns.',
      xLabel: 'Net margin, %',
      yLabel: 'Price/sales, x',
      zLabel: 'Firms',
      xThreshold: 9.74,
      yThreshold: 3.07,
      zoneLabel: 'Above-market margin and multiple',
      points: [
        { label: 'Semiconductor', x: 30.45, y: 15.46, z: 66 },
        { label: 'Software (Ent.)', x: 29.93, y: 9.01, z: 77 },
        { label: 'Precious Metals', x: 28.59, y: 5.84, z: 56 },
        { label: 'Banks (Regional)', x: 27.49, y: 3.67, z: 568 },
        { label: 'Software (Sys. & App.)', x: 25.49, y: 11.01, z: 309 },
        { label: 'Retail (REITs)', x: 23.0, y: 7.82, z: 26 },
        { label: 'Drugs (Pharma)', x: 18.54, y: 5.63, z: 228 },
        { label: 'Advertising', x: -0.3, y: 1.64, z: 52 },
        { label: 'Software (Internet)', x: -0.93, y: 8.76, z: 29 },
        { label: 'Chemical (Basic)', x: -3.73, y: 0.47, z: 29 },
        { label: 'Recreation', x: -4.72, y: 1.26, z: 49 },
        { label: 'Drugs (Biotech)', x: -5.0, y: 7.31, z: 496 },
      ],
    },
    {
      type: 'paragraph',
      text: "Semiconductors trade at 15.46 times sales, five times the market's 3.07, which works out to roughly 51 times earnings. System and application software sits near 43 times. Regional banks, with almost the same net margin as software, trade at 3.67 times sales, or about 13 times earnings. The market is not ignoring margin; it is paying for how durable and how fast-growing it expects that margin to be.",
    },
    {
      type: 'paragraph',
      text: 'The upper-left corner is the other half of that story. Internet software (8.76 times sales) and biotech (7.31 times sales) carry negative net margins and multiples above the market average. Investors there are pricing future profits that do not yet show up in the aggregate. Basic chemicals, at 0.47 times sales, are priced for exactly the thin, cyclical margins they report.',
    },

    { type: 'heading', text: 'The loss-makers mostly make an operating profit', level: 2 },
    {
      type: 'paragraph',
      text: 'The bottom half of the chart reads as five money-losing industries. The operating column says something narrower: every one of them is profitable before interest and taxes. The losses happen below the operating line.',
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 4 · LOSING MONEY BELOW THE LINE',
      kicker:
        'THE FIVE MOST LOSS-MAKING INDUSTRIES · NET MARGIN, % (BARS, LEFT AXIS) VS PRE-TAX OPERATING MARGIN, % (LINE, RIGHT AXIS)',
      hint: 'Every line point sits above zero: all five are profitable at the operating level.',
      source:
        'Aswath Damodaran, NYU Stern, January 2026: net margin and pre-tax operating margin columns.',
      categories: [
        'Advertising',
        'Software (Internet)',
        'Chemical (Basic)',
        'Recreation',
        'Drugs (Biotech)',
      ],
      series: [
        { label: 'Net margin', kind: 'bar', unit: '%', values: [-0.3, -0.93, -3.73, -4.72, -5.0] },
        {
          label: 'Pre-tax operating margin',
          kind: 'line',
          unit: '%',
          values: [10.05, 3.74, 2.86, 8.06, 8.76],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Biotech is the starkest case: an 8.76% pre-tax operating margin in aggregate against a -5.00% net margin, a gap of almost 14 points. Recreation (8.06% operating, -4.72% net) and advertising (10.05% operating, -0.30% net) show the same shape. The table does not itemise what sits in the gap. Interest on debt, tax charges, impairments and one-time items all live there, and in an aggregate those can come from a handful of large companies rather than the industry as a whole.',
    },
    {
      type: 'paragraph',
      text: 'That is the practical lesson of the bottom five. "Loss-making" on a net basis can mean an industry whose businesses do not work, or one whose businesses work but whose balance sheets, tax positions or recent write-downs do not. The chart cannot tell those apart. The operating column starts to.',
    },

    { type: 'heading', text: 'Where the companies actually are', level: 2 },
    {
      type: 'paragraph',
      text: 'The eleven industries on the chart account for 1,757 of the 5,994 companies in the dataset, about 29%. They are not evenly sized. Two industries, regional banks (568) and biotech (496), make up more than 60% of that total, and they sit at opposite ends of the ranking.',
    },
    {
      type: 'market-treemap',
      figureLabel: 'FIG. 5 · THE CHART, WEIGHTED BY COMPANY COUNT',
      kicker:
        'TILE AREA = NUMBER OF US-LISTED FIRMS · COLOUR = NET MARGIN (GREEN PROFITABLE, RED LOSS-MAKING, SCALE CLAMPED AT ±10%)',
      hint: 'Two tiles dominate: regional banks and biotech.',
      source: 'Aswath Damodaran, NYU Stern, January 2026: firm-count and net margin columns.',
      groups: [
        {
          label: 'Most profitable',
          leaves: [
            { label: 'Banks (Regional)', size: 568, perf: 27.49 },
            { label: 'Software (Sys. & App.)', size: 309, perf: 25.49 },
            { label: 'Software (Ent.)', size: 77, perf: 29.93 },
            { label: 'Semiconductor', size: 66, perf: 30.45 },
            { label: 'Precious Metals', size: 56, perf: 28.59 },
            { label: 'Retail (REITs)', size: 26, perf: 23.0 },
          ],
        },
        {
          label: 'Most loss-making',
          leaves: [
            { label: 'Drugs (Biotech)', size: 496, perf: -5.0 },
            { label: 'Advertising', size: 52, perf: -0.3 },
            { label: 'Recreation', size: 49, perf: -4.72 },
            { label: 'Software (Internet)', size: 29, perf: -0.93 },
            { label: 'Chemical (Basic)', size: 29, perf: -3.73 },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The small tiles deserve the most caution. Retail REITs (26 firms), internet software and basic chemicals (29 each) sit just above the 20-firm floor, so one large company having an unusual year moves the whole industry figure. Internet software is a useful example of how narrow these definitions are: at 29 firms and a -0.93% net margin, it is a different universe from the 309-firm system and application software group earning 25.49%. "Software" is not one margin.',
    },
    {
      type: 'paragraph',
      text: 'The same goes for real estate. The broad REIT category, 190 firms, nets 13.23%; the retail slice that makes the top six nets 23.00%. Which bucket an industry is cut into decides whether it makes the leaderboard.',
    },

    { type: 'heading', text: 'How to read the margin map', level: 2 },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 6 · WHAT EACH BAR IS REALLY SAYING',
      kicker:
        'THE ELEVEN INDUSTRIES ON THE CHART PLUS TWO LEFT OFF IT · THE HEADLINE MARGIN, THE NUMBER BESIDE IT THAT CHANGES ITS MEANING, AND THE CAVEAT · CLICK DOSSIER + FOR THE RECORD',
      hint: 'Read the second column before the first.',
      source:
        'Aswath Damodaran, NYU Stern, January 2026. Implied price/earnings is Ezana arithmetic: price/sales divided by net margin.',
      headers: ['Industry', 'Net margin', 'The number beside it', 'Read it as', ''],
      rows: [
        {
          name: 'Semiconductor',
          tag: '66 firms',
          role: '30.45%',
          anchor: '15.46x sales, about 51x earnings',
          keyRisk: 'The richest margin on the chart is also the most fully priced',
          dossier: [
            {
              label: 'Operating',
              text: '35.31% pre-tax operating margin; under five points lost below the line.',
            },
            { label: 'Valuation', text: '15.46x price/sales against 3.07x for the total market.' },
            { label: 'Caveat', text: 'An aggregate: the largest chipmakers set the number.' },
          ],
        },
        {
          name: 'Software (Entertainment)',
          tag: '77 firms',
          role: '29.93%',
          anchor: '9.01x sales, about 30x earnings',
          keyRisk: 'Near-semiconductor margins at a lower multiple',
          dossier: [
            {
              label: 'Operating',
              text: '33.67% pre-tax operating margin, the tightest operating-to-net conversion of the six.',
            },
            { label: 'Valuation', text: '9.01x price/sales.' },
          ],
        },
        {
          name: 'Precious Metals',
          tag: '56 firms',
          role: '28.59%',
          anchor: '40.43% pre-tax operating margin',
          keyRisk: 'Margins that move with the metal price',
          dossier: [
            { label: 'Operating', text: 'The highest operating margin on the chart.' },
            { label: 'Valuation', text: '5.84x price/sales, about 20x earnings.' },
            { label: 'Caveat', text: 'A January 2026 snapshot of a commodity-priced industry.' },
          ],
        },
        {
          name: 'Banks (Regional)',
          tag: '568 firms',
          role: '27.49%',
          anchor: '3.67x sales, about 13x earnings',
          keyRisk: 'Bank revenue is not comparable to product sales',
          dossier: [
            {
              label: 'Operating',
              text: '-0.12% pre-tax operating margin, a column that is not meaningful for lenders.',
            },
            { label: 'Sample', text: 'The largest group on the chart by firm count.' },
          ],
        },
        {
          name: 'Software (System & Application)',
          tag: '309 firms',
          role: '25.49%',
          anchor: '11.01x sales, about 43x earnings',
          keyRisk: 'Priced for margin durability',
          dossier: [
            { label: 'Operating', text: '33.21% pre-tax operating margin.' },
            { label: 'Valuation', text: '11.01x price/sales, second only to semiconductors.' },
          ],
        },
        {
          name: 'Retail (REITs)',
          tag: '26 firms',
          role: '23.00%',
          anchor: '38.64% pre-tax operating margin',
          keyRisk: 'Thin sample; the broad REIT group nets 13.23%',
          dossier: [
            {
              label: 'Operating',
              text: 'The widest operating-to-net gap of the six, 15.64 points.',
            },
            { label: 'Sample', text: 'Six firms above the 20-firm floor.' },
          ],
        },
        {
          name: 'Advertising',
          tag: '52 firms',
          role: '-0.30%',
          anchor: '10.05% pre-tax operating margin',
          keyRisk: 'Operationally profitable; the loss is below the line',
          dossier: [{ label: 'Valuation', text: '1.64x price/sales.' }],
        },
        {
          name: 'Software (Internet)',
          tag: '29 firms',
          role: '-0.93%',
          anchor: '8.76x sales',
          keyRisk: 'Priced for profits that have not arrived in aggregate',
          dossier: [{ label: 'Operating', text: '3.74% pre-tax operating margin.' }],
        },
        {
          name: 'Chemical (Basic)',
          tag: '29 firms',
          role: '-3.73%',
          anchor: '0.47x sales',
          keyRisk: 'The cheapest industry on the chart, priced for thin margins',
          dossier: [{ label: 'Operating', text: '2.86% pre-tax operating margin.' }],
        },
        {
          name: 'Recreation',
          tag: '49 firms',
          role: '-4.72%',
          anchor: '8.06% pre-tax operating margin',
          keyRisk: 'A 12.78-point gap below the operating line',
          dossier: [{ label: 'Valuation', text: '1.26x price/sales.' }],
        },
        {
          name: 'Drugs (Biotechnology)',
          tag: '496 firms',
          role: '-5.00%',
          anchor: '8.76% operating, 7.31x sales',
          keyRisk: 'Loss-making in aggregate, priced above the market',
          dossier: [
            {
              label: 'Operating',
              text: 'Profitable at the operating level in aggregate; a 13.76-point gap to net.',
            },
            { label: 'Contrast', text: 'Pharmaceuticals (228 firms) net 18.54%.' },
          ],
        },
        {
          name: 'Banks (Money Center)',
          tag: '15 firms · left off the chart',
          role: '28.89%',
          anchor: 'Below the 20-firm floor',
          keyRisk: 'Would rank fourth with five more listed firms',
          dossier: [{ label: 'Valuation', text: '4.09x price/sales.' }],
        },
        {
          name: 'Drugs (Pharmaceutical)',
          tag: '228 firms · left off the chart',
          role: '18.54%',
          anchor: '29.54% pre-tax operating margin',
          keyRisk: 'Outside the top six, nowhere near the bottom five',
          dossier: [{ label: 'Valuation', text: '5.63x price/sales, about 30x earnings.' }],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Three observations follow, none of them a trade.',
    },
    {
      type: 'paragraph',
      text: 'High margin is mostly priced. The most profitable industry carries the richest multiple in the table, and the two software groups that sit beside it on margin come next. The exception is regional banks, and the reason is structural rather than an oversight by the market.',
    },
    {
      type: 'paragraph',
      text: 'Net margin hides where the money is lost. All five loss-making industries are profitable before interest and taxes in aggregate. An investor screening on net margin alone would put an operationally profitable industry and a broken one in the same bucket.',
    },
    {
      type: 'paragraph',
      text: 'Definitions decide the leaderboard. A 20-firm floor keeps money-center banks off; splitting software three ways puts one slice at -0.93% and another at 25.49%; cutting retail REITs out of the broad REIT group adds ten points of margin. The chart is accurate. It is also one of many accurate charts the same table could draw.',
    },
    {
      type: 'paragraph',
      text: "For readers who follow these industries through funds rather than single names, the common trackers are sector ETFs such as SMH for semiconductors, IGV for software, KRE for regional banks, GDX for gold miners and XBI for biotech. Their holdings and weightings differ from Damodaran's industry definitions, so their margins will not match the table exactly.",
    },
    {
      type: 'callout',
      variant: 'disclaimer',
      text: "Figures from Aswath Damodaran's Price and Value to Sales Ratios and Margins by Industry Sector (US) table, NYU Stern, data as of January 2026. Implied price/earnings multiples are Ezana arithmetic (price/sales divided by net margin) and are approximations. Ezana Finance publishes findings, not investment advice. Nothing here is a recommendation to buy or sell any security.",
    },
  ],
  author: 'Ezana Finance Editorial',
  category: 'markets-companies',
  subcategory: 'Equities',
  meta: {
    sectors: [
      'Information Technology',
      'Financials',
      'Materials',
      'Real Estate',
      'Health Care',
      'Communication Services',
      'Consumer Discretionary',
    ],
    industries: [
      'Semiconductors',
      'Interactive Home Entertainment',
      'Systems Software',
      'Application Software',
      'Gold',
      'Silver',
      'Regional Banks',
      'Diversified Banks',
      'Retail REITs',
      'Advertising',
      'Internet Services & Infrastructure',
      'Commodity Chemicals',
      'Leisure Products',
      'Biotechnology',
      'Pharmaceuticals',
    ],
    investors: [],
    // Institutions: the dataset's publisher and the account whose graphic the
    // piece re-reads are the only named non-government organisations.
    institutions: ['NYU Stern School of Business', 'Buysiders'],
    government: [],
    geos: ['United States'],
    assetClasses: ['Equities', 'ETFs'],
    themes: ['Profitability', 'Valuation', 'Industry Benchmarks', 'Margins'],
    datasets: [],
    markets: [],
  },
  // Industry-level piece: the only symbols the text names are the sector ETFs
  // in the closing section.
  tickers: ['SMH', 'IGV', 'KRE', 'GDX', 'XBI'],
  readTime: 8,
  publishedAt: '2026-10-26',
  featured: false,
  articleOfMonth: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '26 Oct 2026',
};
