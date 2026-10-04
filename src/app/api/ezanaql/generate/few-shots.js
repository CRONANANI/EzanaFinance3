/**
 * Few-shot examples for the NL → EzanaQL generator — extracted into a pure
 * module so scripts/check-ezanaql-generate.mjs can assert every example
 * query validates against the catalog (a drifted example teaches the model
 * to emit invalid queries).
 */

export const FEW_SHOT_QUERIES = [
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
  `FROM prediction.markets
WHERE category = "Politics"
SELECT question, probability, volume, ends_on
ORDER BY volume DESC
LIMIT 10;`,
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
  /* JOIN: the answer needs the trades' own fields, so pairs are wanted. */
  `FROM gov.contracts
JOIN capitol.congress_trades ON ticker
WHERE transaction_date >= LAST 2 YEARS
SELECT ticker, recipient, COUNT(DISTINCT congress_trades.politician) AS members, COUNT() AS trades
GROUP BY ticker, recipient
ORDER BY members DESC
LIMIT 10;`,
];

export const FEW_SHOT = `Example 1
User: Top 10 defense contractors this fiscal year by total award value, with year-over-year change.
EzanaQL:
${FEW_SHOT_QUERIES[0]}

Example 2
User: Every NASA award over 50 million dollars, newest first.
EzanaQL:
${FEW_SHOT_QUERIES[1]}

Example 3
User: How much has Lockheed Martin spent on lobbying each year?
EzanaQL:
${FEW_SHOT_QUERIES[2]}

Example 4
User: The most traded political prediction markets.
EzanaQL:
${FEW_SHOT_QUERIES[3]}

Example 5
User: Which members of Congress bought the most stock in the last six months?
EzanaQL:
${FEW_SHOT_QUERIES[4]}

Example 6
User: Top 10 companies that received at least 100M in government contracts in the past 5 years that politicians have traded.
EzanaQL:
${FEW_SHOT_QUERIES[5]}

Example 7
User: For each federal contractor, how many members of Congress have traded its stock in the last two years?
EzanaQL:
${FEW_SHOT_QUERIES[6]}`;
