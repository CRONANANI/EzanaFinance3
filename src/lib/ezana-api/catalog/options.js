/**
 * Ezana API catalog: Options exposure. Pure, client-safe (read by the docs
 * page). See registry.js for the route shape.
 *
 * Restricted: the `options` scope is granted by hand, not by any tier, while
 * Alpaca/OPRA redistribution rights are confirmed (see tiers.js).
 */

export const PARAMS = {
  mode: {
    type: 'string',
    enum: [
      'net_delta',
      'net_delta_usd',
      'call_delta',
      'put_delta',
      'gamma_usd_1pct',
      'open_interest',
    ],
    desc: 'What each cell sums (default net_delta, in delta-equivalent shares).',
  },
  strikes: {
    type: 'int',
    min: 2,
    max: 40,
    desc: 'Number of strikes nearest the underlying price (default 8).',
  },
  expirations: {
    type: 'int',
    min: 1,
    max: 16,
    desc: 'Number of upcoming expirations, soonest first (default 7).',
  },
  max_days: {
    type: 'int',
    min: 1,
    max: 730,
    desc: 'Only expirations within this many days (default 120).',
  },
};

export const ROUTES = {};

export const GROUPS = [
  {
    key: 'options',
    title: 'Options exposure',
    base: '/v1/options',
    icon: 'bi-grid-3x3-gap',
    dimension: 'options',
    framing:
      'Strike by expiration exposure tables for listed US options: open-interest-weighted delta, dollar delta, gamma and open interest. Restricted: available on request while data licensing is confirmed.',
    source: 'Alpaca options data (OPRA via Alpaca); open interest as of the prior session',
    routes: [
      {
        id: 'options.exposure',
        path: '/v1/options/exposure/{ticker}',
        scope: 'options',
        status: 'live',
        kind: 'insight',
        delayed: false,
        params: ['mode', 'strikes', 'expirations', 'max_days'],
        fields: {
          ticker: 'string',
          mode: 'string',
          unit: 'string',
          label: 'string',
          spot: 'number',
          strikes: 'array',
          expirations: 'array',
          cells: 'array',
          by_strike: 'array',
          by_expiration: 'array',
          total: 'number',
          coverage: 'object',
          table: 'array',
        },
        method:
          "For the strikes nearest the underlying's latest trade and the next expirations: each cell sums open interest x greek x contract size over that strike's calls and puts. net_delta is delta-equivalent shares; net_delta_usd multiplies by the underlying price; gamma_usd_1pct is OI x gamma x size x price^2 x 1%, calls positive and puts negative (the common GEX convention). Open interest is as of the prior session; greeks come from Alpaca's model, and contracts without a greek are counted in missing_greeks, not as zero. This is the delta held by option holders in aggregate, not dealer positioning.",
        summary:
          'A strike x expiration exposure table for one underlying (net delta, dollar delta, call or put delta, gamma or open interest), with totals by strike and by expiration and the data coverage behind every cell. Chart it with /v1/charts/options-exposure/{ticker}.',
      },
    ],
  },
];
