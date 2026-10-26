/**
 * Ezana API catalog: capitol dimension. Pure, client-safe (read by the docs
 * page). See registry.js for the route shape.
 *
 *   PARAMS  query params this dimension adds (names must be new)
 *   ROUTES  { groupKey: [route, ...] } appended to an existing group
 *   GROUPS  new groups, each with dimension: 'capitol'
 */
export const PARAMS = {
  min_members: {
    type: 'int',
    min: 1,
    max: 20,
    desc: 'Minimum number of distinct members who traded the ticker, 1 to 20 (default 2).',
  },
  state: {
    type: 'string',
    pattern: /^[A-Z]{2}$/,
    desc: 'Two-letter US state code, upper-case (for example TX).',
  },
  cycle: {
    type: 'int',
    min: 2000,
    max: 2100,
    desc: 'FEC two-year election cycle, an even year (default: the latest cycle Ezana holds).',
  },
  min_seats: {
    type: 'int',
    min: 1,
    max: 60,
    desc: 'Leave out committees with fewer seats than this, 1 to 60 (default 10).',
  },
  near_days: {
    type: 'int',
    min: 1,
    max: 90,
    desc: 'How many days either side of an award date a trade must fall, 1 to 90 (default 30).',
  },
  award_actor: {
    type: 'string',
    enum: ['politician', 'insider', 'whale', 'institution'],
    desc: 'Only one kind of actor: politician, insider (Form 4), whale (13D/G or large 13F move) or institution.',
  },
  issue_period: {
    type: 'string',
    enum: ['year', 'q1', 'q2', 'q3', 'q4'],
    desc: 'The whole filing year, or one quarter of it (default year).',
  },
  lobby_years: {
    type: 'int',
    min: 1,
    max: 3,
    desc: 'How many calendar years of lobbying to sum, 1 to 3, ending with the current year (default per endpoint).',
  },
  lobby_match: {
    type: 'string',
    enum: ['all', 'verified'],
    desc: 'Client-to-ticker matches to use: all (verified and exact name matches) or verified only (default all).',
  },
};

const TOP = { list: true };
const MEMBER = 'object';

const COMMITTEE_ROUTES = [
  {
    id: 'congress.committee_heatmap',
    kind: 'insight',
    method:
      "For each committee's seats, the share of members whose estimated open positions include a stock in each sector.",
    path: '/v1/congress/committees/heatmap',
    scope: 'committees',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['chamber', 'min_seats', 'limit'],
    fields: {
      committee: 'object',
      sector: 'string',
      seats: 'integer',
      holders: 'integer',
      share_pct: 'number',
      holder_members: 'array',
    },
    summary:
      'Committee by sector: the share of each full committee whose members hold that sector, highest share first. chamber defaults to house; committees under min_seats seats (default 10) are left out.',
  },
  {
    id: 'congress.committee_holdings',
    kind: 'insight',
    method:
      "The committee's current members against their estimated open positions and their disclosed trades in the window, per ticker (up to 50 tickers, most held first).",
    path: '/v1/congress/committees/{id}/holdings',
    scope: 'committees',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['days', 'limit'],
    fields: {
      ticker: 'string',
      seats: 'integer',
      holders: 'integer',
      holder_share_pct: 'number',
      holder_names: 'array',
      buyers: 'integer',
      sellers: 'integer',
    },
    summary:
      "What a committee's members hold and trade: per ticker, seats, members holding it, and members buying or selling it in the last days (default 180). The id is a committee code such as HSAS.",
  },
  {
    id: 'congress.ticker_committee_exposure',
    kind: 'insight',
    method:
      "Members with an estimated open position in the stock, grouped by the full committees they sit on, as a share of each committee's seats.",
    path: '/v1/congress/tickers/{ticker}/committee-exposure',
    scope: 'committees',
    status: 'live',
    delayed: true,
    ...TOP,
    params: [],
    fields: {
      ticker: 'string',
      committee: 'object',
      seats: 'integer',
      holders: 'integer',
      share_pct: 'number',
      holder_names: 'array',
    },
    summary:
      "Which committees' members hold a stock, and what share of each committee holds it: the oversight-overlap lens. Highest share first.",
  },
];

const CONGRESS_ROUTES = [
  {
    id: 'congress.rankings',
    kind: 'insight',
    method:
      'Disclosed trades in the window counted per member (buys, sells, estimated volume from range midpoints) with the average days from trade to disclosure, then ranked.',
    path: '/v1/congress/rankings',
    scope: 'congress',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['days', 'chamber', 'party', 'q', 'sort', 'limit'],
    paramEnums: { sort: ['volume', 'trades', 'buys', 'sells', 'lag'] },
    fields: {
      rank: 'integer',
      member: MEMBER,
      trades: 'integer',
      buys: 'integer',
      sells: 'integer',
      est_volume: 'number',
      avg_disclosure_lag_days: 'number',
      last_trade: 'date',
      top_tickers: 'array',
    },
    summary:
      'Members ranked by trading activity over the last days (default 365): trades, buys, sells, estimated volume and average disclosure lag. sort is volume (default), trades, buys, sells or lag (slowest to disclose first). q matches a name or a state code.',
  },
  {
    id: 'congress.member_portfolio',
    kind: 'insight',
    method:
      'Positions rebuilt from disclosed trades: buys since the last full sale, less partial sales, at range midpoints (never under $1,001), kept while the latest trade is a buy or partial sale. est_low and est_high add up the disclosed range bounds.',
    path: '/v1/congress/members/{id}/portfolio',
    scope: 'congress',
    status: 'live',
    delayed: true,
    params: [],
    fields: {
      member: MEMBER,
      est_total: 'number',
      positions: 'integer',
      stock_positions: 'integer',
      holdings: 'array',
      sectors: 'array',
    },
    summary:
      "A member's estimated current holdings from their disclosures: per ticker an estimated value with the low to high range, its share of the book, and the sector mix (bonds and untickered assets included in the mix).",
  },
  {
    id: 'congress.member_similar',
    kind: 'insight',
    method:
      'Overlap (shared tickers divided by all tickers either member traded) of the tickers each member traded in the last three years; members with at least two shared tickers.',
    path: '/v1/congress/members/{id}/similar',
    scope: 'congress',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['limit'],
    fields: {
      member: MEMBER,
      overlap: 'number',
      shared_count: 'integer',
      shared_tickers: 'array',
    },
    summary:
      'Members whose traded tickers overlap most with this member over the last three years, with the overlap score and up to four shared tickers. Up to 12 results.',
  },
  {
    id: 'congress.most_traded',
    kind: 'insight',
    method:
      'Disclosed trades in the window counted per ticker, with the distinct members trading it.',
    path: '/v1/congress/tickers/most-traded',
    scope: 'congress',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['days', 'chamber', 'party', 'limit'],
    fields: { rank: 'integer', ticker: 'string', trades: 'integer', members: 'integer' },
    summary:
      'Tickers by number of disclosed trades over the last days (default 365), with the distinct members trading each. Up to 100.',
  },
  {
    id: 'congress.most_held',
    kind: 'insight',
    method:
      'Members counted per ticker where they have bought it and their latest trade in it is a buy or partial sale, so they likely still hold it.',
    path: '/v1/congress/tickers/most-held',
    scope: 'congress',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['days', 'chamber', 'party', 'limit'],
    fields: {
      rank: 'integer',
      ticker: 'string',
      company: 'string',
      holders: 'integer',
      buys: 'integer',
      last_buy: 'date',
    },
    summary:
      'Tickers held by the most members, with their buy count and the last buy. Without days, every disclosure counts. Up to 100.',
  },
  {
    id: 'congress.portfolio',
    kind: 'insight',
    method:
      "Every sitting member's estimated open positions (from disclosed ranges) added up per ticker and per sector; funds and ETFs left out.",
    path: '/v1/congress/portfolio',
    scope: 'congress',
    status: 'live',
    delayed: true,
    params: ['party', 'chamber', 'limit'],
    fields: { tickers: 'array', sectors: 'array' },
    summary:
      "Congress's aggregate estimated portfolio: the most widely held tickers (up to 50) with the members holding each and the summed low to high estimate, and the sector mix across every position.",
  },
  {
    id: 'congress.portfolio_compare',
    kind: 'insight',
    method:
      "Each group's estimated open positions counted by sector, each sector's share of the group's positions, and the gap between the two groups in percentage points.",
    path: '/v1/congress/portfolio/compare',
    scope: 'congress',
    status: 'live',
    delayed: true,
    params: ['dim', 'party', 'chamber'],
    paramEnums: { dim: ['party', 'chamber'] },
    fields: { dim: 'string', groups: 'object', sectors: 'array' },
    summary:
      'Sector tilts between Democrats and Republicans (dim=party, the default; chamber narrows it) or House and Senate (dim=chamber; party narrows it). tilt_pts is group a share minus group b share.',
  },
  {
    id: 'congress.activity_monthly',
    kind: 'insight',
    method: 'Disclosed trades counted per calendar month of the trade date, split by chamber.',
    path: '/v1/congress/activity/monthly',
    scope: 'congress',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['days', 'chamber', 'party'],
    fields: { month: 'date', house: 'integer', senate: 'integer', total: 'integer' },
    summary:
      'Monthly trade counts, House and Senate, over the last days (default 365), oldest month first.',
  },
  {
    id: 'congress.states',
    kind: 'insight',
    method:
      "Each member's disclosed trades in the window (count, buys, sells, estimated volume) rolled up to their state.",
    path: '/v1/congress/states',
    scope: 'congress',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['days', 'state', 'limit'],
    fields: {
      state: 'string',
      members: 'integer',
      trades: 'integer',
      buys: 'integer',
      sells: 'integer',
      est_volume: 'number',
      last_trade: 'date',
      top_members: 'array',
    },
    summary:
      'Trading by state over the last days (default 365): members trading, trades, buys, sells and estimated volume, with the five most active members. Highest volume first.',
  },
  {
    id: 'congress.insider_flow',
    kind: 'insight',
    method:
      'Half member breadth (distinct buyers vs sellers), half estimated dollar flow from disclosed range midpoints.',
    path: '/v1/congress/signals/insider-flow',
    scope: 'congress',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['days', 'min_members', 'chamber', 'party', 'direction', 'limit'],
    paramEnums: { direction: ['buying', 'selling'] },
    fields: {
      ticker: 'string',
      buyers: 'integer',
      sellers: 'integer',
      buys: 'integer',
      sells: 'integer',
      est_buy_usd: 'number',
      est_sell_usd: 'number',
      flow_score: 'number',
      avg_disclosure_lag_days: 'number',
      first_trade: 'date',
      last_trade: 'date',
    },
    summary:
      'Per ticker over the last days of trades (default 180): distinct buyers and sellers, estimated buy and sell dollars, flow_score from -100 (all selling) to +100 (all buying) and the average disclosure lag. Tickers traded by fewer than min_members members (default 2) are left out. direction is buying (default, highest score first) or selling.',
  },
  ...COMMITTEE_ROUTES,
];

const CANDIDATE = 'object';

const FEC_ROUTES = [
  {
    id: 'fec.candidates',
    kind: 'data',
    path: '/v1/fec/candidates',
    scope: 'fec',
    status: 'live',
    params: ['cycle', 'party', 'chamber', 'state', 'q', 'limit', 'cursor'],
    fields: {
      bioguide_id: 'string',
      candidate_id: 'string',
      name: 'string',
      party: 'string',
      office: 'string',
      state: 'string',
      cycle: 'integer',
      receipts: 'number',
      disbursements: 'number',
      cash_on_hand: 'number',
      individual_contributions: 'number',
      pac_contributions: 'number',
      debts: 'number',
      coverage_end: 'date',
    },
    summary:
      'Candidates who are sitting members, for a cycle (default the latest), with receipts, disbursements, cash on hand and debts, most raised first. chamber filters the office (house or senate); q matches the name.',
  },
  {
    id: 'fec.candidate_donors',
    kind: 'insight',
    method:
      "Itemized individual contributions to the candidate's committees grouped by the donor's stated employer and occupation, top ten each by amount.",
    path: '/v1/fec/candidates/{id}/donors',
    scope: 'fec',
    status: 'live',
    params: ['cycle'],
    fields: { candidate: CANDIDATE, cycle: 'integer', employers: 'array', occupations: 'array' },
    summary:
      'Top donor employers and occupations for a candidate, by itemized amount, with contribution counts. The id is a bioguide id or an FEC candidate id.',
  },
  {
    id: 'fec.candidate_outside',
    kind: 'insight',
    method:
      'Independent expenditures naming the candidate, summed by whether they support or oppose, and by the committee that spent them.',
    path: '/v1/fec/candidates/{id}/outside-spending',
    scope: 'fec',
    status: 'live',
    params: ['cycle'],
    fields: {
      candidate: CANDIDATE,
      cycle: 'integer',
      support_usd: 'number',
      oppose_usd: 'number',
      net_usd: 'number',
      tilt: 'number',
      communication_cost_usd: 'number',
      supporting: 'array',
      opposing: 'array',
      campaign_spending_by_purpose: 'array',
    },
    summary:
      "Outside money for and against a candidate: support and oppose totals, tilt from -1 (all opposing) to 1 (all supporting), and the committees behind each side. campaign_spending_by_purpose is the candidate's own campaign spending by purpose, for context.",
  },
  {
    id: 'fec.leaderboard',
    kind: 'insight',
    method:
      'Candidates ranked by receipts, cash on hand, burn rate (disbursements divided by receipts, candidates with $10,000 or more raised) or outside tilt ((support - oppose) / (support + oppose), candidates with $10,000 or more of outside money).',
    path: '/v1/fec/leaderboard',
    scope: 'fec',
    status: 'live',
    ...TOP,
    params: ['cycle', 'sort', 'party', 'chamber', 'state', 'limit'],
    paramEnums: { sort: ['receipts', 'cash_on_hand', 'burn_rate', 'outside_tilt'] },
    fields: {
      rank: 'integer',
      candidate: CANDIDATE,
      receipts: 'number',
      disbursements: 'number',
      cash_on_hand: 'number',
      burn_rate: 'number',
      outside_support: 'number',
      outside_oppose: 'number',
      outside_tilt: 'number',
    },
    summary:
      'Candidates ranked by receipts (default), cash_on_hand, burn_rate or outside_tilt, highest first, for a cycle (default the latest).',
  },
];

const LOBBYING_ROUTES = [
  {
    id: 'lobbying.client',
    kind: 'data',
    path: '/v1/lobbying/clients/{id}',
    scope: 'lobbying',
    status: 'live',
    delayed: true,
    params: [],
    fields: {
      client: 'object',
      filings: 'integer',
      total_amount: 'number',
      spend_by_year: 'array',
      registrants: 'array',
      issues: 'array',
    },
    summary:
      "One lobbying client (the LDA client id from a filing's client.id): its reported spend by year and quarter, the registrants it hired and its issue codes by filing count. LDA issues a client id per registrant engagement.",
  },
  {
    id: 'lobbying.registrant',
    kind: 'data',
    path: '/v1/lobbying/registrants/{id}',
    scope: 'lobbying',
    status: 'live',
    delayed: true,
    params: ['year', 'limit'],
    fields: {
      registrant: 'object',
      filings: 'integer',
      total_amount: 'number',
      client_count: 'integer',
      lobbyists: 'integer',
      clients: 'array',
      issues: 'array',
    },
    summary:
      "A lobbying firm's client book (the LDA registrant id): clients by reported spend (top limit), the issue codes it lobbies on and its distinct lobbyists. year narrows it to one filing year.",
  },
  {
    id: 'lobbying.issue_mix',
    kind: 'insight',
    method:
      'Filings counted per issue area (a filing counts each of its issues once) as a share of all filings in the period, against the same period a year earlier.',
    path: '/v1/lobbying/issues/mix',
    scope: 'lobbying',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['year', 'issue_period'],
    fields: {
      issue: 'string',
      filings: 'integer',
      share_pct: 'number',
      prior_filings: 'integer',
      prior_share_pct: 'number',
      change_pts: 'number',
    },
    summary:
      'The twelve most-filed issue areas for a year (default the current year) or one quarter of it, with the share of filings and the change in percentage points against the same period a year earlier.',
  },
  {
    id: 'lobbying.contributions',
    kind: 'data',
    path: '/v1/lobbying/contributions',
    scope: 'lobbying',
    status: 'live',
    delayed: true,
    params: ['q', 'from', 'to', 'min_amount', 'limit', 'cursor'],
    fields: {
      id: 'string',
      type: 'string',
      contributor: 'string',
      payee: 'string',
      honoree: 'string',
      amount: 'number',
      date: 'date',
      filer: 'object',
      report: 'object',
    },
    summary:
      'LD-203 contributions reported by registrants and lobbyists: contributor, payee, honoree, amount and date, newest first. q matches the honoree, contributor or payee.',
  },
  {
    id: 'lobbying.ticker',
    kind: 'insight',
    method:
      "Lobbying filings of the clients matched to the ticker (verified or exact name matches) summed by calendar year with their issue codes, beside the company's federal contract awards summed by fiscal year.",
    path: '/v1/lobbying/tickers/{ticker}',
    scope: 'lobbying',
    status: 'live',
    delayed: true,
    params: ['lobby_years'],
    fields: {
      ticker: 'string',
      company: 'string',
      clients: 'array',
      lobbying_by_year: 'array',
      top_issues: 'array',
      awards_by_fiscal_year: 'array',
      totals: 'object',
    },
    summary:
      "A listed company's lobbying spend by year, its top issues, and its federal award dollars over the same span (lobby_years, default 3, ending with the current year), with award dollars per lobbying dollar.",
  },
  {
    id: 'lobbying.spend_vs_awards',
    kind: 'insight',
    method:
      'Lobbying spend of the clients matched to each ticker (from a curated client-to-ticker list, verified or exact name matches; each row says which) against the federal contract awards to that ticker over the same years.',
    path: '/v1/lobbying/spend-vs-awards',
    scope: 'lobbying',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['lobby_years', 'lobby_match', 'sort', 'limit'],
    paramEnums: { sort: ['ratio', 'award_usd', 'lobbying_usd'] },
    fields: {
      rank: 'integer',
      ticker: 'string',
      company: 'string',
      client: 'string',
      match_method: 'string',
      lobbying_usd: 'number',
      awards: 'integer',
      award_usd: 'number',
      award_per_lobbying_dollar: 'number',
    },
    summary:
      'Per ticker: lobbying dollars, federal awards and award dollars, and award dollars per lobbying dollar, over lobby_years (default 1). sort is ratio (default), award_usd or lobbying_usd.',
  },
];

const CONTRACT_ROUTES = [
  {
    id: 'contracts.agencies',
    kind: 'data',
    path: '/v1/contracts/agencies',
    scope: 'contracts',
    status: 'live',
    params: ['agency', 'year', 'limit', 'cursor'],
    fields: {
      fiscal_year: 'integer',
      agency: 'string',
      agency_group: 'string',
      amount: 'number',
      awards: 'integer',
    },
    summary:
      'Federal contract spending and award counts per awarding agency and fiscal year, newest year and largest first. year is a fiscal year.',
  },
  {
    id: 'contracts.ticker',
    kind: 'insight',
    method:
      "The listed company's federal contract awards summed by fiscal year and agency, its largest awards, and the latest complete fiscal year against the one before.",
    path: '/v1/contracts/tickers/{ticker}',
    scope: 'contracts',
    status: 'live',
    delayed: true,
    params: [],
    fields: {
      ticker: 'string',
      total_usd: 'number',
      awards: 'integer',
      recipients: 'integer',
      first_award: 'date',
      last_award: 'date',
      by_fiscal_year: 'array',
      by_agency: 'array',
      recipient_names: 'array',
      top_awards: 'array',
      year_over_year: 'object',
    },
    summary:
      "A listed contractor's awards by fiscal year and agency, its largest awards, and the year-over-year change for the latest complete fiscal year.",
  },
  {
    id: 'contracts.award_momentum',
    kind: 'insight',
    method:
      'Award dollars per ticker summed for the latest complete fiscal year and the year before; tickers under $1,000,000 in the prior year are left out so small bases do not produce outsized percentages.',
    path: '/v1/contracts/signals/award-momentum',
    scope: 'contracts',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['year', 'sort', 'direction', 'limit'],
    paramEnums: {
      sort: ['change_pct', 'change_usd', 'latest_usd'],
      direction: ['up', 'down'],
    },
    fields: {
      rank: 'integer',
      ticker: 'string',
      fiscal_year: 'integer',
      latest_usd: 'number',
      prior_usd: 'number',
      change_usd: 'number',
      change_pct: 'number',
      awards: 'integer',
      top_agency: 'string',
      top_agency_usd: 'number',
    },
    summary:
      'Per ticker: federal awards in the latest complete fiscal year (or year) against the year before, the change in dollars and %, and the top agency. sort is change_pct (default), change_usd or latest_usd; direction up (default, biggest gains) or down (biggest falls).',
  },
  {
    id: 'contracts.award_reaction',
    kind: 'insight',
    method:
      "For each award date, the stock's move over about 30 trading days from the first close on or after it; averaged per company with the share of positive moves, among companies with two or more award dates.",
    path: '/v1/contracts/award-reaction',
    scope: 'contracts',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['limit'],
    fields: {
      ticker: 'string',
      award_dates: 'integer',
      award_usd: 'number',
      avg_move_30d_pct: 'number',
      hit_rate: 'number',
      top_agency: 'string',
      consistent: 'boolean',
    },
    summary:
      'How each stock moved in the 30 days after its award dates: average move, hit rate (share of positive moves) and top agency. consistent marks three or more award dates, a hit rate of 60% or more and an average move of 3% or more. Up to 50.',
  },
  {
    id: 'contracts.trades_near_awards',
    kind: 'insight',
    method:
      "Each member's disclosed trades in a company matched to that company's federal awards dated within near_days of the trade, either side.",
    path: '/v1/contracts/trades-near-awards',
    scope: 'contracts',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['days', 'near_days', 'limit'],
    fields: {
      member: MEMBER,
      ticker: 'string',
      trades: 'integer',
      first_trade: 'date',
      last_trade: 'date',
      awards: 'integer',
      award_usd: 'number',
      top_agency: 'string',
    },
    summary:
      "Congressional trades in a company that were traded within near_days (default 30) of that company's federal awards, over the last days of trades (default 365), largest award value first. Up to 100. Proximity only: it does not show the trader knew of the award.",
  },
  {
    id: 'contracts.pre_award_traders',
    kind: 'insight',
    method:
      "Trades by members, Form 4 insiders and large holders matched to the nearest award to the same company within 30 days; per actor, the trades dated before the award, the average days before it, and the 30-day return in the trade's direction.",
    path: '/v1/contracts/pre-award-traders',
    scope: 'contracts',
    status: 'live',
    delayed: true,
    ...TOP,
    params: ['award_actor', 'limit'],
    fields: {
      actor: 'object',
      trades: 'integer',
      trades_before_award: 'integer',
      avg_days_before_award: 'number',
      measured_trades: 'integer',
      avg_return_30d_pct: 'number',
      hit_rate: 'number',
      best_ticker: 'string',
      best_return_pct: 'number',
      award_usd: 'number',
      score: 'number',
    },
    summary:
      'Actors (members, insiders, large holders) who traded within 30 days before award dates to the same company, with the average days before the award and the measured 30-day return. Up to 50 per actor type. Timing only: it does not show anyone knew of the award.',
  },
];

export const ROUTES = {
  congress: CONGRESS_ROUTES,
  fec: FEC_ROUTES,
  lobbying: LOBBYING_ROUTES,
  contracts: CONTRACT_ROUTES,
};
export const GROUPS = [];
