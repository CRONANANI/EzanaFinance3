/**
 * The "Query this" EzanaQL for each hub linkage row. Pure, no imports, so
 * scripts/check-ezanaql-scope.mjs can validate every template against its
 * dimension: a row whose query the validator refuses would be a dead button.
 */

/* String values go inside double quotes; EzanaQL has no escape, so quotes
   and backslashes are dropped. */
export const q = (s) =>
  String(s ?? '')
    .replace(/["\\]/g, '')
    .trim();

export const HUB_QUERIES = {
  memberTicker: (bioguideId, ticker) => `FROM capitol.congress_trades
WHERE bioguide_id = "${q(bioguideId)}" AND ticker = "${q(ticker)}"
SELECT politician, ticker, transaction_type, transaction_date, amount_low, amount_high
ORDER BY transaction_date DESC
LIMIT 50;`,
  memberRecent: (bioguideId) => `FROM capitol.congress_trades
WHERE bioguide_id = "${q(bioguideId)}" AND transaction_date >= LAST 180 DAYS
SELECT politician, ticker, transaction_type, transaction_date, amount_low, amount_high
ORDER BY transaction_date DESC
LIMIT 50;`,
  lobbyingClient: (client) => `FROM capitol.lobbying
WHERE client = "${q(client)}"
SELECT filing_year, period, registrant, amount
ORDER BY filing_year DESC
LIMIT 50;`,
  raiserTrades: (bioguideId) => `FROM capitol.campaign_finance
JOIN capitol.congress_trades ON bioguide_id
WHERE bioguide_id = "${q(bioguideId)}" AND transaction_date >= LAST 12 MONTHS
SELECT politician, receipts, congress_trades.ticker, congress_trades.transaction_type, congress_trades.transaction_date
ORDER BY congress_trades.transaction_date DESC
LIMIT 50;`,
  whaleTicker: (ticker) => `FROM titans.whale_moves
WHERE ticker = "${q(ticker)}"
SELECT filer, change_type, value, whale_score, quarter
ORDER BY whale_score DESC
LIMIT 50;`,
  activistTicker: (ticker) => `FROM titans.activist_stakes
WHERE ticker = "${q(ticker)}"
SELECT filer, form_type, percent_of_class, shares, filed_on
ORDER BY filed_on DESC
LIMIT 50;`,
  oecdSeries: (slug, area) => `FROM lighthouse.oecd
WHERE indicator = "${q(slug)}" AND country_code = "${q(area)}"
SELECT country, year, value, unit
ORDER BY year DESC
LIMIT 30;`,
  market: (marketId) => `FROM prediction.markets
WHERE market_id = "${q(marketId)}"
SELECT question, probability, volume, liquidity, ends_on, link
LIMIT 1;`,
};

/** Which dimension each template belongs to (for the check script). */
export const HUB_QUERY_DIMENSION = {
  memberTicker: 'capitol',
  memberRecent: 'capitol',
  lobbyingClient: 'capitol',
  raiserTrades: 'capitol',
  whaleTicker: 'titans',
  activistTicker: 'titans',
  oecdSeries: 'lighthouse',
  market: 'hive',
};
