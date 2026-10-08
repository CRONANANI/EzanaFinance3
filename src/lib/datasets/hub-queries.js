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
  tickerHolders: (ticker) => `FROM capitol.holdings
WHERE ticker = "${q(ticker)}"
SELECT politician, party, chamber, est_value, last_trade
ORDER BY est_value DESC
LIMIT 50;`,
  tickerAwards: (ticker) => `FROM gov.contracts
WHERE ticker = "${q(ticker)}" AND action_date >= LAST 12 MONTHS
SELECT recipient, awarding_agency, award_value, action_date
ORDER BY action_date DESC
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
  /* The Capitol Watch hub's opening query; bioguide_id lets a row open the member drawer. */
  capitolHubSeed: () => `FROM capitol.congress_trades
WHERE transaction_date >= LAST 90 DAYS AND transaction_type = "purchase"
SELECT politician, bioguide_id, party, state, ticker, transaction_type, transaction_date, amount_low, amount_high
ORDER BY transaction_date DESC
LIMIT 50;`,
  /* One heatmap cell: the holdings of the tickers its holders hold. */
  tickersHolders: (tickers) => `FROM capitol.holdings
WHERE ticker IN [${String(tickers || '')
    .split(',')
    .map((t) => `"${q(t)}"`)
    .join(', ')}]
SELECT politician, party, chamber, ticker, est_value, last_trade
ORDER BY est_value DESC
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
  eyesChokepoint: (name) => `FROM eyes.chokepoints
WHERE chokepoint = "${q(name)}" AND date >= LAST 90 DAYS
SELECT date, chokepoint, transits, tankers, container_ships
ORDER BY date DESC
LIMIT 90;`,
  eyesPatentsTicker: (ticker) => `FROM eyes.patents
WHERE ticker = "${q(ticker)}"
SELECT patent_id, patent_date, title, cpc_section
ORDER BY patent_date DESC
LIMIT 50;`,
};

/** Which dimension each template belongs to (for the check script). */
export const HUB_QUERY_DIMENSION = {
  memberTicker: 'capitol',
  memberRecent: 'capitol',
  tickerHolders: 'capitol',
  tickerAwards: 'capitol',
  lobbyingClient: 'capitol',
  raiserTrades: 'capitol',
  capitolHubSeed: 'capitol',
  tickersHolders: 'capitol',
  whaleTicker: 'titans',
  activistTicker: 'titans',
  oecdSeries: 'lighthouse',
  market: 'hive',
  eyesChokepoint: 'eyes',
  eyesPatentsTicker: 'eyes',
};
