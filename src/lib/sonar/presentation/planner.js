/**
 * The Sonar adaptive layout planner (Nov 28 2026).
 *
 *   question -> canonical intent -> execution plan -> verified analytical results
 *   -> fulfillment validation -> component candidates -> relevance -> deduplication
 *   -> responsive layout plan -> render
 *
 * The intent decides which analyses matter; the computed data decides which components can
 * render. This module is the last four steps. It extends the visualization planner
 * (insight/viz-plan.js) instead of competing with it: planVisualizations still removes
 * redundant charts, drops charts about a measure nobody asked for, keeps a ranking's chart
 * and table as one module and caps the count by research depth. This planner then maps each
 * surviving result onto an approved registry component, checks the data is sufficient for an
 * honest render, orders the items by the report family's template and gives each its span on
 * the 12-column grid.
 *
 * A visualization the registry has no component for keeps its existing renderer (the board's
 * line chart and ranking module, which are mature): componentId is null and the host falls
 * back. A requested analysis whose data is insufficient is returned in `unavailable` with its
 * reason, so the report says what could not be shown instead of drawing a placeholder.
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-presentation.mjs.
 */
import { planVisualizations } from '../insight/viz-plan';
import { normalizePayload, num, comparableSnapshots } from './contracts';
import { componentForVisType, getComponent, evaluate, REGISTRY_VERSION } from './registry';
import { orderBySlots, reportFamily } from './templates';

export const PRESENTATION_PLAN_VERSION = 'sonar-presentation-v1';

const SERIES_TONES = { buys: 'pos', purchases: 'pos', sells: 'neg', sales: 'neg' };
const SERIES_LABELS = { buys: 'Purchases', sells: 'Sales' };

function common(vis) {
  return {
    title: vis.title || null,
    metric: vis.metric || vis.title || null,
    unit: vis.unit && vis.unit !== 'value' ? vis.unit : null,
    currency: vis.currency || null,
    period: vis.period || null,
    source: vis.source || null,
    methodology: vis.method || null,
    evidenceIds: vis.evidenceIds || [],
    limitations: vis.limitations || [],
    completeness: vis.completeness || null,
    flags: vis.flags || null,
    dataset: vis.dataset || null,
    retrievedAt: vis.retrievedAt || null,
    objective: vis.objective || null,
  };
}

/**
 * An analysis visualization (analysis.js) as a normalized component payload, or null when no
 * registry component should take it (the host keeps its existing renderer).
 */
export function payloadFromVisualization(vis) {
  if (!vis || !vis.type) return null;
  const base = common(vis);
  switch (vis.type) {
    case 'timeline': {
      const series = Array.isArray(vis.series) ? vis.series : [];
      if (!series.length) return null;
      const keys = Object.keys(series[0]).filter((k) => k !== 'x' && k !== 'label');
      if (!keys.length) return null;
      return normalizePayload({
        ...base,
        componentId: 'financial-activity-matrix',
        objective: 'activity',
        data: {
          columns: series.map((p) => {
            const col = { period: String(p.x ?? p.label ?? '') };
            /* Absent stays null: a month with no record is not a month of zero trades. */
            for (const k of keys) col[k] = num(p[k]);
            return col;
          }),
          series: keys.map((k) => ({
            key: k,
            label: SERIES_LABELS[k] || k.replace(/_/g, ' '),
            tone: SERIES_TONES[k] || 'neu',
          })),
          zeroConfirmed: vis.zeroConfirmed !== false,
        },
      });
    }
    case 'donut':
    case 'composition':
    case 'stacked':
      return normalizePayload({
        ...base,
        componentId: 'exposure-breakdown',
        objective: 'composition',
        data: {
          parts: (vis.parts || vis.rows || []).map((r, i) => ({
            key: r.key || r.id || `${r.label}-${i}`,
            label: r.label,
            value: num(r.value),
          })),
          exclusive: Boolean(vis.exclusive),
          total: num(vis.total),
          denominatorLabel: vis.denominatorLabel || null,
        },
      });
    case 'leaderboard':
    case 'bars':
    case 'race':
    case 'ranking_snapshots': {
      const snaps = Array.isArray(vis.snapshots) ? vis.snapshots : [];
      /* A single ranking stays on the board's own ranking module; the evolution chart takes
         a ranking only when real snapshots exist (or the analysis asked for it by type). */
      if (!comparableSnapshots(snaps).length && (vis.type === 'leaderboard' || vis.type === 'bars'))
        return null;
      return normalizePayload({
        ...base,
        componentId: 'ranking-evolution',
        objective: 'ranking',
        data: {
          snapshots: snaps.length
            ? snaps
            : vis.rows
              ? [{ period: vis.period?.label || 'Latest', rows: vis.rows }]
              : [],
        },
      });
    }
    case 'heatmap':
    case 'treemap':
      return normalizePayload({
        ...base,
        componentId: 'investment-universe-heatmap',
        objective: 'universe',
        data: {
          tiles: vis.tiles || [],
          areaMeasure: vis.areaMeasure || null,
          colorMeasure: vis.colorMeasure || null,
        },
      });
    case 'table':
      return normalizePayload({
        ...base,
        componentId: 'financial-research-table',
        objective: vis.objective || 'list',
        data: {
          columns: vis.columns || [],
          rows: vis.rows || [],
          exportable: Boolean(vis.exportable),
        },
      });
    case 'securities':
      return normalizePayload({
        ...base,
        componentId: 'research-securities-monitor',
        objective: 'securities',
        data: { rows: vis.rows || [] },
      });
    case 'annotated_series':
    case 'events':
      return normalizePayload({
        ...base,
        componentId: 'research-activity-timeline',
        objective: 'trend',
        data: { series: vis.series || [], events: vis.events || [], metrics: vis.metrics || [] },
      });
    case 'metric':
      return normalizePayload({
        ...base,
        componentId: 'financial-metric-card',
        objective: 'metric',
        data: {
          value: num(vis.value),
          change: num(vis.change),
          changeUnit: vis.changeUnit || null,
          polarity: vis.polarity || null,
          spark: vis.spark || null,
        },
      });
    default:
      return null;
  }
}

/** Whether a host can render a visualization through the registry. */
export const registryRenders = (vis) =>
  Boolean(componentForVisType(vis?.type) && payloadFromVisualization(vis));

/**
 * Plan the analytical area.
 * @param {object[]} vis  analysis visualizations
 * @param {{ intent?, findings?, depth?, spec?, composition? }} ctx
 * -> { version, registry, family, items: [{ id, vis, spec, views, role, componentId, payload,
 *      state, reason, span, slot }], unavailable: [{ id, title, reason, state }], dropped }
 */
export function planPresentation(vis = [], ctx = {}) {
  const base = planVisualizations(vis, ctx);
  const family = reportFamily({
    domains: (ctx.spec?.domains || []).map((d) => d?.id || d),
    sources: (vis || []).map((v) => v?.source).filter(Boolean),
    composition: Boolean(ctx.composition),
  });
  const items = [];
  const unavailable = [];
  const dropped = [...base.dropped];
  const seen = new Set();
  for (const it of base.items) {
    const payload = payloadFromVisualization(it.vis);
    if (!payload) {
      items.push({
        ...it,
        componentId: null,
        payload: null,
        state: 'ready',
        reason: null,
        span: null,
        objective: it.spec.objective,
        title: it.vis.title,
      });
      continue;
    }
    const ev = evaluate(payload);
    const component = getComponent(payload.componentId);
    const signature = component.signature(payload);
    if (seen.has(signature)) {
      dropped.push({ id: it.id, reason: 'same_component_content' });
      continue;
    }
    seen.add(signature);
    if (!ev.ok) {
      /* Only a result the question asked for earns an unavailable notice; a context chart
         with no data is simply not drawn. */
      if (it.role === 'primary')
        unavailable.push({
          id: it.id,
          title: it.vis.title || component.label,
          reason: ev.reason,
          state: ev.state,
        });
      else dropped.push({ id: it.id, reason: `insufficient:${ev.state}` });
      continue;
    }
    items.push({
      ...it,
      componentId: component.id,
      payload,
      state: ev.state,
      reason: ev.reason,
      span: component.span,
      objective: payload.objective || it.spec.objective,
      title: payload.title,
      views: component.a11y.includes('table-view') ? ['chart', 'table'] : it.views,
    });
  }
  return {
    version: PRESENTATION_PLAN_VERSION,
    registry: REGISTRY_VERSION,
    family,
    items: orderBySlots(items, family),
    unavailable,
    dropped,
  };
}
