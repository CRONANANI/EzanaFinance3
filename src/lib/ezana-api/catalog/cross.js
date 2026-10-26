/**
 * Ezana API catalog: cross dimension. Pure, client-safe (read by the docs
 * page). See registry.js for the route shape. Joins across dimensions that
 * no single-source feed can make; scope `cross` (Quant Firm and up).
 */
export const PARAMS = {};
export const ROUTES = {};

const TICKER_FIELDS = {
  ticker: 'string',
  confirmation: 'object',
  congress: 'object',
  lobbying: 'object',
  contracts: 'object',
  institutional: 'object',
  insider: 'object',
  etf: 'object',
  patents: 'object',
  exec_comp: 'object',
};

export const GROUPS = [
  {
    key: 'cross',
    title: 'Cross-dimensional signals',
    base: '/v1/cross',
    icon: 'bi-signpost-split',
    dimension: 'cross',
    framing:
      'Joins across influence, capital and consensus that no single-source feed can reconstruct. Every join states its rule; none is a buy or sell call.',
    source: 'Ezana joins over the sources of each dimension',
    routes: [
      {
        id: 'cross.composite',
        path: '/v1/cross/composite/{ticker}',
        scope: 'cross',
        status: 'live',
        kind: 'insight',
        delayed: true,
        params: [],
        fields: TICKER_FIELDS,
        method:
          'Each section is read from its own dataset (congressional flow, lobbying, contracts, 13F holders, Form 4, ETF holdings, patents, executive pay); confirmation counts the dimensions that meet a stated bullish or bearish rule and lists each rule met.',
        summary:
          'One ticker across every live dataset that touches it. Each section carries its own as_of and source and is null when the dataset has nothing on the name; meta.partial lists sections that timed out. confirmation is a count of stated rules, never a buy or sell call.',
      },
      {
        id: 'cross.contract_to_insider',
        path: '/v1/cross/contract-to-insider',
        scope: 'cross',
        status: 'live',
        kind: 'insight',
        delayed: true,
        list: true,
        params: ['days', 'limit'],
        fields: { ticker: 'string', awards: 'object', insider: 'object' },
        method:
          'Tickers whose federal award dollars rose in the latest complete fiscal year, joined to net open-market Form 4 buying (purchases minus sales) over the last N days, default 90.',
        summary:
          "Tickers with rising federal awards AND net open-market insider buying, with both sides' figures, largest award change first.",
      },
      {
        id: 'cross.influence_to_capital',
        path: '/v1/cross/influence-to-capital',
        scope: 'cross',
        status: 'live',
        kind: 'insight',
        delayed: true,
        list: true,
        params: ['limit'],
        fields: {
          ticker: 'string',
          company: 'string',
          lobbying_usd: 'number',
          match_method: 'string',
          holders: 'object',
        },
        method:
          'The listed companies with the most lobbying spend in the last year, joined to how their 13F holders changed last quarter (added, trimmed, new, exited, net shares). Correlation only: it shows whether institutional money moved, not why.',
        summary:
          'The heaviest lobbying spenders among listed companies, with their 13F holder change last quarter. Up to 25 tickers.',
      },
      {
        id: 'cross.capitol_insider_overlap',
        path: '/v1/cross/capitol-insider-overlap',
        scope: 'cross',
        status: 'live',
        kind: 'insight',
        delayed: true,
        list: true,
        params: ['days', 'limit'],
        fields: {
          ticker: 'string',
          member: 'object',
          member_date: 'date',
          insider: 'object',
          insider_date: 'date',
          insider_value: 'number',
          days_apart: 'integer',
        },
        method:
          "A member of Congress's disclosed purchase and a corporate insider's open-market purchase of the same ticker in the same calendar month; days_apart is the gap between the two trade dates.",
        summary:
          'Members of Congress and corporate insiders buying the same stock in the same month, newest first. Timing only, not a claim that either knew anything. Default days 60, limit 20 (max 100).',
      },
    ],
  },
];
