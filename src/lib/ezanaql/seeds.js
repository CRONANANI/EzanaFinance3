/**
 * Seed queries per dataset, so every page's query bar starts from a query
 * that actually runs.
 *
 * Pure, no imports, so scripts/check-ezanaql-generate.mjs can assert each one
 * validates against the catalog. Field names are EzanaQL CATALOG fields, never
 * raw DB columns; the catalog's columnMap owns that indirection.
 *
 * A page whose dataset is not bound and live gets a cross-dataset seed from
 * one that is, chosen for relevance to that page's theme. Seeding a query
 * against an unavailable dataset would hand someone a bar whose Run can only
 * ever refuse.
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

/** Lobbying spend by year for one client. */
export const SEED_LOBBYING = `FROM capitol.lobbying
SELECT client, filing_year, SUM(amount) AS spend
GROUP BY client, filing_year
ORDER BY spend DESC
LIMIT 20;`;

/** The most traded open prediction markets. */
export const SEED_PREDICTION = `FROM prediction.markets
SELECT question, category, probability, volume, ends_on
ORDER BY volume DESC
LIMIT 20;`;

/** Every STOCK Act trade, newest first: the Politician Tracker's own data. */
export const SEED_CONGRESS = `FROM capitol.congress_trades
WHERE transaction_date >= LAST 90 DAYS
SELECT politician, party, ticker, transaction_type, transaction_date, amount_low, amount_high
ORDER BY transaction_date DESC
LIMIT 50;`;

/** What members still hold, most widely held first. */
export const SEED_HOLDINGS = `FROM capitol.holdings
SELECT ticker, COUNT(DISTINCT politician) AS holders, SUM(est_value) AS est_held
GROUP BY ticker
ORDER BY holders DESC
LIMIT 20;`;

/** The House filing index. Its trades table is not populated yet, so the
 *  disclosures bar seeds from filings, which do return rows. */
export const SEED_HOUSE_FILINGS = `FROM house.filings
SELECT member_last, filing_type, filing_year, filing_date
ORDER BY filing_date DESC
LIMIT 20;`;

/**
 * Every dataset page's default seed, keyed by the catalog dataset it is
 * scoped to. A page with no bound dataset passes null and gets the
 * cross-dataset default.
 */
export const SEEDS_BY_DATASET = {
  'gov.contracts': SEED_QUERY,
  'capitol.lobbying': SEED_LOBBYING,
  'prediction.markets': SEED_PREDICTION,
  'capitol.congress_trades': SEED_CONGRESS,
  'capitol.holdings': SEED_HOLDINGS,
  'house.filings': SEED_HOUSE_FILINGS,
};

export function seedForDataset(dataset) {
  return SEEDS_BY_DATASET[dataset] || SEED_QUERY;
}
