/**
 * Ezana Echo — article hub data (restored from pre-dashboard Echo + ongoing catalog).
 * Featured / sections / latest feed all read from this single ARTICLES array.
 */

const ARTICLES = [
  {
    id: 'the-45-day-loophole-congressional-trade-disclosure',
    title: 'The 45-Day Loophole: Why Congressional Trade Disclosure Must Happen in Real Time',
    excerpt:
      'Under current law, members of Congress have 45 days to disclose stock trades. The technology for real-time reporting already exists. The only barrier is political will.',
    contentParagraphs: [
      'In the time it takes a member of Congress to disclose a stock trade, the entire market can move. A company can report earnings, a sector can collapse, an industry can be reshaped by regulation. And under current law, that delay is not just permitted — it is protected.',
      'The STOCK Act of 2012 was supposed to fix this. It mandated that lawmakers disclose securities transactions exceeding $1,000 within 45 days. Before that, annual disclosures meant the public might not learn about a trade for a year.',
      'Forty-five days was an improvement. But in 2026, it is a relic.',
      'Every retail investor in America has trades reported to FINRA in real time. Members of Congress, meanwhile, operate under a system designed for paper filing cabinets. The 45-day window creates an information gap wide enough to drive a portfolio through.',
      'This is not hypothetical. During the 117th Congress alone, dozens of members violated even the lenient 45-day requirement. The statutory penalty for late disclosure is often $200 — not a meaningful deterrent.',
      'At Ezana Finance, we track congressional trade disclosures. The patterns cluster around committee hearings, regulatory announcements, and policy shifts at a frequency that defies coincidence.',
      'Brokerages already report every trade electronically. FINRA receives transaction data in milliseconds. The idea that disclosures cannot be filed within one business day is not a technology problem — it is a political one.',
      'Our answer: one business day — the same standard that applies to corporate insiders under SEC Section 16.',
      'The 119th Congress has seen a surge of reform proposals: the HONEST Act, the Stop Insider Trading Act, and the Restore Trust in Congress Act. Polling consistently shows broad bipartisan support for tighter rules.',
      'At Ezana Finance, we support one-business-day electronic disclosure, meaningful penalties scaled to trade size, and a long-term goal of banning individual stock trading by lawmakers and immediate families while in office.',
      'If you track markets through our platform, you already see why timing matters. The disclosure window corrodes trust in institutions — and markets run on trust.',
      'Contact your representatives, share this analysis, and keep watching the data with us — transparency should be the default, not a 45-day afterthought.',
    ],
    author: 'Ezana Finance Editorial',
    category: 'policy',
    tickers: ['SPY', 'XLF', 'KRE'],
    readTime: 8,
    publishedAt: '2025-03-15',
    featured: true,
    likes: 412,
    comments: 108,
    reads: 9120,
    listMeta: 'Featured',
  },
  {
    id: 'four-formulas-prediction-market-trading',
    title: 'The 4 Formulas That Separate Winning Prediction Market Traders From Everyone Else',
    excerpt:
      'The top wallets capture an outsized share of profits. The difference is four mathematical formulas and the discipline to use them.',
    contentParagraphs: [
      'Prediction markets price real-world events. The top traders are not guessing — they size positions when implied probability diverges from their model.',
      'Formula 1 — Expected value: EV = P(win) × payoff − stake. Only trade when EV is positive after fees.',
      'Formula 2 — Kelly sizing: allocate a fraction of bankroll proportional to edge to maximize long-run growth without risking ruin.',
      'Formula 3 — Correlation adjustment: when outcomes cluster (same news driver), reduce per-market size so portfolio variance stays controlled.',
      'Formula 4 — Time decay: as resolution approaches, liquidity and spread change — recompute fair value frequently.',
      'Discipline beats intuition. Track every trade, compare realized vs. model probability, and cut strategies that drift.',
    ],
    author: 'Ezana Finance Editorial',
    category: 'markets',
    tickers: ['SPY', 'QQQ'],
    readTime: 12,
    publishedAt: '2026-03-01',
    featured: false,
    likes: 201,
    comments: 44,
    reads: 5420,
    listMeta: 'Mar 2026',
  },
  {
    id: 'oil-assets-surge',
    title: '7 assets that historically surge when oil prices spike',
    excerpt: 'When crude prices rise, certain sectors and securities tend to outperform.',
    contentParagraphs: [
      'When crude prices rise, certain sectors and securities tend to outperform. Here are seven assets with strong historical correlation to oil rallies — from ETFs and integrated majors to pure-play producers and futures-tracking funds.',
      'VanEck Oil Services ETF (OIH) tracks oilfield service companies. These firms benefit when producers increase drilling capex, which typically accelerates when crude exceeds roughly $80 per barrel.',
      'Exxon Mobil (XOM) produces millions of barrels daily from Guyana, the Permian, and offshore Brazil, with upstream profits highly leveraged to crude.',
      'Energy Select Sector SPDR (XLE) holds the largest U.S. energy companies; Exxon and Chevron often represent a large share of weight.',
      'EOG Resources (EOG) is a leading shale producer with breakeven costs that allow margin expansion during rallies.',
      'Schlumberger (SLB) provides drilling and reservoir technology globally — earnings rise when upstream capex increases.',
      'ConocoPhillips (COP) spans the Permian, Alaska, and LNG projects; earnings correlate with crude and upstream margins.',
      'United States Oil Fund (USO) tracks WTI via front-month futures and historically moves with spot crude through supply shocks.',
      'The Permian Basin spans West Texas and Southeast New Mexico — many of these names operate there, making basin fundamentals key to oil sensitivity.',
    ],
    author: 'Ezana Research',
    category: 'markets',
    tickers: ['OIH', 'XOM', 'XLE', 'USO'],
    readTime: 8,
    publishedAt: '2025-03-02',
    featured: false,
    likes: 178,
    comments: 41,
    reads: 3900,
    listMeta: '2 Mar 2025',
  },
  {
    id: 'hedge-fund-strategies-backtest',
    title: 'Top 7 beginner Hedge Fund strategies you can backtest',
    excerpt: 'Seven institutional strategies with backtesting heuristics you can implement in our quant tools.',
    contentParagraphs: [
      'These seven institutional-style ideas are often discussed in allocator letters. Use them as research templates — not guarantees.',
      'Earnings beat + confirmed move: funds trade post-earnings drift when price action confirms the surprise direction.',
      'IPO lock-up expiration: around lock-up, float and selling pressure can change short-term dynamics — model windows carefully.',
      'Time-series momentum: go long assets above long-horizon trend signals and reduce exposure when trends break — classic CTA-style rules.',
      'VIX term-structure carry: calm markets often embed different near vs. future vol pricing — stress-test for regime change.',
      'Volatility dispersion: index vs. single-name vol can be traded when correlation assumptions shift.',
      'Merger arbitrage: buy targets below deal price when spread compensates for timeline and break risk.',
      'Short-horizon reversal: some desks exploit very short-term mean reversion after liquidity shocks — costs matter.',
      'Backtest with realistic slippage and fees. Use For The Quants for execution once you have a hypothesis and data.',
    ],
    author: 'Ezana Research',
    category: 'markets',
    tickers: ['SPY', 'VIX', 'QQQ'],
    readTime: 8,
    publishedAt: '2025-03-02',
    featured: false,
    likes: 156,
    comments: 52,
    reads: 3600,
    listMeta: '2 Mar 2025',
  },
  {
    id: 'sp500-returns-by-president',
    title: 'S&P 500 returns under different presidents',
    excerpt: 'Total returns vary by presidential term — driven by cycles, Fed policy, and global shocks.',
    contentParagraphs: [
      'S&P 500 total returns vary significantly by presidential term. Markets discount policy, regulation, and fiscal stance years in advance — so attribution is never as simple as “red vs. blue.”',
      'We look at full four-year windows, inflation-adjusted where possible, and compare to international benchmarks to avoid home-country bias.',
      'High-return regimes often coincide with post-crisis recoveries or falling inflation regardless of party; weak regimes may reflect external shocks or restrictive financial conditions.',
      'The interactive chart in our earlier Echo build illustrated point-in-term performance — the lesson is the same: diversification and horizon matter more than election headlines.',
      'Use sector and factor exposure to express views; betting everything on a political narrative is usually not compensated risk.',
    ],
    author: 'Ezana Research',
    category: 'markets',
    tickers: ['SPY', 'VOO', 'IVV'],
    readTime: 5,
    publishedAt: '2025-03-02',
    featured: false,
    likes: 133,
    comments: 28,
    reads: 5100,
    listMeta: '2 Mar 2025',
  },
  {
    id: 'congressional-trading-q1',
    title: 'Congressional trading activity: Q1 2025 outlook',
    excerpt: 'Key trends in lawmaker disclosures and what to watch in the new quarter.',
    contentParagraphs: [
      'Committee calendars drive information flow — finance, armed services, and health committees often see the highest overlap between hearings and disclosed trades.',
      'We group disclosures by asset class: broad equity ETFs vs. single names vs. options — single-name trades carry the highest interpretation risk.',
      'Late filings remain common. Treat timestamp of disclosure separately from timestamp of trade when modeling.',
      'Cross-reference with lobbying registrations where available; not causal, but useful context.',
      'Ezana Echo will continue summarizing themes each quarter — follow Inside The Capitol for live trade feeds.',
    ],
    author: 'Ezana Research',
    category: 'policy',
    tickers: ['SPY', 'XLK'],
    readTime: 5,
    publishedAt: '2025-02-28',
    featured: false,
    likes: 88,
    comments: 31,
    reads: 2200,
    listMeta: '28 Feb 2025',
  },
  {
    id: 'hedge-funds-3y-performance',
    title: 'Hedge funds with the highest 3Y performance (2023–2026)',
    excerpt: 'Top-performing funds by multi-year returns — and what drives their edge.',
    contentParagraphs: [
      'Based on public filings and reported performance, concentrated equity and global macro pods have led multi-year league tables.',
      'Tiger-cub style funds often run catalyst-driven books with large single-name risk — returns can be exceptional but path-dependent.',
      'Multi-manager platforms diversify across internal teams — lower single-name blow-up risk, different fee stack.',
      'Tech-tilted growth funds benefited from AI capex cycles; verify whether leverage and private-side exposure amplify headline returns.',
      'Always read net vs. gross, fee structure, and lockups. 13F snapshots are incomplete for short books.',
    ],
    author: 'Ezana Research',
    category: 'markets',
    tickers: ['NVDA', 'MSFT', 'META'],
    readTime: 6,
    publishedAt: '2025-03-02',
    featured: false,
    likes: 142,
    comments: 36,
    reads: 4100,
    listMeta: '2 Mar 2025',
  },
  {
    id: 'hedge-fund-13f-preview',
    title: 'Hedge fund 13F filings: What to watch this quarter',
    excerpt: 'Major institutions report quarterly — positioning shifts often move narratives.',
    contentParagraphs: [
      '13Fs show long equity positions at quarter end — they do not show shorts, international listings in all cases, or intra-quarter trading.',
      'Compare changes vs. price: a smaller dollar weight may still be conviction if the stock fell.',
      'Clustering matters: when multiple top funds add the same name, crowding risk rises.',
      'Use Ezana screens to map disclosed names to fundamentals — filings are a starting point, not an endorsement.',
    ],
    author: 'Ezana Research',
    category: 'markets',
    tickers: ['SPY', 'QQQ'],
    readTime: 6,
    publishedAt: '2025-02-25',
    featured: false,
    likes: 76,
    comments: 19,
    reads: 1800,
    listMeta: '25 Feb 2025',
  },
  {
    id: 'portfolio-rebalancing-tips',
    title: 'Portfolio rebalancing in volatile markets',
    excerpt: 'Practical strategies to maintain target allocation when correlations spike.',
    contentParagraphs: [
      'Rebalancing sells relative winners and buys relative losers — mechanically it trims momentum but enforces discipline.',
      'In volatile regimes, widen bands before trading to avoid whipsaw costs.',
      'Tax-aware accounts can harvest losses during rebalances; taxable accounts should consider lot selection.',
      'Alternatives and cash buffers change optimal cadence — quarterly may beat monthly when spreads are wide.',
    ],
    author: 'Ezana Research',
    category: 'companies',
    tickers: ['SPY', 'AGG', 'BND'],
    readTime: 4,
    publishedAt: '2025-02-22',
    featured: false,
    likes: 64,
    comments: 14,
    reads: 1500,
    listMeta: '22 Feb 2025',
  },
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
    featured: false,
    likes: 124,
    comments: 34,
    reads: 4230,
    listMeta: 'Today',
  },
  {
    id: 'fed-rates-2026',
    title: "Fed Holds Rates Steady — What's Next for 2026",
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
    { title: '45-Day Loophole', reads: 9120, id: 'the-45-day-loophole-congressional-trade-disclosure' },
    { title: 'AI Chip War', reads: 4230, id: 'ai-chip-war' },
    { title: 'S&P by President', reads: 5100, id: 'sp500-returns-by-president' },
  ],
  mostDiscussed: [
    { title: 'Tesla Robotaxi', comments: 89, id: 'tesla-robotaxi' },
    { title: 'Hedge strategies', comments: 52, id: 'hedge-fund-strategies-backtest' },
  ],
  bookmarks: [
    { title: '7 oil assets', id: 'oil-assets-surge' },
    { title: 'How Tariff Threats Move Markets', id: 'tariff-markets' },
  ],
};

/** @type {Record<string, { id: string; author: { name: string; initials: string; id?: string }; content: string; createdAt: string }[]>} */
export const ECHO_MOCK_COMMENTS_BY_ARTICLE = {
  'the-45-day-loophole-congressional-trade-disclosure': [
    {
      id: 'c-loophole-1',
      author: { name: 'Morgan Ellis', initials: 'ME' },
      content: 'One-day disclosure should be table stakes — thanks for laying out the bills.',
      createdAt: '2025-03-16T12:00:00Z',
    },
  ],
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
  if (category === 'crypto') return ARTICLES.filter((a) => a.category === 'crypto');
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
