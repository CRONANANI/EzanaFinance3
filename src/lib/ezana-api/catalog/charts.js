/**
 * Ezana API catalog: Charts. Pure, client-safe (read by the docs page).
 *
 * Every chart route wraps one data route and copies its scope, delay,
 * parameters and enums from that route's catalog entry, so a chart can never
 * be wider than the data behind it and cannot drift from it. Each adds
 * `format` (json, png, svg, vega) and `theme` (dark, light).
 */
import * as ALPHA from './alpha';
import * as CAPITOL from './capitol';
import * as OPTIONS from './options';

export const PARAMS = {
  format: {
    type: 'string',
    enum: ['json', 'png', 'svg', 'vega'],
    desc: 'json (chart model, Vega-Lite spec and SVG), png (image/png), svg (image/svg+xml) or vega (Vega-Lite v5 spec). Default json.',
  },
  theme: { type: 'string', enum: ['dark', 'light'], desc: 'Colour theme (default dark).' },
};

export const ROUTES = {};

/* A catalog lists routes in GROUPS[].routes, or in ROUTES keyed by group
   (capitol). Look in both; a missing route fails loudly at import. */
const routeOf = (catalog, id) => {
  const lists = [
    ...(catalog.GROUPS || []).map((g) => g.routes || []),
    ...Object.values(catalog.ROUTES || {}),
  ];
  for (const list of lists) for (const r of list) if (r.id === id) return r;
  throw new Error(`charts catalog: no route ${id}`);
};

/* Prediction market history lives in the base catalog in registry.js, so its
   parameters are listed here; the registry guard test checks they exist. */
const WRAPS = [
  {
    id: 'charts.options_exposure',
    path: '/v1/charts/options-exposure/{ticker}',
    wraps: 'options.exposure',
    from: routeOf(OPTIONS, 'options.exposure'),
    chart: 'heatmap',
    summary:
      'Strike x expiration heatmap of options exposure (net delta by default; any mode of /v1/options/exposure). Restricted scope, like the data route.',
  },
  {
    id: 'charts.procurement_acceleration',
    path: '/v1/charts/procurement-acceleration',
    wraps: 'alpha.procurement_acceleration',
    from: routeOf(ALPHA, 'alpha.procurement_acceleration'),
    chart: 'bars',
    summary:
      'Diverging bars of robust z for the companies /v1/alpha/procurement-acceleration returns.',
  },
  {
    id: 'charts.congress_insider_flow',
    path: '/v1/charts/congress-insider-flow',
    wraps: 'congress.insider_flow',
    from: routeOf(CAPITOL, 'congress.insider_flow'),
    chart: 'bars',
    summary:
      'Diverging bars of congressional flow score (-100 all selling to +100 all buying) by ticker.',
  },
  {
    id: 'charts.contracts_ticker',
    path: '/v1/charts/contracts/{ticker}',
    wraps: 'contracts.ticker',
    from: routeOf(CAPITOL, 'contracts.ticker'),
    chart: 'columns',
    summary:
      "Columns of a listed company's federal contract obligations by fiscal year; unfinished years drawn lighter.",
  },
  {
    id: 'charts.prediction_market_history',
    path: '/v1/charts/predictions/markets/{id}/history',
    wraps: 'predictions.market_history',
    from: { scope: 'predictions', delayed: false, params: ['from', 'to', 'interval', 'limit'] },
    chart: 'line',
    summary: "Line of a prediction market's implied probability over time.",
  },
];

export const CHART_WRAPS = Object.fromEntries(WRAPS.map((w) => [w.id, w.wraps]));

export const GROUPS = [
  {
    key: 'charts',
    title: 'Charts',
    base: '/v1/charts',
    icon: 'bi-bar-chart-line',
    dimension: 'charts',
    framing:
      'Ready-to-show charts of Ezana data for dashboards, notebooks and AI coding tools (Claude Code, Codex, Grok, Cursor). Ask for a PNG to display, an SVG to embed, or a Vega-Lite spec to restyle; the JSON form carries all three plus the chart model. Each chart needs the same scope as the data it draws.',
    source: 'Ezana renderings of the wrapped data route',
    routes: WRAPS.map((w) => ({
      id: w.id,
      path: w.path,
      scope: w.from.scope,
      status: 'live',
      kind: 'data',
      delayed: Boolean(w.from.delayed),
      params: [...(w.from.params || []), 'format', 'theme'],
      ...(w.from.paramEnums ? { paramEnums: w.from.paramEnums } : {}),
      ...(w.from.sortValues ? { sortValues: w.from.sortValues } : {}),
      fields: { chart: 'object', vega_lite: 'object', svg: 'string' },
      wraps: w.wraps,
      chart: w.chart,
      summary: `${w.summary} Wraps ${w.wraps}.`,
    })),
  },
];
