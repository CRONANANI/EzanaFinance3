/**
 * Ezana API v1 endpoint registry: the one source for the /v1 router, the
 * /ezana-api docs page and the OpenAPI spec. Pure, client-safe (handlers live
 * in handlers.js and handlers/<dimension>.js and are looked up by `id`).
 *
 * Every route is live: the API documents only what it serves. Routes that
 * cannot be built honestly from data Ezana holds live in
 * docs/ezana-api-backlog.md, not here.
 *
 * Groups carry `dimension` (one of DIMENSIONS); routes carry `kind`:
 *   'data'     the records as filed or published, shaped and paginated
 *   'insight'  something Ezana computes that the raw records don't contain
 *              (a score, a join across datasets, a ranking, a change, a
 *              cluster); insight routes also carry `method`, one plain
 *              sentence on how it is computed (shown in the docs and OpenAPI)
 *
 * The base groups below hold the original endpoints; each dimension's
 * catalog module (catalog/<dimension>.js) adds params, routes for existing
 * groups, and new groups.
 */
import * as CAPITOL from './catalog/capitol';
import * as TITANS from './catalog/titans';
import * as EYES from './catalog/eyes';
import * as HIVE from './catalog/hive';
import * as LIGHTHOUSE from './catalog/lighthouse';
import * as CROSS from './catalog/cross';

/** Dimensions in taxonomy order (src/lib/datasets/taxonomy.js). */
export const DIMENSIONS = [
  { id: 'capitol', label: 'Capitol Watch', color: 'var(--emerald)' },
  { id: 'titans', label: 'Titans Shadow', color: 'var(--info)' },
  { id: 'eyes', label: 'Eyes Above', color: 'var(--cyan)' },
  { id: 'hive', label: 'The Hive', color: 'var(--pink)' },
  { id: 'lighthouse', label: 'Global Empire Lighthouse', color: 'var(--indigo)' },
  { id: 'cross', label: 'Cross-dimensional', color: 'var(--text-muted)' },
];
const CATALOGS = [CAPITOL, TITANS, EYES, HIVE, LIGHTHOUSE, CROSS];

/** Query parameters, defined once. Endpoints list the names they accept. */
const BASE_PARAMS = {
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
    pattern: /^[a-z0-9_]{1,30}$/,
    desc: 'Sort order. Each endpoint lists the values it accepts and its default.',
  },
  window: { type: 'string', enum: ['24h', '7d', '30d'], desc: 'Change window (default 24h).' },
  direction: {
    type: 'string',
    pattern: /^[a-z_]{1,20}$/,
    desc: 'Direction filter. Each endpoint lists the values it accepts and its default.',
  },
  dim: {
    type: 'string',
    pattern: /^[a-z_]{1,20}$/,
    desc: 'The dimension to split by. Each endpoint lists the values it accepts.',
  },
  days: {
    type: 'int',
    min: 7,
    max: 1825,
    desc: 'Look-back window in days, 7 to 1825. Each endpoint states its default.',
  },
  a: {
    type: 'string',
    pattern: /^[A-Za-z0-9.-]{1,20}$/,
    desc: 'First item to compare (a ticker or an ISO3 country code, per endpoint).',
  },
  b: {
    type: 'string',
    pattern: /^[A-Za-z0-9.-]{1,20}$/,
    desc: 'Second item to compare (a ticker or an ISO3 country code, per endpoint).',
  },
  country: { type: 'string', max: 60, desc: 'Country name or ISO code, per endpoint.' },
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

const BASE_GROUPS = [
  {
    key: 'congress',
    dimension: 'capitol',
    title: 'Congressional trading',
    base: '/v1/congress',
    icon: 'bi-bank',
    framing:
      'Insider-flow signal: what informed, access-rich actors are trading, structured for signal extraction, not just raw disclosures.',
    source: 'House Clerk and Senate Office of Public Records',
    routes: [
      {
        id: 'congress.trades',
        kind: 'data',
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
        kind: 'data',
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
        kind: 'data',
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
        kind: 'data',
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
        kind: 'data',
        path: '/v1/congress/committees',
        scope: 'committees',
        status: 'live',
        params: ['chamber', ...LIST],
        fields: {
          id: 'string',
          kind: 'data',
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
        kind: 'insight',
        method:
          "A join: the committee's current members (from the committee rosters) against their disclosed trades in the last 12 months.",
        path: '/v1/congress/committees/{id}/activity',
        scope: 'committees',
        status: 'live',
        delayed: true,
        params: ['ticker', 'from', 'to', ...LIST],
        fields: TRADE_FIELDS,
        summary:
          "Trades in the last 12 months by the committee's members, newest first. The committee itself is in meta.committee.",
      },
    ],
  },
  {
    key: 'lobbying',
    dimension: 'capitol',
    title: 'Lobbying & influence',
    base: '/v1/lobbying',
    icon: 'bi-diagram-3',
    framing:
      'Influence-flow signal: map corporate influence spend to sector and price exposure before the thesis is consensus.',
    source: 'Senate LDA',
    routes: [
      {
        id: 'lobbying.filings',
        kind: 'data',
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
        kind: 'data',
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
        kind: 'insight',
        method: 'Reported LD-1/LD-2 amounts summed per client for the calendar year, then ranked.',
        path: '/v1/lobbying/top-spenders',
        scope: 'lobbying',
        status: 'live',
        delayed: true,
        params: ['year', 'limit'],
        fields: { client: 'string', client_id: 'integer', filings: 'integer', amount: 'number' },
        summary: 'Clients ranked by reported lobbying spend in a calendar year.',
      },
    ],
  },
  {
    key: 'fec',
    dimension: 'capitol',
    title: 'Campaign finance (FEC)',
    base: '/v1/fec',
    icon: 'bi-cash-coin',
    framing:
      'Political-capital signal: who funds whom, tied back to the sectors and issuers with the most at stake.',
    source: 'FEC',
    routes: [
      {
        id: 'fec.candidate_funding',
        kind: 'data',
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
    ],
  },
  {
    key: 'contracts',
    dimension: 'capitol',
    title: 'Government contracts (USAspending)',
    base: '/v1/contracts',
    icon: 'bi-building',
    framing:
      'Revenue-visibility signal: federal award flow mapped to publicly traded recipients, ahead of guidance.',
    source: 'USAspending',
    routes: [
      {
        id: 'contracts.awards',
        kind: 'data',
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
        kind: 'data',
        path: '/v1/contracts/recipients/{id}',
        scope: 'contracts',
        status: 'live',
        params: ['from', 'to', ...LIST],
        fields: AWARD_FIELDS,
        summary: 'Award history for one recipient (USAspending recipient id), newest first.',
      },
    ],
  },
  {
    key: 'predictions',
    dimension: 'hive',
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
        kind: 'data',
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
        kind: 'data',
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
        kind: 'data',
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
        kind: 'data',
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
        kind: 'data',
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
        kind: 'insight',
        method:
          'Active markets ranked by the size of the probability change over the window, among markets above a daily-volume floor.',
        path: '/v1/predictions/movers',
        scope: 'predictions',
        status: 'live',
        list: true,
        params: ['window', 'direction', ...PM_LIST, 'min_volume', 'limit'],
        paramEnums: { direction: ['up', 'down', 'both'] },
        fields: { ...MARKET_FIELDS, move: 'object' },
        summary:
          'Active markets with the largest odds moves over 24h, 7d or 30d. Markets under 1,000 a day of volume are left out unless you set min_volume. Top results only, no cursor.',
      },
      {
        id: 'predictions.trending',
        kind: 'insight',
        method:
          "The trending rail's score: per-venue percentiles of recent volume, odds movement and closeness to resolution, one market per event.",
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
        kind: 'insight',
        method:
          'A volume-weighted and a simple mean of the probabilities you pass; venues with different volume units get equal weight.',
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
        kind: 'data',
        path: '/v1/predictions/forecasts',
        scope: 'predictions',
        status: 'live',
        params: ['q', 'forecast_status', ...LIST],
        fields: {
          id: 'string',
          kind: 'data',
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
        kind: 'data',
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
    ],
  },
  {
    key: 'institutional',
    dimension: 'titans',
    title: 'Institutional & insider (SEC)',
    base: '/v1/institutional',
    icon: 'bi-buildings',
    framing:
      'Smart-money signal: what large funds hold and add, who takes activist stakes, and what insiders buy and sell.',
    source: 'SEC EDGAR',
    routes: [
      {
        id: 'institutional.holdings',
        kind: 'data',
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
        kind: 'data',
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
        kind: 'insight',
        method:
          "Each 13F change scored on position size against the filer's own book, whether it is new, and how concentrated the book is.",
        path: '/v1/institutional/whale-moves',
        scope: 'institutional',
        status: 'live',
        delayed: true,
        params: ['ticker', 'quarter', ...LIST],
        fields: {
          id: 'integer',
          kind: 'data',
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
        kind: 'data',
        path: '/v1/insider/transactions',
        scope: 'insider',
        status: 'live',
        delayed: true,
        params: ['ticker', 'code', 'from', 'to', 'min_amount', ...LIST],
        fields: {
          id: 'string',
          kind: 'data',
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
];

/** Every param: the base set plus each catalog's own (names must not collide). */
export const PARAMS = Object.assign({}, BASE_PARAMS, ...CATALOGS.map((c) => c.PARAMS || {}));
/** Param names declared by more than one module (the test asserts none). */
export const PARAM_COLLISIONS = (() => {
  const seen = new Map(Object.keys(BASE_PARAMS).map((k) => [k, 'base']));
  const out = [];
  CATALOGS.forEach((c, i) => {
    for (const k of Object.keys(c.PARAMS || {})) {
      if (seen.has(k)) out.push(`${k} (${seen.get(k)} and catalog ${i})`);
      else seen.set(k, `catalog ${i}`);
    }
  });
  return out;
})();

const DIM_ORDER = new Map(DIMENSIONS.map((d, i) => [d.id, i]));
const DIM_LABEL = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.label]));

/** Groups in dimension order, each with its catalog routes appended. */
export const GROUPS = [...BASE_GROUPS, ...CATALOGS.flatMap((c) => c.GROUPS || [])]
  .map((g, i) => ({
    ...g,
    dimensionLabel: DIM_LABEL[g.dimension] || g.dimension,
    routes: [...g.routes, ...CATALOGS.flatMap((c) => (c.ROUTES || {})[g.key] || [])],
    _i: i,
  }))
  .sort(
    (a, b) =>
      (DIM_ORDER.get(a.dimension) ?? 99) - (DIM_ORDER.get(b.dimension) ?? 99) || a._i - b._i,
  )
  .map(({ _i, ...g }) => g);

/** Every endpoint, flattened, with method, group and dimension. */
export const ENDPOINTS = GROUPS.flatMap((g) =>
  g.routes.map((r) => ({
    method: 'GET',
    group: g.key,
    dimension: g.dimension,
    dimensionLabel: g.dimensionLabel,
    source: g.source || null,
    ...r,
  })),
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
