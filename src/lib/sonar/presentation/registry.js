/**
 * The Sonar research component registry (Nov 28 2026).
 *
 * One versioned list of the approved financial research components a Sonar answer may draw.
 * The model never returns component code: the analytical layer returns verified results, and
 * this registry decides which known component can show each result, how wide it sits on the
 * 12-column report grid, and what state it is in (ready, partial, unavailable, unsupported).
 *
 * Each entry:
 *   id             stable component id, referenced by plans, saved reports and tests
 *   impl           the React implementation key (src/components/sonar/layout/implementations.js)
 *   label          what the component is, for the methodology line and screen readers
 *   objectives     analytical objectives it answers (ranking, trend, composition, ...)
 *   families       report families it belongs to (templates.js)
 *   visTypes       analysis visualization types it can render directly (analysis.js `type`)
 *   requires       fields the payload's `data` must carry
 *   sufficiency    (data) -> { ok, state, reason }: the minimum data for an honest render
 *   span           recommended grid span { wide, mid, min } in twelfths / sixths
 *   minHeight      px the component reserves, so nothing jumps when data arrives
 *   interactions   what the reader can do with it
 *   a11y           what it provides for assistive technology
 *   states         copy for empty, partial, unavailable and unsupported states
 *   freshness      the age at which data is labelled delayed (days), or null
 *   entitlement    null, or the plan feature that opens it
 *   evidence       true when every figure must cite evidence
 *   signature      (payload) -> string: two payloads with the same signature are redundant
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-presentation.mjs.
 */
import { num, comparableSnapshots, isMutuallyExclusive, coverageRatio } from './contracts';

export const REGISTRY_VERSION = 'sonar-components-v1';

const ok = { ok: true, state: 'ready', reason: null };
const no = (reason, state = 'unavailable') => ({ ok: false, state, reason });

const STATES = (what) => ({
  empty: `No ${what} was returned for this question.`,
  partial: `Part of the ${what} is missing; the gaps are marked.`,
  unavailable: `The ${what} could not be retrieved for this question.`,
  unsupported: `This answer has no ${what} that this view can show.`,
});

const sig = (p, extra = '') =>
  [p?.componentId, p?.metric || p?.title, p?.unit, p?.period?.label, p?.entity?.id, extra]
    .map((x) => String(x || '').toLowerCase())
    .join('|');

export const COMPONENTS = [
  {
    id: 'financial-metric-card',
    impl: 'SonarFinancialMetricCard',
    label: 'Financial metric',
    objectives: ['metric', 'trend'],
    families: ['company_fundamentals', 'macro', 'quant', 'government', 'institutional', 'congress'],
    visTypes: ['metric'],
    requires: ['value'],
    sufficiency: (d) => (num(d?.value) !== null ? ok : no('No verified value for this metric.')),
    span: { wide: 3, mid: 3, min: 3 },
    minHeight: 112,
    interactions: ['hover-tooltip'],
    a11y: ['text-equivalent'],
    states: STATES('metric'),
    freshness: 7,
    entitlement: null,
    evidence: true,
    signature: (p) => sig(p),
  },
  {
    id: 'financial-research-table',
    impl: 'SonarFinancialResearchTable',
    label: 'Research table',
    objectives: ['ranking', 'screen', 'comparison', 'intersection', 'list'],
    families: [
      'institutional',
      'congress',
      'government',
      'company_fundamentals',
      'macro',
      'quant',
      'cross_dataset',
    ],
    visTypes: ['table'],
    requires: ['columns', 'rows'],
    sufficiency: (d) => {
      if (!Array.isArray(d?.columns) || !d.columns.length) return no('No columns defined.');
      if (!Array.isArray(d?.rows)) return no('No rows returned.');
      if (!d.rows.length) return no('No rows matched.', 'empty');
      return ok;
    },
    span: { wide: 12, mid: 6, min: 12 },
    minHeight: 240,
    interactions: ['sort', 'filter', 'search', 'column-visibility', 'select', 'paginate', 'export'],
    a11y: ['semantic-table', 'aria-sort', 'keyboard'],
    states: STATES('table'),
    freshness: null,
    entitlement: null,
    evidence: true,
    signature: (p) => sig(p, (p?.data?.columns || []).map((c) => c.key).join(',')),
  },
  {
    id: 'ranking-evolution',
    impl: 'SonarRankingEvolutionChart',
    label: 'Ranking over reporting periods',
    objectives: ['ranking'],
    families: ['institutional', 'government', 'macro', 'company_fundamentals', 'cross_dataset'],
    visTypes: ['race', 'ranking_snapshots'],
    requires: ['snapshots'],
    sufficiency: (d) => {
      const snaps = Array.isArray(d?.snapshots) ? d.snapshots : [];
      if (!snaps.length) return no('No ranking was returned.', 'empty');
      if (comparableSnapshots(snaps).length) return ok;
      /* One period still ranks; it is drawn static, never animated. */
      const one = snaps.find((s) => (s?.rows || []).filter((r) => num(r?.value) !== null).length);
      return one
        ? { ok: true, state: 'static', reason: 'One reporting period only.' }
        : no('No ranked values.');
    },
    span: { wide: 8, mid: 6, min: 6 },
    minHeight: 320,
    interactions: ['period-step', 'play-real-periods', 'chart-table-toggle', 'hover-tooltip'],
    a11y: ['table-view', 'reduced-motion', 'keyboard'],
    states: STATES('ranking'),
    freshness: null,
    entitlement: null,
    evidence: true,
    signature: (p) => sig(p, 'rank'),
  },
  {
    id: 'exposure-breakdown',
    impl: 'SonarExposureBreakdown',
    label: 'Exposure breakdown',
    objectives: ['composition'],
    families: ['company_fundamentals', 'institutional', 'government', 'quant', 'macro'],
    visTypes: ['donut', 'composition', 'stacked'],
    requires: ['parts'],
    sufficiency: (d) => {
      const parts = (d?.parts || []).filter((p) => num(p?.value) !== null);
      if (!parts.length) return no('No categories returned.', 'empty');
      if (parts.length < 2) return no('One category is not a breakdown.', 'unsupported');
      return isMutuallyExclusive(parts, { exclusive: d?.exclusive, total: d?.total })
        ? ok
        : { ok: true, state: 'overlapping', reason: 'Categories overlap; shown as ranked values.' };
    },
    span: { wide: 4, mid: 3, min: 4 },
    minHeight: 300,
    interactions: ['hover-tooltip', 'legend-highlight', 'chart-table-toggle'],
    a11y: ['table-view', 'text-equivalent'],
    states: STATES('breakdown'),
    freshness: null,
    entitlement: null,
    evidence: true,
    signature: (p) => sig(p, 'share'),
  },
  {
    id: 'financial-activity-matrix',
    impl: 'SonarFinancialActivityMatrix',
    label: 'Activity by period',
    objectives: ['activity', 'trend'],
    families: ['congress', 'government', 'institutional', 'quant'],
    visTypes: ['timeline', 'matrix', 'activity'],
    requires: ['columns'],
    sufficiency: (d) => {
      const cols = Array.isArray(d?.columns) ? d.columns : [];
      if (!cols.length) return no('No periods returned.', 'empty');
      const vals = cols.flatMap((c) => (d.series || [{ key: 'value' }]).map((s) => c[s.key]));
      const cov = coverageRatio(vals);
      if (cov === 0) return no('No period has an observation.');
      return cov < 1
        ? { ok: true, state: 'partial', reason: 'Some periods have no observation.' }
        : ok;
    },
    span: { wide: 8, mid: 6, min: 6 },
    minHeight: 260,
    interactions: ['hover-tooltip', 'keyboard-step', 'chart-table-toggle'],
    a11y: ['table-view', 'keyboard', 'text-equivalent'],
    states: STATES('activity record'),
    freshness: 3,
    entitlement: null,
    evidence: true,
    signature: (p) => sig(p, (p?.data?.series || []).map((s) => s.key).join(',')),
  },
  {
    id: 'investment-universe-heatmap',
    impl: 'SonarInvestmentUniverseHeatmap',
    label: 'Investment universe map',
    objectives: ['universe', 'composition'],
    families: ['company_fundamentals', 'institutional', 'government', 'cross_dataset'],
    visTypes: ['heatmap', 'treemap'],
    requires: ['tiles', 'areaMeasure', 'colorMeasure'],
    sufficiency: (d) => {
      if (!d?.areaMeasure?.label || !d?.colorMeasure?.label)
        return no('Tile area and colour must each name their measure.', 'unsupported');
      const tiles = (d?.tiles || []).filter((t) => num(t?.area) !== null && num(t.area) > 0);
      if (tiles.length < 3) return no('Too few sized tiles for a map.', 'empty');
      return tiles.length < (d.tiles || []).length
        ? { ok: true, state: 'partial', reason: 'Tiles without a size are left out and listed.' }
        : ok;
    },
    span: { wide: 12, mid: 6, min: 8 },
    minHeight: 380,
    interactions: ['hover-tooltip', 'keyboard-step', 'select', 'chart-table-toggle'],
    a11y: ['table-view', 'keyboard'],
    states: STATES('universe'),
    freshness: 1,
    entitlement: null,
    evidence: true,
    signature: (p) => sig(p, `${p?.data?.areaMeasure?.label}/${p?.data?.colorMeasure?.label}`),
  },
  {
    id: 'research-securities-monitor',
    impl: 'SonarResearchSecuritiesMonitor',
    label: 'Securities in this research',
    objectives: ['securities', 'list'],
    families: ['company_fundamentals', 'congress', 'institutional', 'quant', 'cross_dataset'],
    visTypes: ['securities'],
    requires: ['rows'],
    sufficiency: (d) => {
      const rows = (d?.rows || []).filter((r) => r && r.ticker);
      if (!rows.length) return no('No securities were identified.', 'empty');
      return ok;
    },
    span: { wide: 4, mid: 3, min: 4 },
    minHeight: 280,
    interactions: ['sort', 'select', 'ask-follow-up'],
    a11y: ['semantic-table', 'aria-sort', 'keyboard'],
    states: STATES('security list'),
    freshness: 1,
    entitlement: null,
    evidence: true,
    signature: (p) =>
      sig(
        p,
        (p?.data?.rows || [])
          .map((r) => r.ticker)
          .sort()
          .join(','),
      ),
  },
  {
    id: 'research-activity-timeline',
    impl: 'SonarActivityTimeline',
    label: 'Annotated activity timeline',
    objectives: ['trend', 'events'],
    families: ['congress', 'government', 'institutional', 'company_fundamentals', 'macro'],
    visTypes: ['annotated_series', 'events'],
    requires: ['series'],
    sufficiency: (d) => {
      const pts = (d?.series || []).filter((p) => num(p?.y) !== null);
      if (pts.length < 2) return no('A trend needs two or more observations.', 'empty');
      return pts.length < (d.series || []).length
        ? { ok: true, state: 'partial', reason: 'Missing periods break the line.' }
        : ok;
    },
    span: { wide: 8, mid: 6, min: 6 },
    minHeight: 320,
    interactions: ['hover-tooltip', 'event-drilldown', 'chart-table-toggle'],
    a11y: ['table-view', 'text-equivalent'],
    states: STATES('series'),
    freshness: 7,
    entitlement: null,
    evidence: true,
    signature: (p) => sig(p, 'series'),
  },
];

const BY_ID = new Map(COMPONENTS.map((c) => [c.id, c]));
const BY_VIS = new Map();
for (const c of COMPONENTS) for (const t of c.visTypes) if (!BY_VIS.has(t)) BY_VIS.set(t, c);

/** A registry entry by id, or null. */
export const getComponent = (id) => BY_ID.get(id) || null;

/** The registry entry that renders an analysis visualization type, or null. */
export const componentForVisType = (type) => BY_VIS.get(type) || null;

/**
 * Whether a normalized payload can render in a component, and in which state.
 * -> { ok, state, reason, component }
 */
export function evaluate(payload) {
  const c = getComponent(payload?.componentId);
  if (!c) return { ok: false, state: 'unsupported', reason: 'Unknown component.', component: null };
  if (payload.access && payload.access.entitled === false)
    return { ok: false, state: 'locked', reason: 'Not included in your plan.', component: c };
  if (payload.completeness === 'unavailable')
    return {
      ok: false,
      state: 'unavailable',
      reason: payload.limitations[0] || null,
      component: c,
    };
  if (payload.completeness === 'unsupported')
    return {
      ok: false,
      state: 'unsupported',
      reason: payload.limitations[0] || null,
      component: c,
    };
  if (c.evidence && !payload.evidenceIds.length && !payload.source)
    return {
      ok: false,
      state: 'unavailable',
      reason: 'No evidence backs these figures.',
      component: c,
    };
  const res = c.sufficiency(payload.data || {});
  const partial = payload.completeness === 'partial' && res.state === 'ready';
  return { ...res, state: partial ? 'partial' : res.state, component: c };
}
