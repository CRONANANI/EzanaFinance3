/**
 * EzanaQL seed queries for the gov-contracts builder — extracted into a pure
 * module (no imports) so scripts/check-ezanaql-generate.mjs can assert they
 * validate against the catalog. Field names here are EzanaQL CATALOG fields
 * (award_value), never raw DB columns (award_amount) — the catalog's
 * columnMap owns that indirection.
 */

export const SEED_QUERY = `FROM gov.contracts
WHERE fiscal_year = 2008 AND awarding_agency = "Department of Defense"
SELECT recipient, awarding_agency, SUM(award_value) AS total
GROUP BY recipient, awarding_agency
ORDER BY total DESC
LIMIT 10;`;

export function seedFromFilters({ agencies = [], fiscalYear }) {
  const conds = [];
  if (fiscalYear !== 'all') conds.push(`fiscal_year = ${fiscalYear}`);
  if (agencies.length === 1) conds.push(`awarding_agency = "${agencies[0]}"`);
  // EzanaQL list syntax is square brackets: IN ["a", "b"] — the old
  // parenthesized form never parsed (caught by check-ezanaql-generate).
  else if (agencies.length > 1)
    conds.push(`awarding_agency IN [${agencies.map((a) => `"${a}"`).join(', ')}]`);
  const where = conds.length ? `\nWHERE ${conds.join(' AND ')}` : '';
  return `FROM gov.contracts${where}
SELECT recipient, awarding_agency, SUM(award_value) AS total
GROUP BY recipient, awarding_agency
ORDER BY total DESC
LIMIT 10;`;
}
