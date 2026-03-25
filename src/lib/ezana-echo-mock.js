/** Placeholder Ezana Echo article data — swap for CMS/API later. */

const ARTICLES = [
  {
    id: 'ai-chip-war',
    title: "The AI Chip War: How NVIDIA's Dominance Is Reshaping Global Markets",
    excerpt:
      'A deep dive into the semiconductor supply chain and what it means for investors betting on the next computing revolution.',
    contentParagraphs: [
      'Semiconductors have become the choke point of the global economy. Training frontier AI models depends on a handful of companies that can deliver advanced accelerators at scale — and NVIDIA has led that pack for several product cycles.',
      'This article walks through demand drivers, supply constraints, and how we think about positioning when the sector trades at a premium to historical multiples.',
      'We also consider second-order effects: power infrastructure, memory subsystems, and foundry capacity that could matter as much as the GPU headline.',
      'None of this is investment advice — it is a framework for understanding why chip markets have moved in lockstep with AI capex headlines and what could change that relationship.',
    ],
    author: 'Ezana Research Team',
    category: 'markets',
    tickers: ['NVDA', 'AMD', 'TSM', 'INTC'],
    readTime: 8,
    publishedAt: '2026-03-25',
    featured: true,
    likes: 124,
    comments: 34,
    reads: 4230,
    listMeta: 'Today',
  },
  {
    id: 'fed-rates-2026',
    title: 'Fed Holds Rates Steady — What\'s Next for 2026',
    excerpt: 'Summary of the Fed’s latest stance and what markets are pricing for the next few meetings.',
    contentParagraphs: [
      'The Federal Reserve kept policy rates unchanged while signaling continued data dependence.',
      'Futures markets are pricing a shallow easing path, but dispersion across scenarios remains wide.',
    ],
    author: 'Ezana Research Team',
    category: 'markets',
    tickers: ['SPY', 'DXY'],
    readTime: 5,
    publishedAt: '2026-03-24',
    featured: false,
    likes: 89,
    comments: 21,
    reads: 3180,
    listMeta: 'Today',
  },
  {
    id: 'sp500-technical-outlook',
    title: 'S&P 500 Technical Outlook: Key Levels to Watch',
    excerpt: 'Levels and breadth indicators we are watching after the latest leg higher.',
    contentParagraphs: [
      'Index levels are only one input — we pair them with breadth and credit spreads to avoid false signals.',
    ],
    author: 'Ezana Research Team',
    category: 'markets',
    tickers: ['SPY', 'QQQ'],
    readTime: 4,
    publishedAt: '2026-03-23',
    featured: false,
    likes: 67,
    comments: 15,
    reads: 2890,
    listMeta: 'Yesterday',
  },
  {
    id: 'bond-recession-signals',
    title: 'Bond Market Signals Recession Warning',
    excerpt: 'What the curve is telling us — and what it is not.',
    contentParagraphs: [
      'Fixed income markets often lead equities at turning points; we look at the full picture before drawing conclusions.',
    ],
    author: 'Ezana Research Team',
    category: 'markets',
    tickers: ['TLT', 'IEF'],
    readTime: 6,
    publishedAt: '2026-03-22',
    featured: false,
    likes: 54,
    comments: 12,
    reads: 2100,
    listMeta: '2 days ago',
  },
  {
    id: 'apple-services-record',
    title: "Apple's Services Revenue Hits Record $24B",
    excerpt: 'Why recurring revenue is a durable theme in the mega-cap cohort.',
    contentParagraphs: [
      'Services attach rates and ecosystem lock-in continue to support margin expansion narratives.',
    ],
    author: 'Ezana Research Team',
    category: 'companies',
    tickers: ['AAPL'],
    readTime: 4,
    publishedAt: '2026-03-24',
    featured: false,
    likes: 71,
    comments: 18,
    reads: 1980,
    listMeta: 'Today',
  },
  {
    id: 'tesla-robotaxi',
    title: "Tesla's Robotaxi: Hype or Game Changer?",
    excerpt: 'Regulatory hurdles, timelines, and what we would need to see to validate the thesis.',
    contentParagraphs: [
      'Autonomy is a long-cycle bet — we separate near-term milestones from long-term optionality.',
    ],
    author: 'Ezana Research Team',
    category: 'companies',
    tickers: ['TSLA'],
    readTime: 7,
    publishedAt: '2026-03-23',
    featured: false,
    likes: 89,
    comments: 42,
    reads: 2650,
    listMeta: 'Yesterday',
  },
  {
    id: 'microsoft-ai',
    title: "Microsoft's AI Bet Is Paying Off",
    excerpt: 'Copilot attach, Azure growth, and how margins are evolving.',
    contentParagraphs: [
      'Enterprise distribution is a durable advantage when AI features are bundled into existing workflows.',
    ],
    author: 'Ezana Research Team',
    category: 'companies',
    tickers: ['MSFT'],
    readTime: 5,
    publishedAt: '2026-03-21',
    featured: false,
    likes: 62,
    comments: 9,
    reads: 1540,
    listMeta: '3 days ago',
  },
  {
    id: 'sec-rules-trading',
    title: 'New SEC Rules Could Change How You Trade',
    excerpt: 'A plain-language overview of the proposals and who is most affected.',
    contentParagraphs: [
      'Rule changes can shift liquidity and execution quality — we summarize the likely impact paths.',
    ],
    author: 'Ezana Research Team',
    category: 'policy',
    tickers: ['IBKR', 'SCHW'],
    readTime: 6,
    publishedAt: '2026-03-24',
    featured: false,
    likes: 67,
    comments: 31,
    reads: 1890,
    listMeta: 'Today',
  },
  {
    id: 'congressional-trade-ban',
    title: 'Congressional Trading Ban Bill: What We Know',
    excerpt: 'Status of legislative proposals and what investors should watch.',
    contentParagraphs: [
      'Policy risk is binary — we track timelines and committee movement rather than speculating on outcomes.',
    ],
    author: 'Ezana Research Team',
    category: 'policy',
    tickers: ['SPY'],
    readTime: 5,
    publishedAt: '2026-03-23',
    featured: false,
    likes: 55,
    comments: 28,
    reads: 2890,
    listMeta: 'Yesterday',
  },
  {
    id: 'tariff-markets',
    title: 'How Tariff Threats Are Moving Markets',
    excerpt: 'Sector sensitivities and hedges that matter when headlines spike.',
    contentParagraphs: [
      'Tariffs hit supply chains unevenly — we focus on margin exposure and substitution risk.',
    ],
    author: 'Ezana Research Team',
    category: 'policy',
    tickers: ['XLI', 'CAT'],
    readTime: 8,
    publishedAt: '2026-03-22',
    featured: false,
    likes: 48,
    comments: 19,
    reads: 1760,
    listMeta: '2 days ago',
  },
  {
    id: 'eth-etf-outlook',
    title: 'ETH ETF Approval: What Could Change Flows',
    excerpt: 'A structured look at catalysts and risks for crypto ETFs.',
    contentParagraphs: [
      'Flows follow access and narrative — we track both in parallel.',
    ],
    author: 'Ezana Research Team',
    category: 'crypto',
    tickers: ['ETH', 'COIN'],
    readTime: 6,
    publishedAt: '2026-03-23',
    featured: false,
    likes: 112,
    comments: 44,
    reads: 3120,
    listMeta: 'Yesterday',
  },
  {
    id: 'btc-halving',
    title: 'Bitcoin Halving: Supply Math vs. Narrative',
    excerpt: 'Why the cycle matters — and why it is not the whole story.',
    contentParagraphs: [
      'Halving reduces new issuance; price is still set at the margin by demand and liquidity.',
    ],
    author: 'Ezana Research Team',
    category: 'crypto',
    tickers: ['BTC', 'MSTR'],
    readTime: 7,
    publishedAt: '2026-03-20',
    featured: false,
    likes: 98,
    comments: 36,
    reads: 2410,
    listMeta: '5 days ago',
  },
];

export const ECHO_TRENDING = {
  mostRead: [
    { title: 'AI Chip War', reads: 4230, id: 'ai-chip-war' },
    { title: 'Fed Decision', reads: 3180, id: 'fed-rates-2026' },
    { title: 'Congressional Ban', reads: 2890, id: 'congressional-trade-ban' },
  ],
  mostDiscussed: [
    { title: 'Tesla Robotaxi', comments: 89, id: 'tesla-robotaxi' },
    { title: 'SEC Rules', comments: 67, id: 'sec-rules-trading' },
  ],
  bookmarks: [
    { title: 'S&P 500 Technical Outlook', id: 'sp500-technical-outlook' },
    { title: 'How Tariff Threats Move Markets', id: 'tariff-markets' },
  ],
};

/** @type {Record<string, { id: string; author: { name: string; initials: string; id?: string }; content: string; createdAt: string }[]>} */
export const ECHO_MOCK_COMMENTS_BY_ARTICLE = {
  'ai-chip-war': [
    {
      id: 'c1',
      author: { name: 'David Kim', initials: 'DK' },
      content: 'NVDA multiple compression risk if hyperscaler capex slows — worth a follow-up.',
      createdAt: '2026-03-25T14:00:00Z',
    },
    {
      id: 'c2',
      author: { name: 'Lisa Park', initials: 'LP' },
      content: 'Would love a chart on foundry utilization vs. GPU pricing.',
      createdAt: '2026-03-25T16:20:00Z',
    },
  ],
  'fed-rates-2026': [
    {
      id: 'c3',
      author: { name: 'Jordan R.', initials: 'JR' },
      content: 'Dot plot vs. market pricing still diverging — good summary.',
      createdAt: '2026-03-24T18:00:00Z',
    },
  ],
};

export function getAllArticles() {
  return ARTICLES;
}

export function getArticleById(id) {
  return ARTICLES.find((a) => a.id === id) ?? null;
}

export function getFeaturedArticle() {
  return ARTICLES.find((a) => a.featured) ?? ARTICLES[0];
}

export function getArticlesByCategory(category) {
  if (category === 'markets') return ARTICLES.filter((a) => a.category === 'markets' && !a.featured);
  if (category === 'companies') return ARTICLES.filter((a) => a.category === 'companies');
  if (category === 'policy') return ARTICLES.filter((a) => a.category === 'policy');
  return [];
}

export function getArticleListForSection(section) {
  const map = {
    marketAnalysis: 'markets',
    companySpotlights: 'companies',
    politicalPolicy: 'policy',
  };
  const cat = map[section];
  return getArticlesByCategory(cat).slice(0, 3);
}

export function getRelatedArticles(category, excludeId, limit = 3) {
  return ARTICLES.filter((a) => a.category === category && a.id !== excludeId).slice(0, limit);
}

export function formatPublishedDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatPublishedShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
