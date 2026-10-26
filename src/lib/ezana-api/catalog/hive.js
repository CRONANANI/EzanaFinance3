/**
 * Ezana API catalog: hive dimension. Pure, client-safe (read by the docs
 * page). See registry.js for the route shape. The prediction-market routes
 * themselves live in registry.js's base `predictions` group.
 *
 *   PARAMS  query params this dimension adds (names must be new)
 *   ROUTES  { groupKey: [route, ...] } appended to an existing group
 *   GROUPS  new groups, each with dimension: 'hive'
 */
export const PARAMS = {
  min_similarity: {
    type: 'number',
    desc: 'Minimum title similarity, 0.6 to 1 (default 0.75).',
  },
};

export const ROUTES = {
  predictions: [
    {
      id: 'predictions.cross_venue',
      path: '/v1/predictions/cross-venue',
      scope: 'predictions',
      status: 'live',
      kind: 'insight',
      list: true,
      params: ['min_similarity', 'category', 'sort', 'limit'],
      paramEnums: { sort: ['gap', 'similarity'] },
      method:
        "Active events on both Polymarket and Kalshi are paired by trigram similarity of their normalized titles (years and district codes must agree), then the same outcome, or each venue's leader, is compared.",
      fields: {
        similarity: 'number',
        matched_on: 'string',
        same_leader: 'boolean',
        outcome: 'string',
        gap: 'number',
        abs_gap: 'number',
        polymarket: 'object',
        kalshi: 'object',
      },
      summary:
        "The same question listed on both venues, with each venue's probability and the gap between them: venue disagreement. matched_on is outcome (the same outcome on both venues) or leader (each venue's favourite, with same_leader saying whether they are the same outcome). Same-outcome pairs rank first. Default min_similarity 0.75, sort gap (largest first).",
    },
  ],
};

export const GROUPS = [];
