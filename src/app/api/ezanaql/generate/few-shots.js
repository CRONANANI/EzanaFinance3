/**
 * Few-shot examples for the NL → EzanaQL generator — extracted into a pure
 * module so scripts/check-ezanaql-generate.mjs can assert every example
 * query validates against the catalog (a drifted example teaches the model
 * to emit invalid queries).
 */

const CAPITOL_QUERIES = [
  `FROM gov.contracts
WHERE awarding_agency = "DoD" AND fiscal_year = 2026
SELECT recipient, SUM(award_value) AS total, YOY(award_value) AS yoy_change
GROUP BY recipient
ORDER BY total DESC
LIMIT 10;`,
  `FROM gov.contracts
WHERE awarding_agency = "NASA" AND award_value >= 50M
SELECT recipient, award_value, action_date
ORDER BY action_date DESC
LIMIT 100;`,
  /* One per newly bound dataset that is actually queryable today. The
     house-trades example is held back with its dataset: teaching the model to
     target something the validator refuses is worse than not teaching it at
     all. */
  `FROM capitol.lobbying
WHERE client = "Lockheed Martin"
SELECT filing_year, SUM(amount) AS spend
GROUP BY filing_year
ORDER BY filing_year DESC
LIMIT 20;`,
  `FROM capitol.congress_trades
WHERE transaction_date >= LAST 6 MONTHS AND transaction_type = "purchase"
SELECT politician, party, COUNT() AS buys, SUM(amount_est) AS est_bought
GROUP BY politician, party
ORDER BY est_bought DESC
LIMIT 10;`,
  /* SEMI JOIN: the trades only decide which contractors count; the sum is
     over contracts alone, so it is not multiplied per trade. */
  `FROM gov.contracts
SEMI JOIN capitol.congress_trades ON ticker
WHERE action_date >= LAST 5 YEARS
SELECT parent, ticker, SUM(award_value) AS awarded
GROUP BY parent, ticker
HAVING SUM(award_value) >= 100M
ORDER BY awarded DESC
LIMIT 10;`,
  /* JOIN: the answer needs the trades' own fields. Each aggregate sees its
     own side once, so a count of trades counts trade rows, not pairs. */
  `FROM gov.contracts
JOIN capitol.congress_trades ON ticker
WHERE transaction_date >= LAST 2 YEARS
SELECT ticker, parent, COUNT(DISTINCT congress_trades.politician) AS members, COUNT(congress_trades.transaction_date) AS trades
GROUP BY ticker, parent
ORDER BY members DESC
LIMIT 10;`,
  /* Holdings, not trades: "own" means a position still open. SUM(award_value)
     is over the awards once each; the holder count is over the holdings. */
  `FROM gov.contracts
JOIN capitol.holdings ON ticker
WHERE action_date >= LAST 5 YEARS
SELECT ticker, parent, SUM(award_value) AS contracts, COUNT(DISTINCT holdings.politician) AS holders
GROUP BY ticker, parent
HAVING SUM(award_value) >= 100M
ORDER BY holders DESC
LIMIT 10;`,
  `FROM capitol.holdings
WHERE party = "R"
SELECT ticker, COUNT(DISTINCT politician) AS holders, SUM(est_value) AS est_held
GROUP BY ticker
ORDER BY holders DESC
LIMIT 10;`,
];

/* Committee seats and campaign finance, the two Capitol datasets that key on
   bioguide_id. */
const CAPITOL_MEMBER_QUERIES = [
  `FROM capitol.congress_trades
SEMI JOIN capitol.committee_seats ON bioguide_id
WHERE transaction_date >= LAST 90 DAYS AND transaction_type = "purchase"
SELECT politician, party, ticker, transaction_date, amount_low, amount_high
ORDER BY transaction_date DESC
LIMIT 25;`,
  `FROM capitol.campaign_finance
WHERE cycle = 2026
SELECT politician, party, state, receipts, cash_on_hand
ORDER BY receipts DESC
LIMIT 10;`,
];

const TITANS_QUERIES = [
  `FROM titans.holdings_13f
WHERE period >= LAST 6 MONTHS
SELECT ticker, COUNT(DISTINCT filer) AS funds, SUM(value) AS reported_value
GROUP BY ticker
ORDER BY funds DESC
LIMIT 10;`,
  `FROM titans.activist_stakes
WHERE filed_on >= LAST 90 DAYS AND percent_of_class >= 5
SELECT filer, company, ticker, percent_of_class, filed_on
ORDER BY filed_on DESC
LIMIT 25;`,
  `FROM titans.whale_moves
SEMI JOIN titans.activist_stakes ON ticker
SELECT filer, ticker, change_type, whale_score, quarter
ORDER BY whale_score DESC
LIMIT 20;`,
];

/* category is empty in today's index, so the examples filter on what is
   filled: probability, volume and liquidity. */
const HIVE_QUERIES = [
  `FROM prediction.markets
SELECT question, probability, volume, ends_on
ORDER BY volume DESC
LIMIT 10;`,
  `FROM prediction.markets
WHERE probability >= 0.4 AND probability <= 0.6 AND volume >= 1M
SELECT question, probability, volume, liquidity
ORDER BY volume DESC
LIMIT 20;`,
];

const EYES_QUERIES = [
  `FROM eyes.chokepoints
WHERE chokepoint = "Suez Canal" AND date >= LAST 90 DAYS
SELECT date, chokepoint, transits, tankers, container_ships
ORDER BY date DESC
LIMIT 90;`,
  `FROM eyes.patents
WHERE patent_date >= LAST 12 MONTHS AND ticker IS NOT NULL
SELECT ticker, COUNT(patent_id) AS grants
GROUP BY ticker
ORDER BY grants DESC
LIMIT 20;`,
];

const LIGHTHOUSE_QUERIES = [
  `FROM lighthouse.oecd
WHERE country_code = "USA" AND year >= 2020
SELECT indicator, year, value, unit
ORDER BY indicator ASC, year DESC
LIMIT 60;`,
  `FROM lighthouse.oecd
WHERE indicator = "eo-unr" AND year = 2025
SELECT country, value, unit
ORDER BY value DESC
LIMIT 10;`,
];

/** Worked examples per dataset dimension: { user, query }. */
export const FEW_SHOTS_BY_DIMENSION = {
  capitol: [
    {
      user: 'Top 10 defense contractors this fiscal year by total award value, with year-over-year change.',
      query: CAPITOL_QUERIES[0],
    },
    { user: 'Every NASA award over 50 million dollars, newest first.', query: CAPITOL_QUERIES[1] },
    {
      user: 'How much has Lockheed Martin spent on lobbying each year?',
      query: CAPITOL_QUERIES[2],
    },
    {
      user: 'Which members of Congress bought the most stock in the last six months?',
      query: CAPITOL_QUERIES[3],
    },
    {
      user: 'Top 10 companies that received at least 100M in government contracts in the past 5 years that politicians have traded.',
      query: CAPITOL_QUERIES[4],
    },
    {
      user: 'For each federal contractor, how many members of Congress have traded its stock in the last two years?',
      query: CAPITOL_QUERIES[5],
    },
    {
      user: 'Top ten companies that have the most politicians owning shares of it currently that have received at least 100M in government contracts in the last 5 years.',
      query: CAPITOL_QUERIES[6],
    },
    {
      user: 'Which stocks do the most Republican members currently hold?',
      query: CAPITOL_QUERIES[7],
    },
    {
      user: 'Recent stock purchases by members who sit on a committee.',
      query: CAPITOL_MEMBER_QUERIES[0],
    },
    {
      user: 'Which members raised the most money this cycle?',
      query: CAPITOL_MEMBER_QUERIES[1],
    },
  ],
  titans: [
    {
      user: 'Which stocks are held by the most institutional funds right now?',
      query: TITANS_QUERIES[0],
    },
    {
      user: 'Activist stakes above 5 percent filed in the last 90 days.',
      query: TITANS_QUERIES[1],
    },
    {
      user: 'The highest scored whale moves in stocks that also have an activist stake.',
      query: TITANS_QUERIES[2],
    },
  ],
  hive: [
    { user: 'The biggest prediction markets by volume.', query: HIVE_QUERIES[0] },
    {
      user: 'Close calls: markets near 50 percent with at least 1M traded.',
      query: HIVE_QUERIES[1],
    },
  ],
  lighthouse: [
    {
      user: 'Every OECD indicator for the United States since 2020.',
      query: LIGHTHOUSE_QUERIES[0],
    },
    {
      user: 'Which countries have the highest unemployment rate in 2025?',
      query: LIGHTHOUSE_QUERIES[1],
    },
  ],
  eyes: [
    {
      user: 'Daily transits through the Suez Canal over the last 90 days.',
      query: EYES_QUERIES[0],
    },
    {
      user: 'Which companies were granted the most patents in the last 12 months?',
      query: EYES_QUERIES[1],
    },
  ],
  whispers: [],
  regulatory: [],
};

/** Every example query, for the check script. */
export const FEW_SHOT_QUERIES = Object.values(FEW_SHOTS_BY_DIMENSION).flatMap((list) =>
  list.map((e) => e.query),
);

/** The prompt block of worked examples for one dimension. */
export function fewShotFor(dimension) {
  return (FEW_SHOTS_BY_DIMENSION[dimension] || [])
    .map((e, i) => `Example ${i + 1}\nUser: ${e.user}\nEzanaQL:\n${e.query}`)
    .join('\n\n');
}
