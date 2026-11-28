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

export const BENCHMARK_VERSION = 'sem-bench-v1';

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
];
