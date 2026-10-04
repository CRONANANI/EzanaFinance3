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
${FEW_SHOT_QUERIES[6]}

Example 8
User: Top ten companies that have the most politicians owning shares of it currently that have received at least 100M in government contracts in the last 5 years.
EzanaQL:
${FEW_SHOT_QUERIES[7]}

Example 9
User: Which stocks do the most Republican members currently hold?
EzanaQL:
${FEW_SHOT_QUERIES[8]}`;
