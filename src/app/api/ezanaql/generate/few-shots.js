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
];

export const FEW_SHOT = `Example 1
User: Top 10 defense contractors this fiscal year by total award value, with year-over-year change.
EzanaQL:
${FEW_SHOT_QUERIES[0]}

Example 2
User: Every NASA award over 50 million dollars, newest first.
EzanaQL:
${FEW_SHOT_QUERIES[1]}`;
