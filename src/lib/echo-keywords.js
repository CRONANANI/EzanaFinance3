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
};

export function getKeywordById(id) {
  return KEYWORDS[id] || null;
}

/** @param {string} [_articleId] Reserved for per-article filtering (sprint 2). */
export function getKeywordsForArticle(_articleId) {
  return Object.values(KEYWORDS);
}
