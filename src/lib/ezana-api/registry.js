/**
 * Ezana API v1 endpoint registry: the one source for the /v1 router, the
 * /ezana-api docs page and the OpenAPI spec. Pure, client-safe (handlers live
 * in handlers.js and are looked up by `id`).
 *
 * status 'live'    the data exists and the router serves it.
 * status 'roadmap' documented, not built: the router answers 501
 *                  not_available and the docs label it Roadmap.
 */

/** Query parameters, defined once. Endpoints list the names they accept. */
export const PARAMS = {
  ticker: {
    type: 'string',
    repeatable: true,
    max: 10,
    pattern: /^[A-Za-z][A-Za-z0-9.-]{0,9}$/,
    desc: 'Filter to a symbol. Repeat for a universe (up to 20).',
  },
  member: {
    type: 'string',
    pattern: /^[A-Za-z][0-9]{6}$/,
    desc: 'Bioguide id of a member of Congress (for example P000197).',
  },
  party: { type: 'string', enum: ['D', 'R', 'I'], desc: 'Party: D, R or I.' },
  chamber: { type: 'string', enum: ['house', 'senate'], desc: 'house or senate.' },
  from: { type: 'date', desc: 'Inclusive start date (ISO 8601, for example 2026-01-01).' },
  to: { type: 'date', desc: 'Inclusive end date (ISO 8601).' },
  min_amount: { type: 'number', desc: 'Minimum amount in USD.' },
  agency: { type: 'string', max: 120, desc: 'Awarding agency name (case-insensitive match).' },
  status: {
    type: 'string',
    enum: ['active', 'closed', 'stale'],
    desc: 'Market status: active, closed, or stale (the venue stopped listing it before it closed).',
  },
  q: { type: 'string', max: 120, desc: 'Text search over names or questions.' },
  year: { type: 'int', min: 1999, max: 2100, desc: 'Calendar year (default: the current year).' },
  filer: { type: 'string', pattern: /^[0-9]{1,10}$/, desc: 'SEC CIK of the filer.' },
  quarter: {
    type: 'string',
    pattern: /^CY[0-9]{4}Q[1-4]$/,
    desc: 'Reporting quarter, for example CY2026Q2.',
  },
  code: {
    type: 'string',
    enum: ['P', 'S', 'A', 'M', 'F', 'G', 'D', 'C', 'X', 'J'],
    desc: 'Form 4 transaction code (P open-market buy, S sale, A award, M exercise, F tax withholding, G gift).',
  },
  platform: {
    type: 'string',
    enum: ['polymarket', 'kalshi'],
    desc: 'Venue: polymarket or kalshi.',
  },
  category: {
    type: 'string',
    enum: [
      'politics',
      'elections',
      'sports',
      'crypto',
      'economy',
      'geopolitics',
      'tech',
      'culture',
    ],
    desc: "Ezana's category across both venues (Kalshi categories and Polymarket tags mapped to one set).",
  },
  sort: {
    type: 'string',
    enum: ['volume', 'volume_24h', 'trending', 'ending', 'change_24h', 'change_7d', 'probability'],
    desc: 'Sort order. Each endpoint lists the values it accepts; default is volume.',
  },
  window: { type: 'string', enum: ['24h', '7d', '30d'], desc: 'Change window (default 24h).' },
  direction: {
    type: 'string',
    enum: ['up', 'down', 'both'],
    desc: 'Odds moved up, down, or either (default both).',
  },
  min_volume: {
    type: 'number',
    desc: "Minimum average daily volume, in the venue's unit (volume_unit).",
  },
  ends_after: { type: 'date', desc: 'Only markets that close on or after this date.' },
  ends_before: { type: 'date', desc: 'Only markets that close on or before this date.' },
  interval: {
    type: 'string',
    enum: ['raw', '4h', '1d'],
    desc: 'History resolution: every snapshot (about 2h), or the last point per 4 hours or per day (default 4h).',
  },
  ids: {
    type: 'string',
    max: 600,
    pattern: /^[A-Za-z0-9_:.-]{1,120}(,[A-Za-z0-9_:.-]{1,120}){1,9}$/,
    desc: 'Comma-separated market ids, 2 to 10.',
  },
  forecast_status: {
    type: 'string',
    enum: ['open', 'closed'],
    desc: 'Forecast status: open or closed (default open).',
  },
  limit: { type: 'int', min: 1, max: 200, desc: 'Page size, 1 to 200 (default 50).' },
  cursor: { type: 'string', max: 400, desc: "Opaque cursor from the previous page's page.next." },
};

/** Response fields per live endpoint (for the docs and OpenAPI). */
const TRADE_FIELDS = {
  id: 'string',
  member: 'object',
  ticker: 'string',
  asset: 'string',
  transaction: 'string',
  amount_min: 'number',
  amount_max: 'number',
  owner: 'string',
  traded_at: 'date',
  disclosed_at: 'date',
  disclosure_lag_days: 'integer',
  source: 'string',
};
const AWARD_FIELDS = {
  id: 'string',
  piid: 'string',
  recipient: 'object',
  parent: 'string',
  ticker: 'string',
  is_public: 'boolean',
  amount: 'number',
  agency: 'string',
  sub_agency: 'string',
  action_date: 'date',
  award_type: 'string',
  fiscal_year: 'integer',
};
const MARKET_FIELDS = {
  id: 'string',
  question: 'string',
  outcome: 'string',
  event: 'object',
  platform: 'string',
  platform_name: 'string',
  category: 'string',
  venue_category: 'string',
  probability: 'number',
  best_bid: 'number',
  best_ask: 'number',
  spread: 'number',
  change_24h: 'number',
  change_7d: 'number',
  change_30d: 'number',
  volume: 'number',
  volume_24h: 'number',
  volume_7d: 'number',
  volume_30d: 'number',
  avg_daily_volume: 'number',
  volume_unit: 'string',
  liquidity: 'number',
  recurrence: 'string',
  ends_at: 'date-time',
  status: 'string',
  updated_at: 'date-time',
  url: 'string',
};
const EVENT_FIELDS = {
  key: 'string',
  title: 'string',
  platform: 'string',
  category: 'string',
  recurrence: 'string',
  markets: 'integer',
  active_markets: 'integer',
  leading: 'object',
  volume: 'number',
  volume_24h: 'number',
  avg_daily_volume: 'number',
  volume_unit: 'string',
  ends_at: 'date-time',
  status: 'string',
  updated_at: 'date-time',
};
const PM_LIST = ['platform', 'category'];
const FILING_FIELDS = {
  uuid: 'string',
  filing_year: 'integer',
  period: 'string',
  filing_type: 'string',
  registrant: 'object',
  client: 'object',
  amount: 'number',
  lobbyist_count: 'integer',
  issue_areas: 'array',
  posted_at: 'date-time',
  document_url: 'string',
};

const LIST = ['limit', 'cursor'];

export const GROUPS = [
  {
    key: 'congress',
    title: 'Congressional trading',
    base: '/v1/congress',
    icon: 'bi-bank',
    framing:
      'Insider-flow signal: what informed, access-rich actors are trading, structured for signal extraction, not just raw disclosures.',
    source: 'House Clerk and Senate Office of Public Records',
    routes: [
      {
        id: 'congress.trades',
        path: '/v1/congress/trades',
        scope: 'congress',
        status: 'live',
        delayed: true,
        params: ['ticker', 'member', 'party', 'chamber', 'from', 'to', 'min_amount', ...LIST],
        fields: TRADE_FIELDS,
        summary:
          'Disclosed House and Senate trades, filterable by member, ticker, party, chamber and trade date, newest trade first.',
      },
      {
        id: 'congress.trade',
        path: '/v1/congress/trades/{id}',
        scope: 'congress',
        status: 'live',
        delayed: true,
        params: [],
        fields: TRADE_FIELDS,
        summary: 'A single disclosure with its filing date and disclosure lag.',
      },
      {
        id: 'congress.members',
        path: '/v1/congress/members',
        scope: 'congress',
        status: 'live',
        params: ['party', 'chamber', 'q', ...LIST],
        fields: {
          bioguide_id: 'string',
          name: 'string',
          first_name: 'string',
          last_name: 'string',
          chamber: 'string',
          party: 'string',
          state: 'string',
          district: 'integer',
          in_office: 'boolean',
        },
        summary: 'Members of Congress with party, chamber, state and district.',
      },
      {
        id: 'congress.member_trades',
        path: '/v1/congress/members/{id}/trades',
        scope: 'congress',
        status: 'live',
        delayed: true,
        params: ['ticker', 'from', 'to', 'min_amount', ...LIST],
        fields: TRADE_FIELDS,
        summary: 'Full trade history for one member (bioguide id), newest first.',
      },
      {
        id: 'congress.committees',
        path: '/v1/congress/committees',
        scope: 'committees',
        status: 'live',
        params: ['chamber', ...LIST],
        fields: {
          id: 'string',
          name: 'string',
          chamber: 'string',
          parent_id: 'string',
          is_subcommittee: 'boolean',
          seats: 'integer',
          url: 'string',
        },
        summary: 'Committees and subcommittees with their seat counts.',
      },
      {
        id: 'congress.committee_activity',
        path: '/v1/congress/committees/{id}/activity',
        scope: 'committees',
        status: 'live',
        delayed: true,
        params: ['ticker', 'from', 'to', ...LIST],
        fields: TRADE_FIELDS,
        summary:
          "Trades in the last 12 months by the committee's members, newest first. The committee itself is in meta.committee.",
      },
      {
        path: '/v1/congress/signals/insider-flow',
        scope: 'congress',
        status: 'roadmap',
        summary:
          'Pre-computed insider-flow score per ticker, ranking names by informed-actor accumulation.',
      },
    ],
  },
  {
    key: 'lobbying',
    title: 'Lobbying & influence',
    base: '/v1/lobbying',
    icon: 'bi-diagram-3',
    framing:
      'Influence-flow signal: map corporate influence spend to sector and price exposure before the thesis is consensus.',
    source: 'Senate LDA',
    routes: [
      {
        id: 'lobbying.filings',
        path: '/v1/lobbying/filings',
        scope: 'lobbying',
        status: 'live',
        delayed: true,
        params: ['q', 'from', 'to', 'min_amount', ...LIST],
        fields: FILING_FIELDS,
        summary:
          'Lobbying Disclosure Act filings by registrant and client with reported spend, newest posted first.',
      },
      {
        id: 'lobbying.filing',
        path: '/v1/lobbying/filings/{uuid}',
        scope: 'lobbying',
        status: 'live',
        delayed: true,
        params: [],
        fields: FILING_FIELDS,
        summary: 'One filing with its issue areas, lobbyist count and reported spend.',
      },
      {
        id: 'lobbying.top_spenders',
        path: '/v1/lobbying/top-spenders',
        scope: 'lobbying',
        status: 'live',
        delayed: true,
        params: ['year', 'limit'],
        fields: { client: 'string', client_id: 'integer', filings: 'integer', amount: 'number' },
        summary: 'Clients ranked by reported lobbying spend in a calendar year.',
      },
      {
        path: '/v1/lobbying/clients/{id}',
        scope: 'lobbying',
        status: 'roadmap',
        summary: 'Spend history and issue exposure for a single client.',
      },
      {
        path: '/v1/lobbying/issues/mix',
        scope: 'lobbying',
        status: 'roadmap',
        summary: 'Breakdown of spend by issue area.',
      },
      {
        path: '/v1/lobbying/registrants/{id}',
        scope: 'lobbying',
        status: 'roadmap',
        summary: 'Activity for a lobbying firm across its client book.',
      },
      {
        path: '/v1/lobbying/signals/policy-exposure',
        scope: 'lobbying',
        status: 'roadmap',
        summary: 'Per-ticker policy-exposure score blending spend, issues and contract adjacency.',
      },
    ],
  },
  {
    key: 'fec',
    title: 'Campaign finance (FEC)',
    base: '/v1/fec',
    icon: 'bi-cash-coin',
    framing:
      'Political-capital signal: who funds whom, tied back to the sectors and issuers with the most at stake.',
    source: 'FEC',
    routes: [
      {
        id: 'fec.candidate_funding',
        path: '/v1/fec/candidates/{id}/funding',
        scope: 'fec',
        status: 'live',
        params: [],
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
          coverage_start: 'date',
          coverage_end: 'date',
        },
        summary:
          'Funding totals for a candidate by cycle. The id is a bioguide id or an FEC candidate id.',
      },
      {
        path: '/v1/fec/contributions',
        scope: 'fec',
        status: 'roadmap',
        summary: 'Itemized contributions by contributor, committee, cycle and employer.',
      },
      {
        path: '/v1/fec/committees/{id}',
        scope: 'fec',
        status: 'roadmap',
        summary: "A committee's receipts, disbursements and affiliations over a cycle.",
      },
      {
        path: '/v1/fec/signals/sector-giving',
        scope: 'fec',
        status: 'roadmap',
        summary: 'Net political giving by sector as a directional signal.',
      },
    ],
  },
  {
    key: 'contracts',
    title: 'Government contracts (USAspending)',
    base: '/v1/contracts',
    icon: 'bi-building',
    framing:
      'Revenue-visibility signal: federal award flow mapped to publicly traded recipients, ahead of guidance.',
    source: 'USAspending',
    routes: [
      {
        id: 'contracts.awards',
        path: '/v1/contracts/awards',
        scope: 'contracts',
        status: 'live',
        params: ['ticker', 'agency', 'q', 'from', 'to', 'min_amount', ...LIST],
        fields: AWARD_FIELDS,
        summary:
          "Federal contract awards by recipient, agency and action date, with the recipient's listed parent and ticker where known.",
      },
      {
        id: 'contracts.recipient',
        path: '/v1/contracts/recipients/{id}',
        scope: 'contracts',
        status: 'live',
        params: ['from', 'to', ...LIST],
        fields: AWARD_FIELDS,
        summary: 'Award history for one recipient (USAspending recipient id), newest first.',
      },
      {
        path: '/v1/contracts/agencies/{id}/spending',
        scope: 'contracts',
        status: 'roadmap',
        summary: 'Spending by agency and program.',
      },
      {
        path: '/v1/contracts/signals/award-momentum',
        scope: 'contracts',
        status: 'roadmap',
        summary: 'Per-ticker award-momentum score.',
      },
    ],
  },
  {
    key: 'predictions',
    title: 'Prediction markets',
    base: '/v1/predictions',
    icon: 'bi-speedometer2',
    framing:
      'Consensus and odds signal: real-money probabilities for the events your positions are exposed to.',
    source: 'Polymarket, Kalshi and Manifold',
    guide: [
      {
        h: 'Venues',
        p: 'Real-money markets from Polymarket (USDC) and Kalshi (CFTC-regulated, USD contracts), and play-money crowd forecasts from Manifold. Each response says which venues it drew on in meta.source.',
      },
      {
        h: 'Probability',
        p: "probability is the venue's current price for the outcome, from 0 to 1 (0.94 means the market prices a 94% chance). best_bid and best_ask are the top of the book; spread is their difference. A wide spread means a thin market: treat the price with caution.",
      },
      {
        h: 'Events and outcomes',
        p: 'Many questions have several outcomes ("Fed decision in October": no change, 25 bps cut, 25 bps hike). Each outcome is its own market with its own price; they share an event. Use /events to see the event and every outcome together.',
      },
      {
        h: 'Volume units',
        p: 'Polymarket reports volume in US dollars; Kalshi in contracts (each pays $1 at resolution, so contracts are not dollars traded). volume_unit says which. Compare volumes within a venue, not across.',
      },
      {
        h: 'Changes and history',
        p: 'change_24h, change_7d and change_30d are moves in probability points (0.05 = five points). History is snapshotted about every two hours and kept for 35 days; a change is null until the market has enough history to cover the window.',
      },
      {
        h: 'Freshness',
        p: 'Markets refresh about every 15 minutes. meta.updated_at is the newest refresh time in the response. status is active, closed (past its end date or resolved) or stale (the venue stopped listing it before it closed).',
      },
      {
        h: 'Consensus',
        p: 'Ezana does not decide which markets ask the same question. Pass the ids you consider equivalent to /consensus and it returns a volume-weighted and a simple mean, with the spread between them. Venues with different volume units are weighted equally.',
      },
      {
        h: 'Not advice',
        p: 'Prices reflect what traders are paying, not a forecast by Ezana and not investment advice.',
      },
    ],
    routes: [
      {
        id: 'predictions.markets',
        path: '/v1/predictions/markets',
        scope: 'predictions',
        status: 'live',
        params: [
          'q',
          ...PM_LIST,
          'status',
          'ends_after',
          'ends_before',
          'min_volume',
          'sort',
          ...LIST,
        ],
        sortValues: [
          'volume',
          'volume_24h',
          'trending',
          'ending',
          'change_24h',
          'change_7d',
          'probability',
        ],
        fields: MARKET_FIELDS,
        summary:
          'Markets on Polymarket and Kalshi with odds, order book, changes and volume windows. Default status=active, sort=volume; q is full-text search; min_volume filters average daily volume.',
      },
      {
        id: 'predictions.market',
        path: '/v1/predictions/markets/{id}',
        scope: 'predictions',
        status: 'live',
        params: [],
        fields: MARKET_FIELDS,
        summary:
          'One market. meta.event lists the other active outcomes of its event, by probability (up to 30).',
      },
      {
        id: 'predictions.market_history',
        path: '/v1/predictions/markets/{id}/history',
        scope: 'predictions',
        status: 'live',
        params: ['from', 'to', 'interval', ...LIST],
        fields: {
          at: 'date-time',
          probability: 'number',
          best_bid: 'number',
          best_ask: 'number',
          volume: 'number',
          volume_24h: 'number',
          liquidity: 'number',
        },
        summary:
          'Point-in-time odds for a market, oldest first: every snapshot (about every 2 hours) or the last one per 4 hours or per day. Kept for 35 days.',
      },
      {
        id: 'predictions.events',
        path: '/v1/predictions/events',
        scope: 'predictions',
        status: 'live',
        params: ['q', ...PM_LIST, 'status', 'sort', ...LIST],
        sortValues: ['volume', 'volume_24h', 'ending'],
        fields: EVENT_FIELDS,
        summary:
          'Events (one question with one or more outcome markets) with their leading outcome and combined volume. Default status=active, sort=volume.',
      },
      {
        id: 'predictions.event',
        path: '/v1/predictions/events/{key}',
        scope: 'predictions',
        status: 'live',
        params: [],
        fields: { ...EVENT_FIELDS, outcomes: 'array' },
        summary:
          'One event with every outcome market in it (active first, then by probability). Keys look like kalshi:CONTROLH-2026; URL-encode the colon.',
      },
      {
        id: 'predictions.movers',
        path: '/v1/predictions/movers',
        scope: 'predictions',
        status: 'live',
        list: true,
        params: ['window', 'direction', ...PM_LIST, 'min_volume', 'limit'],
        fields: { ...MARKET_FIELDS, move: 'object' },
        summary:
          'Active markets with the largest odds moves over 24h, 7d or 30d. Markets under 1,000 a day of volume are left out unless you set min_volume. Top results only, no cursor.',
      },
      {
        id: 'predictions.trending',
        path: '/v1/predictions/trending',
        scope: 'predictions',
        status: 'live',
        list: true,
        params: [...PM_LIST, 'limit'],
        fields: MARKET_FIELDS,
        summary:
          "The ranking behind Ezana's trending rail: one market per event, scored on recent activity. Top results only, no cursor.",
      },
      {
        id: 'predictions.consensus',
        path: '/v1/predictions/consensus',
        scope: 'predictions',
        status: 'live',
        params: ['ids'],
        fields: { markets: 'array', consensus: 'object', weights: 'array' },
        summary:
          'Consensus across markets YOU choose as asking the same question (2 to 10 ids): volume-weighted and simple means, range and dispersion. Ezana never picks the markets for you.',
      },
      {
        id: 'predictions.forecasts',
        path: '/v1/predictions/forecasts',
        scope: 'predictions',
        status: 'live',
        params: ['q', 'forecast_status', ...LIST],
        fields: {
          id: 'string',
          platform: 'string',
          question: 'string',
          probability: 'number',
          forecasters: 'integer',
          volume: 'number',
          volume_unit: 'string',
          closes_at: 'date-time',
          status: 'string',
          url: 'string',
        },
        summary:
          'Manifold crowd forecasts (play money), most forecasters first. Crowd forecasts, not real-money markets.',
      },
      {
        id: 'predictions.categories',
        path: '/v1/predictions/categories',
        scope: 'predictions',
        status: 'live',
        list: true,
        params: [],
        fields: {
          slug: 'string',
          name: 'string',
          active_markets: 'integer',
          active_events: 'integer',
          platforms: 'object',
        },
        summary:
          "Ezana's eight cross-venue categories with active market and event counts per venue.",
      },
      {
        path: '/v1/predictions/markets/{id}/related-securities',
        scope: 'predictions',
        status: 'roadmap',
        summary: 'Tickers and sectors a market moves.',
      },
      {
        path: '/v1/predictions/alerts',
        scope: 'predictions',
        status: 'roadmap',
        summary: 'A webhook when a watched market moves more than a set number of points.',
      },
    ],
  },
  {
    key: 'institutional',
    title: 'Institutional & insider (SEC)',
    base: '/v1/institutional',
    icon: 'bi-buildings',
    framing:
      'Smart-money signal: what large funds hold and add, who takes activist stakes, and what insiders buy and sell.',
    source: 'SEC EDGAR',
    routes: [
      {
        id: 'institutional.holdings',
        path: '/v1/institutional/holdings',
        scope: 'institutional',
        status: 'live',
        delayed: true,
        params: ['ticker', 'filer', ...LIST],
        fields: {
          filer: 'object',
          period: 'date',
          filed_at: 'date',
          issuer: 'string',
          cusip: 'string',
          ticker: 'string',
          value: 'number',
          shares: 'number',
          share_type: 'string',
          put_call: 'string',
        },
        summary:
          'Form 13F holdings by filer, most recently loaded first. Tickers are mapped from CUSIP; unmapped securities carry the issuer name.',
      },
      {
        id: 'institutional.activist_stakes',
        path: '/v1/institutional/activist-stakes',
        scope: 'institutional',
        status: 'live',
        delayed: true,
        params: ['ticker', 'from', 'to', ...LIST],
        fields: {
          accession_no: 'string',
          filer: 'object',
          form: 'string',
          filed_at: 'date',
          event_date: 'date',
          company: 'string',
          ticker: 'string',
          percent_of_class: 'number',
          shares: 'number',
          is_amendment: 'boolean',
        },
        summary: 'Schedule 13D and 13G stakes, newest filed first.',
      },
      {
        id: 'institutional.whale_moves',
        path: '/v1/institutional/whale-moves',
        scope: 'institutional',
        status: 'live',
        delayed: true,
        params: ['ticker', 'quarter', ...LIST],
        fields: {
          id: 'integer',
          filer: 'object',
          ticker: 'string',
          issuer: 'string',
          quarter: 'string',
          change: 'string',
          value: 'number',
          conviction_pct: 'number',
          percent_of_class: 'number',
          whale_score: 'number',
          tier: 'string',
          form: 'string',
          filed_at: 'date',
        },
        summary:
          "Fund moves scored by conviction (position size against the filer's own book, newness and concentration), newest first.",
      },
      {
        id: 'insider.transactions',
        path: '/v1/insider/transactions',
        scope: 'insider',
        status: 'live',
        delayed: true,
        params: ['ticker', 'code', 'from', 'to', 'min_amount', ...LIST],
        fields: {
          id: 'string',
          filed_at: 'date',
          issuer: 'object',
          insider: 'object',
          security: 'string',
          transaction_date: 'date',
          code: 'string',
          acquired_disposed: 'string',
          shares: 'number',
          price: 'number',
          value: 'number',
          shares_owned_after: 'number',
          ownership: 'string',
        },
        summary: 'Form 4 transactions by officers, directors and 10% owners, newest filed first.',
      },
    ],
  },
  {
    key: 'news',
    title: 'News engineering',
    base: '/v1/news',
    icon: 'bi-newspaper',
    framing:
      'News structured, entity-tagged and linked to tickers, events and odds so headlines become machine-usable features.',
    routes: [
      {
        path: '/v1/news/search',
        status: 'roadmap',
        summary: 'Semantic search over structured, deduplicated articles.',
      },
      {
        path: '/v1/news/{id}/entities',
        status: 'roadmap',
        summary: 'Entities resolved from one article to tickers, people and issues.',
      },
      {
        path: '/v1/news/{id}/related-markets',
        status: 'roadmap',
        summary: 'Prediction markets and securities an article is linked to.',
      },
      {
        path: '/v1/news/signals/odds-moves',
        status: 'roadmap',
        summary: 'News items time-aligned to the odds moves they preceded.',
      },
      {
        path: '/v1/news/sentiment/by-entity',
        status: 'roadmap',
        summary: 'Rolling entity-level sentiment from structured news flow.',
      },
    ],
  },
  {
    key: 'markets',
    title: 'Market data & signals',
    base: '/v1/markets',
    icon: 'bi-graph-up',
    framing:
      'The price layer and composite features. Prices stay on the roadmap until a licence allows redistribution.',
    routes: [
      {
        path: '/v1/markets/quotes',
        status: 'roadmap',
        summary: 'Reference and end-of-day market data for a symbol universe.',
      },
      {
        path: '/v1/markets/signals',
        status: 'roadmap',
        summary: 'Composite Ezana signals blending the datasets above into one score per name.',
      },
      {
        path: '/v1/signals/correlations',
        status: 'roadmap',
        summary: 'Relationships between datasets and price.',
      },
      {
        path: '/v1/signals/backtests/{id}',
        status: 'roadmap',
        summary: 'Point-in-time backtest results for a signal spec.',
      },
    ],
  },
  {
    key: 'cross-signal',
    title: 'Cross-dimensional signals',
    base: '/v1/cross',
    icon: 'bi-signpost-split',
    framing:
      'Joins across influence, capital and consensus that no single-vendor feed can reconstruct.',
    routes: [
      {
        path: '/v1/cross/influence-to-capital',
        status: 'roadmap',
        summary:
          'Lobbying and campaign-finance spend against later institutional accumulation per issuer.',
      },
      {
        path: '/v1/cross/contract-to-insider',
        status: 'roadmap',
        summary: 'Federal contract momentum joined with insider buying on the awarded issuer.',
      },
      {
        path: '/v1/cross/policy-to-price',
        status: 'roadmap',
        summary: 'Bill progression and agency rulings mapped onto the sector baskets they move.',
      },
      {
        path: '/v1/cross/consensus-vs-fundamentals',
        status: 'roadmap',
        summary: 'Prediction-market odds against the fundamentals path for the same event.',
      },
      {
        path: '/v1/cross/demand-to-guidance',
        status: 'roadmap',
        summary: 'Consumer demand signals against forward guidance and revisions.',
      },
      {
        path: '/v1/cross/macro-regime-overlay',
        status: 'roadmap',
        summary: 'Every signal tagged with the prevailing macro and geopolitical regime.',
      },
      {
        path: '/v1/cross/composite/{ticker}',
        status: 'roadmap',
        summary: 'A per-ticker rollup of the cross-dimensional signals.',
      },
    ],
  },
  {
    key: 'relationships',
    title: 'Trend relationships & lead-lag',
    base: '/v1/relationships',
    icon: 'bi-arrow-left-right',
    framing: 'Which trend leads which, by how long, and when the usual link breaks.',
    routes: [
      {
        path: '/v1/relationships/lead-lag',
        status: 'roadmap',
        summary: 'Estimated lead-lag between two dimension series for a ticker or sector.',
      },
      {
        path: '/v1/relationships/divergence',
        status: 'roadmap',
        summary: 'Where two normally correlated dimensions have decoupled.',
      },
      {
        path: '/v1/relationships/confirmation',
        status: 'roadmap',
        summary: 'How many independent dimensions currently agree on a name.',
      },
      {
        path: '/v1/relationships/network/{entity}',
        status: 'roadmap',
        summary: 'The influence graph around an entity across dimensions.',
      },
      {
        path: '/v1/relationships/regime-shift',
        status: 'roadmap',
        summary: 'When a cross-dimensional relationship structurally changes.',
      },
      {
        path: '/v1/relationships/backtest',
        status: 'roadmap',
        summary: 'Point-in-time backtest of a relationship with disclosure lag preserved.',
      },
    ],
  },
];

/** Every endpoint, flattened, with method and group. */
export const ENDPOINTS = GROUPS.flatMap((g) =>
  g.routes.map((r) => ({ method: 'GET', group: g.key, source: g.source || null, ...r })),
);

export const LIVE_ENDPOINTS = ENDPOINTS.filter((e) => e.status === 'live');

function templateRegex(path) {
  const src = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[a-z_]+\\\}/g, '([^/]+)');
  return new RegExp(`^${src}$`);
}
const COMPILED = ENDPOINTS.map((e) => ({
  e,
  re: templateRegex(e.path),
  names: [...e.path.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]),
  /* Literal segments outrank placeholders: /trades/{id} must not swallow a
     literal route at the same depth. */
  literal: e.path.split('/').filter((s) => s && !s.startsWith('{')).length,
}));

/** Match a request path (/v1/...) to an endpoint: { endpoint, params } or null. */
export function matchEndpoint(pathname) {
  const p = pathname.replace(/\/+$/, '') || '/';
  let best = null;
  for (const c of COMPILED) {
    const m = c.re.exec(p);
    if (!m) continue;
    if (!best || c.literal > best.literal) {
      best = {
        literal: c.literal,
        endpoint: c.e,
        params: Object.fromEntries(c.names.map((n, i) => [n, decodeURIComponent(m[i + 1])])),
      };
    }
  }
  return best ? { endpoint: best.endpoint, params: best.params } : null;
}
