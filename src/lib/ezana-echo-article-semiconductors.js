/* ════════════════════════════════════════════════════════════════════════════
   Ezana Echo — The Silicon Shield: How One Island Controls The World's Chips
   Data + content blocks for the interactive long-form piece.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Top 10 US Semiconductor Companies by Market Cap ──────────────────── */
export const US_SEMI_MARKET_CAP = [
  { rank: 1, ticker: 'NVDA', company: 'NVIDIA Corp.', marketCap: 5180, color: '#76b900' },
  { rank: 2, ticker: 'AVGO', company: 'Broadcom Inc.', marketCap: 1930, color: '#cc0000' },
  {
    rank: 3,
    ticker: 'MU',
    company: 'Micron Technology, Inc.',
    marketCap: 726.59,
    color: '#0071c5',
  },
  {
    rank: 4,
    ticker: 'AMD',
    company: 'Advanced Micro Devices, Inc.',
    marketCap: 662.68,
    color: '#ed1c24',
  },
  { rank: 5, ticker: 'INTC', company: 'Intel Corp.', marketCap: 552.63, color: '#0071c5' },
  { rank: 6, ticker: 'LRCX', company: 'Lam Research Corp.', marketCap: 358.38, color: '#003366' },
  {
    rank: 7,
    ticker: 'AMAT',
    company: 'Applied Materials, Inc.',
    marketCap: 326.38,
    color: '#e87722',
  },
  {
    rank: 8,
    ticker: 'TXN',
    company: 'Texas Instruments Inc.',
    marketCap: 258.86,
    color: '#cc0000',
  },
  { rank: 9, ticker: 'KLAC', company: 'KLA Corp.', marketCap: 229.53, color: '#003366' },
  { rank: 10, ticker: 'QCOM', company: 'QUALCOMM Inc.', marketCap: 215.72, color: '#3253dc' },
];

/* ── Detailed Financials Comparison ──────────────────────────────────── */
export const SEMI_FINANCIALS = [
  {
    company: 'Nvidia',
    type: 'Fabless',
    revenue: 165,
    netIncome: 86.6,
    marketCap: 4150,
    ticker: 'NVDA',
  },
  {
    company: 'Broadcom',
    type: 'Fabless',
    revenue: 57,
    netIncome: 13.2,
    marketCap: 1400,
    ticker: 'AVGO',
  },
  { company: 'Intel', type: 'IDM', revenue: 53, netIncome: -20.5, marketCap: 107, ticker: 'INTC' },
  {
    company: 'Qualcomm',
    type: 'Conglomerate',
    revenue: 43.2,
    netIncome: 11.6,
    marketCap: 170,
    ticker: 'QCOM',
  },
  {
    company: 'Applied Materials',
    type: 'Equipment',
    revenue: 28,
    netIncome: 6.8,
    marketCap: 124.5,
    ticker: 'AMAT',
  },
  { company: 'AMD', type: 'Fabless', revenue: 29.6, netIncome: 2.7, marketCap: 260, ticker: 'AMD' },
  { company: 'Micron', type: 'IDM', revenue: 34, netIncome: 6.2, marketCap: 133, ticker: 'MU' },
  {
    company: 'Texas Instruments',
    type: 'IDM',
    revenue: 16.7,
    netIncome: 5,
    marketCap: 177,
    ticker: 'TXN',
  },
  {
    company: 'Lam Research',
    type: 'Equipment',
    revenue: 18.4,
    netIncome: 5.3,
    marketCap: 125,
    ticker: 'LRCX',
  },
  {
    company: 'Analog Devices',
    type: 'IDM',
    revenue: 10.4,
    netIncome: 1.96,
    marketCap: 120,
    ticker: 'ADI',
  },
];

/* ── TSMC Global Foundry Market Share (Approximate) ───────────────── */
export const FOUNDRY_MARKET_SHARE = [
  { company: 'TSMC', share: 62, region: 'Taiwan', color: '#10b981' },
  { company: 'Samsung', share: 13, region: 'South Korea', color: '#3b82f6' },
  { company: 'GlobalFoundries', share: 6, region: 'US', color: '#8b5cf6' },
  { company: 'UMC', share: 5, region: 'Taiwan', color: '#06b6d4' },
  { company: 'SMIC', share: 6, region: 'China', color: '#ef4444' },
  { company: 'Others', share: 8, region: 'Various', color: '#6b7280' },
];

/* ── Article export ────────────────────────────────────────── */
export const semiconductorArticle = {
  id: 'silicon-shield-taiwan-semiconductor-dominance',
  entities: {
    people: [
      {
        id: 'morris-chang',
        label: 'Morris Chang',
        role: 'Founder of TSMC and inventor of the pure-play foundry model',
      },
      {
        id: 'tsai-ing-wen',
        label: 'Tsai Ing-wen',
        role: "Former President of Taiwan who named the 'silicon shield' strategy",
      },
      {
        id: 'elon-musk',
        label: 'Elon Musk',
        role: 'CEO of Tesla and SpaceX, backer of the Texas Terafab venture',
      },
    ],
    terms: [
      { id: 'nanometer-process', label: '2-Nanometer Scale' },
      { id: 'chokepoint', label: 'Chokepoint' },
      { id: 'pure-play-foundry', label: 'Pure-Play Foundry Model' },
      { id: 'silicon-shield', label: 'Silicon Shield' },
      { id: 'chips-act', label: 'CHIPS and Science Act' },
      { id: 'made-in-china-2025', label: 'Made in China 2025' },
      { id: 'two-nanometer', label: '2-Nanometer Process' },
      { id: 'fabless-model', label: 'Fabless Model' },
      { id: 'idm', label: 'Integrated Device Manufacturers (IDMs)' },
      { id: 'idm-2-0', label: 'IDM 2.0 Strategy' },
      { id: 'terafab', label: 'Terafab' },
      { id: 'yield-ramp-parity', label: 'Onshoring Yield Parity' },
    ],
  },
  title: "The Silicon Shield: How One Island Controls The World's Chips",
  subtitle:
    "Taiwan's semiconductor dominance is a geopolitical weapon, a $5 trillion investment thesis, and the most consequential chokepoint in the global economy.",
  excerpt:
    'One company — TSMC — produces over 90% of the world\'s most advanced semiconductor chips. These chips power AI training, military systems, smartphones, and the entire digital economy. Taiwan transformed this manufacturing supremacy into what analysts call a "silicon shield" — the theory that no rational actor would invade the island and risk disrupting the global chip supply. Here\'s the full picture for investors.',
  heroImage: null,
  contentBlocks: [
    { type: 'heading', text: 'The Most Important Factory In The World', level: 2 },
    {
      type: 'paragraph',
      text: "There is a facility in Hsinchu Science Park, a sprawling industrial cluster south of Taipei, that quietly underpins the entire modern economy. Inside, engineers operate at tolerances measured in atoms — etching circuits onto silicon wafers at the [[kw:nanometer-process]]2-nanometer scale[[/kw]], where the gap between transistors is smaller than a strand of DNA. This facility belongs to Taiwan Semiconductor Manufacturing Company, and it produces more than 90% of the world's most advanced chips.",
    },
    {
      type: 'paragraph',
      text: 'These are not commodity products. They are the processors that train large language models, guide precision munitions, render real-time graphics, and enable every smartphone sold on the planet. Without them, Nvidia cannot ship GPUs. Apple cannot build iPhones. The Pentagon cannot deploy its most advanced weapons systems. The concentration of this capability in a single company, on a single island, 100 miles from a hostile superpower, is the most consequential [[kw:chokepoint]]chokepoint[[/kw]] in the global economy.',
    },
    {
      type: 'chart',
      variant: 'foundry-market-share',
      title: 'Global Foundry Market Share',
      caption: 'TrendForce, Counterpoint Research estimates',
    },

    { type: 'heading', text: 'How Taiwan Built A Monopoly On Purpose', level: 2 },
    {
      type: 'paragraph',
      text: 'Taiwan did not stumble into semiconductor supremacy. In the 1970s, Taiwanese technocrats recognized that the nation could not compete at the electronics frontier against Japan and the United States. Instead of trying to dominate the entire chip value chain — design, manufacturing, packaging — they focused on a single link: precision manufacturing, the most operationally demanding stage.',
    },
    {
      type: 'paragraph',
      text: 'The government established the Industrial Technology Research Institute (ITRI) in 1973, which acquired semiconductor process technology through licensing agreements with RCA and trained a generation of Taiwanese engineers. The pivotal moment came in 1987 when [[person:morris-chang]]Morris Chang[[/person]], a US-trained engineer who had spent decades at Texas Instruments, founded TSMC and invented the [[kw:pure-play-foundry]]pure-play foundry model[[/kw]].',
    },
    {
      type: 'paragraph',
      text: 'The model was brilliantly strategic: rather than designing and selling its own chips, TSMC would manufacture chips designed by other companies. This reassured American and European firms that TSMC would never become their competitor. Qualcomm, Nvidia, Apple, and AMD could outsource production to Taiwan without fear of intellectual property theft or strategic rivalry. By the early 1990s, Hsinchu Science Park hosted over 140 chip firms and 30,000 workers. Thousands of Taiwanese engineers returned from Silicon Valley, creating a talent density that no other country has replicated.',
    },

    { type: 'heading', text: 'The Silicon Shield Thesis', level: 2 },
    {
      type: 'paragraph',
      text: "Taiwan's semiconductor dominance serves a dual purpose beyond economics. Former President [[person:tsai-ing-wen]]Tsai Ing-wen[[/person]] explicitly named this strategy in a 2021 Foreign Affairs article: the [[kw:silicon-shield]]\"silicon shield\"[[/kw]] — the argument that Taiwan's chip manufacturing is so critical to the global economy that any disruption from a Chinese invasion would trigger catastrophic consequences, compelling Taiwan's allies to intervene.",
    },
    {
      type: 'paragraph',
      text: "The logic mirrors how the current Iran conflict and Strait of Hormuz disruptions have repriced global oil markets. If 20% of the world's oil flowing through one waterway can spike crude prices 40-55%, imagine the economic impact of losing 90% of the world's advanced chip production. Consulting firm McKinsey estimated that a prolonged disruption to TSMC's operations could reduce global GDP by $600 billion to $1 trillion in the first year alone.",
    },

    { type: 'heading', text: 'The Reshoring Race: CHIPS Act vs Made in China 2030', level: 2 },
    {
      type: 'paragraph',
      text: 'Both Washington and Beijing are working to reduce dependence on Taiwanese chips, but from opposite directions. The United States passed the [[kw:chips-act]]CHIPS and Science Act[[/kw]] in 2022, offering $52 billion in incentives to build domestic semiconductor manufacturing. TSMC received up to $6.6 billion in direct investment and significant tax credits for its Arizona fabrication facility, and committed $65 billion to the project. In March 2025, the Trump administration announced TSMC would boost its US investment by a further $100 billion.',
    },
    {
      type: 'paragraph',
      text: "China's approach is different. After semiconductors underperformed in the [[kw:made-in-china-2025]]Made in China 2025[[/kw]] strategy — missing targets for domestic production and global market share — Beijing doubled down. A proposal by 13 Chinese chip industry executives in March 2026 outlined aims to increase self-sufficiency to 80% by 2030, up from the current 33%. Companies like SMIC and HiSilicon are gaining momentum, though they remain generations behind TSMC's leading edge.",
    },
    {
      type: 'paragraph',
      text: 'The critical gap: TSMC now produces at [[kw:two-nanometer]]2-nanometer[[/kw]] process nodes, while Chinese self-sufficiency goals target "entirely domestically produced equipment" for the less sophisticated 7nm and 14nm generations. The difference is significant — 2nm chips deliver a 45% performance increase while consuming 75% less power than 7nm chips. For AI training workloads, this gap is the difference between competitive and obsolete.',
    },

    { type: 'heading', text: 'The $5 Trillion Investment Landscape', level: 2 },
    {
      type: 'paragraph',
      text: 'The US semiconductor industry, measured by the ten largest public companies, represents over $10 trillion in combined market capitalization. Nvidia alone — a [[kw:fabless-model]]fabless[[/kw]] company that designs chips but outsources manufacturing to TSMC — commands a $5.18 trillion valuation, making it the most valuable company on Earth by some measures. Broadcom follows at $1.93 trillion.',
    },
    {
      type: 'paragraph',
      text: 'The industry breaks into three business models. Fabless companies (Nvidia, AMD, Qualcomm) design chips and outsource manufacturing. [[kw:idm]]Integrated Device Manufacturers (IDMs)[[/kw]] like Intel, Micron, and Texas Instruments both design and manufacture. And equipment companies (Applied Materials, Lam Research, KLA) build the machines that fabricate chips — the "picks and shovels" of the semiconductor gold rush.',
    },
    {
      type: 'paragraph',
      text: "Intel's position is particularly notable. Once the undisputed leader in semiconductor manufacturing, Intel has reported negative net income of $20.5 billion TTM while trading at a $107 billion market cap — a fraction of its fabless rivals. The company is attempting a historic pivot under its [[kw:idm-2-0]]IDM 2.0 strategy[[/kw]], splitting into separate design and manufacturing divisions and accepting foundry contracts from other chipmakers. Whether Intel can execute this transformation or become another cautionary tale is one of the most consequential binary outcomes in the sector.",
    },
    {
      type: 'chart',
      variant: 'semi-financials-table',
      title: 'U.S. Semiconductor Industry: Financial Comparison (TTM)',
      caption: 'Company filings, trailing twelve months',
    },

    { type: 'heading', text: 'The Talent Problem', level: 2 },
    {
      type: 'paragraph',
      text: "Replicating Taiwan's manufacturing ecosystem requires more than capital and equipment. It requires decades of accumulated process knowledge, dense supplier networks, and an engineering workforce with no global equivalent. TSMC has struggled to hire qualified workers in Arizona, resorting to flying thousands of engineers from Taiwan to train local staff.",
    },
    {
      type: 'paragraph',
      text: '[[person:elon-musk]]Elon Musk[[/person]] recently announced plans for advanced chip facilities in Texas — the so-called [[kw:terafab]]"Terafab"[[/kw]] venture for Tesla and SpaceX — consolidating every stage of semiconductor production under one roof at an estimated cost of $25 billion. Other companies investing in US chip fabrication include Micron, Texas Instruments, and Intel. The question is whether any of these efforts can match TSMC\'s yield rates, which reflect 37 years of continuous process optimization.',
    },

    { type: 'heading', text: 'What Investors Should Watch', level: 2 },
    {
      type: 'paragraph',
      text: "Five catalysts will shape the semiconductor investment landscape over the next 12-18 months. First, the TSMC Arizona yield ramp — if yields approach Taiwan levels, it validates [[kw:yield-ramp-parity]]onshoring[[/kw]] as viable. Second, China's SMIC progress at 7nm and below — any breakthrough accelerates the timeline for Chinese chip independence. Third, Intel's foundry pivot — the IFS (Intel Foundry Services) order book will signal whether the IDM 2.0 thesis has legs. Fourth, AI capex cycles — Nvidia's revenue is a direct function of hyperscale data center spending by Meta, Microsoft, Amazon, and Google. Fifth, geopolitical escalation across the Taiwan Strait — any increase in military posturing reprices the entire sector's risk premium overnight.",
    },
  ],
  author: 'Ezana Finance Editorial',
  category: 'tech-infrastructure',
  tags: ['markets', 'technology', 'semiconductors', 'geopolitics', 'policy'],
  featured: false,
  readTime: 10,
  publishedAt: '2026-05-07',
  tags: ['semiconductors', 'TSMC', 'taiwan', 'chips-act', 'AI', 'geopolitics'],
  relatedTickers: ['NVDA', 'AVGO', 'TSM', 'INTC', 'AMD', 'QCOM', 'AMAT', 'MU', 'LRCX', 'TXN'],
};
