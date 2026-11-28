/**
 * Ezana API handlers: Charts (server only). Each chart route runs the data
 * route it wraps (looked up from the merged handler map that ../handlers.js
 * binds in, so this module never imports ../handlers.js), turns the result
 * into a chart model and renders the requested format.
 */
import { CHART_WRAPS } from '../catalog/charts';
import {
  contractsChart,
  exposureChart,
  insiderFlowChart,
  marketHistoryChart,
  procurementChart,
} from '../charts/models';
import { renderSvg } from '../charts/svg';
import { toVegaLite } from '../charts/vega';

let ALL = null;
export function bindChartHandlers(handlers) {
  ALL = handlers;
}

const BUILD = {
  'charts.options_exposure': (out) => exposureChart(out.data),
  'charts.procurement_acceleration': (out) => procurementChart(out.data || [], out.meta),
  'charts.congress_insider_flow': (out, ctx) => insiderFlowChart(out.data || [], ctx.params),
  'charts.contracts_ticker': (out) => contractsChart(out.data),
  'charts.prediction_market_history': (out, ctx) => marketHistoryChart(out.data || [], ctx.path.id),
};

/** Render a model in the requested format (PNG loads its renderer lazily). */
export async function renderChart(model, format = 'json', theme = 'dark') {
  if (format === 'png') {
    const { renderPng } = await import('../charts/png');
    return { raw: { body: await renderPng(model, theme), contentType: 'image/png' } };
  }
  if (format === 'svg') {
    return { raw: { body: renderSvg(model, theme), contentType: 'image/svg+xml; charset=utf-8' } };
  }
  if (format === 'vega') return { data: toVegaLite(model, theme) };
  return {
    data: { chart: model, vega_lite: toVegaLite(model, theme), svg: renderSvg(model, theme) },
  };
}

function chartHandler(id) {
  return async (ctx) => {
    if (!ALL) throw new Error('charts: handlers not bound');
    const out = await ALL[CHART_WRAPS[id]](ctx);
    const model = BUILD[id](out, ctx);
    const rendered = await renderChart(
      model,
      ctx.params.format || 'json',
      ctx.params.theme || 'dark',
    );
    return {
      ...rendered,
      meta: {
        wraps: CHART_WRAPS[id],
        formats: ['json', 'png', 'svg', 'vega'],
        ...(out.meta || {}),
      },
    };
  };
}

export const HANDLERS = Object.fromEntries(Object.keys(BUILD).map((id) => [id, chartHandler(id)]));
