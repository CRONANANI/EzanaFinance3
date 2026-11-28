/**
 * Sonar 6.0 (Nov 28 2026): the query-equivalence benchmark.
 *
 * GROUPS: paraphrases that must resolve to the same canonical intent (same family,
 *   entity, universes, measure, ranking, time, operations, so the same plan signature
 *   once the entity resolves). Conversational wording, typos, abbreviations and reordered
 *   clauses on purpose.
 * HARD_NEGATIVES: near-identical questions that must NOT merge (measure, direction,
 *   universe, comparison class, holdings vs trades).
 *
 * Multilingual equivalence is not supported or claimed: every fixture is English.
 */

export const BENCHMARK_VERSION = 'sem-bench-v2';

export const GROUPS = [
  {
    id: 'pelosi-own-breadth',
    family: 'institutional_ownership',
    measure: 'breadth',
    entity: 'pelosi',
    reportFamily: 'institutional_ownership_intelligence',
    queries: [
      'Can you tell me what stocks Nancy Pelosi owns that are most owned by investment firms?',
      'Tell me what stocks owned by Nancy Pelosi are also owned the most by investment firms.',
      "Which of Pelosi's stocks are held by the greatest number of investment managers?",
      "Rank Nancy Pelosi's holdings by the number of institutional investors.",
      "Which stocks in Pelosi's estimated portfolio are most widely held by institutions?",
      "Among Pelosi's disclosed equities, which have the most 13F reporting managers?",
      "Show the most institutionally popular securities in Nancy Pelosi's portfolio.",
      'What Pelosi holdings have the broadest institutional ownership?',
      "List Pelosi's estimated stocks by institutional manager count.",
      "Which of Nancy Pelosi's investments appear in the most institutional portfolios?",
      /* noisy */
      'what stocks does nancy pelosi own that are most owned by instituional investors',
      "pelosi's stoks that hedge funds hold the most",
      "hey which of pelosi's holdings are most widely held by wall street firms",
    ],
  },
  {
    id: 'pelosi-own-value',
    family: 'institutional_ownership',
    measure: 'value',
    entity: 'pelosi',
    queries: [
      'Which Pelosi holdings have the most institutional money invested?',
      "Rank Nancy Pelosi's stocks by the dollar value institutions reported holding.",
      "Which of Pelosi's stocks do investment firms have the most capital in?",
    ],
  },
  {
    id: 'pelosi-own-change',
    family: 'institutional_ownership',
    measure: 'change',
    entity: 'pelosi',
    queries: [
      'Which Pelosi holdings gained the most institutional owners last quarter?',
      "Which of Nancy Pelosi's stocks added the most 13F managers over the last quarter?",
      "In Pelosi's portfolio, which stocks had the biggest increase in institutional holders last quarter?",
    ],
  },
  {
    id: 'blackrock-own-breadth',
    family: 'institutional_ownership',
    measure: 'breadth',
    entity: 'blackrock',
    queries: [
      "Which of BlackRock's holdings are most widely held by hedge funds?",
      'Which stocks held by BlackRock are owned by the most other institutions?',
    ],
  },
  {
    id: 'palantir-gov-dependence',
    family: 'government_contract_dependency',
    entity: 'palantir',
    queries: [
      'How dependent is Palantir on government revenue?',
      "What share of Palantir's revenue comes from the US government?",
      'how reliant is palantir on federal contracts',
    ],
  },
  {
    id: 'nvidia-growth-risk',
    family: 'growth_risk',
    entity: 'nvidia',
    queries: [
      "What are the biggest risks to NVIDIA's growth?",
      'What could go wrong for NVIDIA?',
      'Which headwinds threaten NVIDIA growth?',
    ],
  },
  {
    id: 'msft-ai-infra',
    family: 'ai_infrastructure_strategy',
    entity: 'microsoft',
    queries: [
      "What is Microsoft's AI infrastructure strategy?",
      'How is Microsoft building out AI data centers?',
    ],
  },
  {
    id: 'turkey-lira',
    family: 'currency_pressure',
    entity: 'turkey',
    queries: ["Is Turkey's lira under pressure?", 'Is the Turkish lira weakening?'],
  },
  {
    id: 'contract-acceleration',
    family: 'government_contract_acceleration',
    entity: 'lockheed',
    queries: [
      "Are Lockheed Martin's government contracts accelerating?",
      'Is Lockheed Martin seeing rising contract awards?',
    ],
  },
  {
    id: 'aapl-fundamentals',
    family: 'fundamental_analysis',
    entity: 'apple',
    queries: ['Give me a fundamental analysis of Apple.', "Review Apple's financial health."],
  },
  {
    id: 'msft-dcf',
    family: 'dcf_valuation',
    entity: 'microsoft',
    queries: ['Run a DCF on Microsoft.', "What is Microsoft's intrinsic value?"],
  },
  {
    id: 'tsla-garch',
    family: 'garch_volatility',
    entity: 'tesla',
    queries: ['Fit a GARCH model to Tesla.', "Forecast Tesla's conditional volatility."],
  },
  {
    id: 'pelosi-backtest',
    family: 'backtest',
    entity: 'pelosi',
    queries: [
      "Backtest copying Nancy Pelosi's trades.",
      "How would a strategy following Pelosi's purchases have performed?",
    ],
  },
  {
    id: 'sanctions',
    family: 'sanctions_exposure',
    entity: 'nvidia',
    queries: ["What is NVIDIA's exposure to export controls?", 'Is NVIDIA affected by sanctions?'],
  },
  {
    id: 'lobbying',
    family: 'lobbying_activity',
    entity: 'meta',
    queries: ['How much does Meta spend on lobbying?', "What is Meta's lobbying activity?"],
  },
  {
    id: 'prediction',
    family: 'prediction_markets',
    entity: null,
    queries: [
      'What do prediction markets say about a rate cut?',
      'What are the Polymarket odds of a rate cut?',
    ],
  },
  /* ── v2 (Nov 28 2026): more holders, compositional families, noise ── */
  {
    id: 'tuberville-own-breadth',
    family: 'institutional_ownership',
    measure: 'breadth',
    entity: 'tuberville',
    queries: [
      "Which of Tommy Tuberville's stocks are most widely held by institutions?",
      "Rank Tuberville's holdings by how many 13F managers own them.",
      'What stocks owned by Tommy Tuberville are held by the most investment firms?',
      "tuberville's stocks that the most hedge funds hold",
      "Among Tuberville's disclosed equities which are most popular with fund managers?",
    ],
  },
  {
    id: 'crenshaw-own-value',
    family: 'institutional_ownership',
    measure: 'value',
    entity: 'crenshaw',
    queries: [
      "Which of Dan Crenshaw's holdings have the most institutional money invested?",
      "Rank Dan Crenshaw's stocks by the total dollar value 13F filers reported.",
      "In Crenshaw's portfolio, where do investment firms have the most capital?",
    ],
  },
  {
    id: 'berkshire-own-breadth',
    family: 'institutional_ownership',
    measure: 'breadth',
    entity: 'berkshire',
    queries: [
      "Which of Berkshire Hathaway's holdings are owned by the most other institutions?",
      "Rank Berkshire Hathaway's stocks by the number of institutional investors.",
      'What stocks held by Berkshire Hathaway are most widely held by hedge funds?',
    ],
  },
  {
    id: 'pelosi-own-change-down',
    family: 'institutional_ownership',
    measure: 'change',
    entity: 'pelosi',
    queries: [
      'Which Pelosi holdings lost the most institutional owners last quarter?',
      "Which of Nancy Pelosi's stocks did investment firms exit the most last quarter?",
      "In Pelosi's portfolio which stocks saw the biggest decrease in 13F managers last quarter?",
    ],
  },
  {
    id: 'screen-semis-growth-inst',
    family: 'multi_stage_screen',
    queries: [
      'Which semiconductor stocks with revenue growth above 20% are most held by institutions?',
      'Among chipmakers growing revenue more than 20%, which are most widely held by funds?',
      'Find semis with revenue growth over 20% and rank them by institutional ownership.',
      'semiconductor companies with sales growth greater than 20 percent ranked by how many institutions own them',
    ],
  },
  {
    id: 'screen-defense-contracts-lobbying',
    family: 'multi_stage_screen',
    queries: [
      'Which defense contractors that won government contracts spend the most on lobbying?',
      'Rank defense companies with federal contract awards by lobbying spend.',
      'Among defense stocks that received government contracts, which lobby the most?',
    ],
  },
  {
    id: 'screen-banks-pe',
    family: 'multi_stage_screen',
    queries: [
      'Find bank stocks with a P/E below 10.',
      'Screen banks whose price to earnings is under 10.',
      'Show banking stocks with a PE ratio less than 10.',
    ],
  },
  {
    id: 'screen-sp500-insiders',
    family: 'multi_stage_screen',
    queries: [
      'Which S&P 500 companies did insiders buy the most last month?',
      'Rank S&P 500 stocks by insider buying over the last month.',
      'In the S&P 500, where were insiders buying most over the past month?',
    ],
  },
  {
    id: 'screen-defense-contract-rank',
    family: 'multi_stage_screen',
    queries: [
      'Which defense companies received the most federal contract dollars?',
      'Rank defense contractors by government contract awards.',
      'Top defense stocks by contract obligations',
    ],
  },
  {
    id: 'macro-rates-banks',
    family: 'macro_relationship',
    queries: [
      'How do rising interest rates affect bank stocks?',
      'What is the relationship between interest rates and bank stock returns?',
      'How sensitive are banks to rate hikes?',
      'impact of higher interest rates on banking stocks',
      'Do bank stocks move with interest rates?',
    ],
  },
  {
    id: 'macro-oil-energy',
    family: 'macro_relationship',
    queries: [
      'How do oil prices affect energy stocks?',
      'What is the impact of crude prices on energy companies?',
      'Relationship between oil prices and energy stock returns',
    ],
  },
  {
    id: 'macro-inflation-utilities',
    family: 'macro_relationship',
    queries: [
      'How does inflation affect utility stocks?',
      'What is the effect of inflation on utilities?',
      'Are utilities sensitive to inflation?',
    ],
  },
  {
    id: 'boeing-gov-dependence',
    family: 'government_contract_dependency',
    entity: 'boeing',
    queries: [
      'How dependent is Boeing on the US government?',
      "What share of Boeing's revenue comes from federal contracts?",
      'How much does Boeing rely on government revenue?',
    ],
  },
  {
    id: 'nvda-margins',
    family: 'fundamental_analysis',
    entity: 'nvidia',
    queries: [
      "How have NVIDIA's margins changed?",
      'What are NVIDIA gross margins doing?',
      "Analyze NVIDIA's profit margins.",
    ],
  },
  {
    id: 'aapl-debt',
    family: 'fundamental_analysis',
    entity: 'apple',
    queries: [
      'How much debt does Apple have?',
      "Assess Apple's leverage.",
      "Is Apple's balance sheet over-leveraged?",
    ],
  },
  {
    id: 'nvda-dcf',
    family: 'dcf_valuation',
    entity: 'nvidia',
    queries: [
      'Build a DCF for NVIDIA.',
      'What is NVIDIA worth on a discounted cash flow basis?',
      "Estimate NVIDIA's intrinsic value.",
    ],
  },
  {
    id: 'spy-garch',
    family: 'garch_volatility',
    entity: 'spy',
    queries: [
      'Run a GARCH model on SPY.',
      "Forecast SPY's conditional volatility.",
      'GARCH volatility forecast for SPY',
    ],
  },
  {
    id: 'tuberville-backtest',
    family: 'backtest',
    entity: 'tuberville',
    queries: [
      "Backtest following Tommy Tuberville's trades.",
      "How would copying Tuberville's purchases have performed?",
      "Simulate mirroring Tuberville's disclosed buys",
    ],
  },
  {
    id: 'overlap-pelosi-tuberville',
    family: 'holdings_overlap',
    entity: 'pelosi',
    queries: [
      'What stocks do both Nancy Pelosi and Tommy Tuberville own?',
      'Which holdings do Pelosi and Tuberville have in common?',
      'Stocks owned by both Pelosi and Tuberville',
    ],
  },
  {
    id: 'argentina-peso',
    family: 'currency_pressure',
    entity: 'argentina',
    queries: [
      "Is Argentina's peso under pressure?",
      'Is the Argentine peso weakening?',
      'Argentina currency stress',
    ],
  },
  {
    id: 'lmt-lobbying',
    family: 'lobbying_activity',
    entity: 'lockheed',
    queries: [
      'How much does Lockheed Martin spend on lobbying?',
      "What is Lockheed Martin's lobbying activity?",
      'Lockheed Martin lobbying spend',
    ],
  },
  {
    id: 'prediction-election',
    family: 'prediction_markets',
    entity: null,
    queries: [
      'What are the prediction market odds of a recession?',
      'What does Kalshi say about a recession?',
      'Polymarket recession odds',
    ],
  },
];

/* [a, b, field that must differ] */
export const HARD_NEGATIVES = [
  [
    'Which Pelosi holdings have the most institutional managers?',
    'Which Pelosi holdings have the most institutional money invested?',
    'measure',
  ],
  [
    'Which Pelosi holdings have the most institutional owners?',
    'Which Pelosi holdings gained the most institutional owners last quarter?',
    'measure',
  ],
  [
    'Which Pelosi holdings have the most institutional managers?',
    'Which Pelosi holdings have the highest institutional ownership percentage?',
    'measure',
  ],
  [
    "Which of Pelosi's stocks are most widely held by investment firms?",
    "Which of Pelosi's stocks are most widely held by other members of Congress?",
    'family',
  ],
  [
    'Which Pelosi stocks have the highest institutional ownership?',
    'Which stocks purchased by Pelosi in the last 30 days have the highest institutional ownership?',
    'subject_universe',
  ],
  [
    'Which Pelosi holdings have the highest institutional ownership?',
    'Which Pelosi holdings have the lowest institutional ownership?',
    'ranking',
  ],
  [
    'Which Pelosi holdings gained the most institutional owners last quarter?',
    'Which Pelosi holdings lost the most institutional owners last quarter?',
    'ranking',
  ],
  [
    'Which Pelosi holdings gained the most institutional owners last quarter?',
    'Which Pelosi holdings gained the most institutional owners over the last year?',
    'time',
  ],
  [
    "Which of Pelosi's stocks are most owned by institutions?",
    'Which of the top 5 Pelosi stocks are most owned by institutions?',
    'params',
  ],
  [
    "Which of Pelosi's stocks are most owned by institutions?",
    "Which of Tuberville's stocks are most owned by institutions?",
    'primary_entity',
  ],
  [
    'Which stocks sold by Pelosi have the highest institutional ownership?',
    'Which stocks bought by Pelosi have the highest institutional ownership?',
    'subject_universe',
  ],
  [
    'How dependent is Palantir on government revenue?',
    "Are Palantir's government contracts accelerating?",
    'family',
  ],
  /* v2 */
  [
    'Which semiconductor stocks with revenue growth above 20% are most held by institutions?',
    'Which semiconductor stocks with revenue growth below 20% are most held by institutions?',
    'composition',
  ],
  [
    'Which semiconductor stocks with revenue growth above 20% are most held by institutions?',
    'Which semiconductor stocks with revenue growth above 30% are most held by institutions?',
    'composition',
  ],
  [
    'Which semiconductor stocks with revenue growth above 20% are most held by institutions?',
    'Which software stocks with revenue growth above 20% are most held by institutions?',
    'composition',
  ],
  [
    'Which semiconductor stocks with revenue growth above 20% are most held by institutions?',
    'Which semiconductor stocks with earnings growth above 20% are most held by institutions?',
    'composition',
  ],
  ['Find bank stocks with a P/E below 10.', 'Find bank stocks with a P/E above 10.', 'composition'],
  [
    'How do rising interest rates affect bank stocks?',
    'How does inflation affect bank stocks?',
    'composition',
  ],
  [
    'How do rising interest rates affect bank stocks?',
    'How do rising interest rates affect utility stocks?',
    'composition',
  ],
  [
    'How do rising interest rates affect bank stocks?',
    'Compare bank stocks and utility stocks.',
    'family',
  ],
  ['Build a DCF for NVIDIA.', 'Run a GARCH model on NVIDIA.', 'family'],
  ['Build a DCF for NVIDIA.', 'Build a DCF for AMD.', 'primary_entity'],
  [
    'What stocks do both Nancy Pelosi and Tommy Tuberville own?',
    "Compare Nancy Pelosi's and Tommy Tuberville's portfolios.",
    'family',
  ],
  ["How have NVIDIA's margins changed?", 'How much debt does NVIDIA have?', 'composition'],
  [
    'Which S&P 500 companies did insiders buy the most last month?',
    'Which S&P 500 companies did insiders sell the most last month?',
    'composition',
  ],
  [
    'Which S&P 500 companies did insiders buy the most last month?',
    'Which S&P 500 companies did insiders buy the most last year?',
    'composition',
  ],
  [
    "Which of Berkshire Hathaway's holdings are owned by the most other institutions?",
    "Which of Berkshire Hathaway's holdings have the most institutional money invested?",
    'measure',
  ],
  [
    'How dependent is Boeing on the US government?',
    'How much does Boeing spend on lobbying?',
    'family',
  ],
  ["Is Argentina's peso under pressure?", "Is Turkey's lira under pressure?", 'primary_entity'],
  [
    'Which defense companies received the most federal contract dollars?',
    'Which defense companies received the fewest federal contract dollars?',
    'composition',
  ],
  [
    'What are the prediction market odds of a recession?',
    'What are the prediction market odds of a rate cut?',
    'composition',
  ],
  [
    "Backtest following Tommy Tuberville's trades.",
    "Backtest following Nancy Pelosi's trades.",
    'primary_entity',
  ],
];

/* Follow-ups: [prior question, follow-up, the complete question it means]. */
export const FOLLOW_UPS = [
  [
    "Which of Nancy Pelosi's stocks are most owned by investment firms?",
    'What about Tommy Tuberville?',
    "Which of Tommy Tuberville's stocks are most owned by investment firms?",
  ],
  [
    "Which of Nancy Pelosi's stocks are most owned by investment firms?",
    'same for Dan Crenshaw',
    "Which of Dan Crenshaw's stocks are most owned by investment firms?",
  ],
  [
    "Which of Nancy Pelosi's stocks are most owned by investment firms?",
    'rank by dollar value instead',
    "Which of Nancy Pelosi's holdings have the most institutional money invested?",
  ],
  [
    "Which of Nancy Pelosi's stocks are most owned by investment firms?",
    'and by the change?',
    'Which Pelosi holdings gained the most institutional owners last quarter?',
  ],
  [
    'How dependent is Palantir on government revenue?',
    'and Boeing?',
    'How dependent is Boeing on the US government?',
  ],
  [
    "Is Turkey's lira under pressure?",
    'What about Argentina?',
    "Is Argentina's peso under pressure?",
  ],
  ['Build a DCF for NVIDIA.', 'Now do AMD', 'Build a DCF for AMD.'],
];
