/**
 * The query console's worked example and "Or try" chips.
 *
 * Pure, no imports: scripts/check-datasets-sonar.mjs parses and validates the
 * query against the EzanaQL catalog, so a catalog change that breaks it fails
 * CI instead of shipping a console whose Run can only refuse.
 *
 * EzanaQL is scoped to one dimension per query (see request-scope.js), and a
 * query joins at most two datasets. The worked example therefore crosses two
 * Capitol Watch datasets; the chips each reach a different live dimension.
 * The query is pinned rather than generated on every render, so the page never
 * spends model credit to draw itself. "Ask Sonar" generates live.
 */

export const WORKED_EXAMPLE = {
  dimension: 'capitol',
  question: 'Which members bought shares of Defense Department contractors in the last 12 months?',
  query: `FROM capitol.congress_trades
JOIN gov.contracts ON ticker
WHERE transaction_type = "purchase" AND transaction_date >= LAST 12 MONTHS AND awarding_agency = "Department of Defense"
SELECT politician, ticker, MAX(transaction_date) AS last_buy, SUM(contracts.award_value) AS recent_dod_awards
GROUP BY politician, ticker
ORDER BY recent_dod_awards DESC
LIMIT 50;`,
};

/* Every chip names a dimension with live, queryable data today. */
export const TRY_CHIPS = [
  {
    dimension: 'capitol',
    label: 'Contractors members still hold',
    question: 'Which federal contractors do the most members of Congress still hold?',
  },
  {
    dimension: 'titans',
    label: 'Insider buying, 90 days',
    question: 'Which stocks did company insiders buy the most in the last 90 days?',
  },
  {
    dimension: 'eyes',
    label: 'Patent leaders this year',
    question: 'Which companies were granted the most patents this year?',
  },
  {
    dimension: 'lighthouse',
    label: 'Unemployment across the OECD',
    question: 'Which OECD countries have the highest unemployment rate?',
  },
];

/**
 * EzanaQL catalog dataset to the taxonomy dataset a reader can open. Used for
 * the JOINS chips, so they name the datasets the query actually touches.
 */
export const CATALOG_TO_DATASET = {
  'capitol.congress_trades': 'Politician Tracker',
  'capitol.holdings': 'Politician Tracker',
  'house.trades': 'Politician Tracker',
  'house.filings': 'Politician Tracker',
  'gov.contracts': 'Government Contracts',
  'capitol.lobbying': 'Lobbying Activity',
  'capitol.committee_seats': 'Committee Assignments',
  'capitol.campaign_finance': 'Campaign Finance Records',
  'titans.holdings_13f': 'Institutional',
  'titans.activist_stakes': 'Activist',
  'titans.whale_moves': 'Whale Moves',
  'titans.insider_trades': 'Insider Trading',
  'titans.fundamentals': 'Prices & Fundamentals',
  'titans.exec_comp': 'Executive Compensation',
  'titans.etf_holdings': 'ETF Holdings',
  'lighthouse.oecd': 'OECD Macro Data',
  'eyes.chokepoints': 'Supply Chain Monitoring',
  'eyes.ports': 'Supply Chain Monitoring',
  'eyes.patents': 'Patent Activity',
};

/** The datasets in a run's { dataset, joined }, as taxonomy labels, de-duplicated. */
export function joinedDatasets(run) {
  const names = [run?.dataset, run?.joined].filter(Boolean);
  return [...new Set(names.map((n) => CATALOG_TO_DATASET[n] || n))];
}

/* Column headers for the preview: catalog field or alias to a short label. */
const HEADS = {
  politician: 'Member',
  ticker: 'Ticker',
  last_buy: 'Last buy',
  recent_dod_awards: 'DoD awards',
  party: 'Party',
  transaction_date: 'Traded',
  award_value: 'Award',
};

export function columnHead(key) {
  if (HEADS[key]) return HEADS[key];
  return String(key)
    .replace(/\s*\(~midpoint\)$/, ' (est.)')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}
