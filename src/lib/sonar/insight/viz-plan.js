/**
 * Visualization planning (Nov 2026). Before anything is drawn, each chart states what
 * analytical question it answers, and two charts that make the same comparison are not
 * both shown. Pure, and safe in the browser (ResearchBoard calls it, so a saved or cached
 * run gets the same plan as a live one).
 *
 * Every planned chart carries a spec: id, analytical objective, the findings it supports,
 * dataset, measure and unit, period, comparison baseline, chart type, what it adds that no
 * other chart does, source, and its limits.
 *
 * Rules:
 *   - A ranking is drawn once. Its exact figures go in the same module as a table view
 *     (`views: ['chart', 'table']`), never in a second card.
 *   - Two charts with the same measure, entities and transformation are one chart, whatever
 *     their visual types.
 *   - A chart about a different measure from the question (a price line on a production
 *     question) stays only when a key finding cites it; otherwise it is dropped. An empty
 *     space beats a chart drawn to fill a layout.
 *   - At most quick 2, standard 4, deep 6 charts, most useful first.
 */
import { measuresOf } from './intent';

export const VIZ_PLAN_VERSION = 'vizplan-v1';
export const VIZ_CAPS = { quick: 2, standard: 4, deep: 6 };

const TYPE_OBJECTIVE = {
  bars: 'ranking',
  leaderboard: 'ranking',
  ranked_bar: 'ranking',
  line: 'trend',
  timeline: 'trend',
  donut: 'composition',
  stacked: 'composition',
  scatter: 'relationship',
};
const TRANSFORM = {
  ranking: 'rank',
  trend: 'series',
  composition: 'share',
  relationship: 'pair',
};

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(highest|largest|most|lowest|top \d+|top|the|of|in|by|per|annual|latest)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function entitiesOf(v) {
  if (Array.isArray(v?.rows) && v.rows.length)
    return v.rows
      .slice(0, 10)
      .map((r) => String(r.label || '').toLowerCase())
      .sort()
      .join('|');
  const place = /\(([^)]+)\)\s*$/.exec(String(v?.title || ''));
  return place ? place[1].toLowerCase() : '';
}

/** What a visualization compares: same signature means the same analytical content. */
export function vizSignature(v) {
  const objective = TYPE_OBJECTIVE[v?.type] || 'other';
  return {
    measure: norm(v?.title),
    unit: String(v?.unit || '').toLowerCase(),
    entities: entitiesOf(v),
    transform: TRANSFORM[objective] || v?.type || 'other',
    objective,
    period: v?.period?.label || [v?.period?.from, v?.period?.to].filter(Boolean).join(' to '),
  };
}

/** Same analytical content: the same measure and unit over the same entities, and either
 *  the same transformation or a ranking drawn twice (bar chart and table, two bar charts). */
export function sameContent(a, b) {
  const A = a.measure !== undefined ? a : vizSignature(a);
  const B = b.measure !== undefined ? b : vizSignature(b);
  if (!A.measure || A.measure !== B.measure) return false;
  if (A.entities !== B.entities) return false;
  if (A.unit && B.unit && A.unit !== B.unit) return false;
  return A.transform === B.transform || (A.objective === 'ranking' && B.objective === 'ranking');
}

function takeawayOf(v, supports) {
  if (supports[0]?.title) return supports[0].title;
  if (v.type === 'line' && Array.isArray(v.series) && v.series.length > 1) {
    const s = v.series.filter((p) => Number.isFinite(Number(p.y)));
    if (s.length > 1) {
      const a = Number(s[0].y);
      const b = Number(s.at(-1).y);
      const rate = /%|percent|rate/i.test(`${v.unit || ''} ${v.title || ''}`);
      const d = rate ? b - a : a ? ((b - a) / Math.abs(a)) * 100 : null;
      if (d != null)
        return `${d >= 0 ? 'Up' : 'Down'} ${Math.abs(d).toLocaleString('en-US', { maximumFractionDigits: 1 })}${rate ? ' percentage points' : '%'} from ${s[0].x} to ${s.at(-1).x}.`;
    }
  }
  return null;
}

/**
 * Plan the visualizations.
 * @param {object[]} vis  analysis visualizations (analysis.js)
 * @param {{ intent?, findings?, depth?, metrics? }} ctx  findings: the key findings (their
 *   `metrics` and `markers` say what they rest on)
 * -> { items: [{ id, vis, spec, role, views }], dropped: [{ id, reason, duplicateOf }] }
 */
export function planVisualizations(
  vis = [],
  { intent = null, findings = [], depth = 'standard' } = {},
) {
  const list = (vis || []).filter((v) => v && v.id);
  const cap = VIZ_CAPS[depth] || VIZ_CAPS.standard;
  const asked = intent?.measure || null;
  const items = [];
  const dropped = [];

  const supportsOf = (v) =>
    (findings || []).filter((f) => {
      const ev = new Set(v.evidenceIds || []);
      const viaEvidence = (f.evidenceIds || []).some((id) => ev.has(id));
      const viaMetric = (f.metrics || []).some(
        (m) => String(m).startsWith(`${v.id}_`) || String(m) === v.id,
      );
      return viaEvidence || viaMetric;
    });

  for (const v of list) {
    const sig = vizSignature(v);
    const twin = items.find((x) => sameContent(x.sig, sig));
    if (twin) {
      dropped.push({ id: v.id, reason: 'same_content', duplicateOf: twin.id });
      continue;
    }
    const supports = supportsOf(v);
    const own = measuresOf(v.title);
    const offMeasure = Boolean(asked && own.length && !own.includes(asked));
    if (offMeasure && !supports.length) {
      dropped.push({ id: v.id, reason: 'off_objective' });
      continue;
    }
    const objective = sig.objective;
    const unique =
      objective === 'ranking'
        ? 'Order and size of every listed value, with exact figures in the table view'
        : objective === 'trend'
          ? `How ${String(v.title || 'the series').toLowerCase()} moved over ${sig.period || 'the period'}`
          : objective === 'composition'
            ? 'How the total splits into its parts'
            : 'A relationship the other charts do not show';
    items.push({
      id: v.id,
      sig,
      vis: v,
      role: offMeasure ? 'context' : 'primary',
      views: objective === 'ranking' ? ['chart', 'table'] : ['chart'],
      spec: {
        id: v.id,
        objective,
        supports: supports.map((f) => f.id),
        dataset: v.source || null,
        measure: v.title || null,
        unit: v.unit && v.unit !== 'value' ? v.unit : null,
        period: sig.period || null,
        baseline:
          objective === 'ranking'
            ? 'the other listed values'
            : objective === 'trend'
              ? 'the start of the period'
              : null,
        chartType:
          objective === 'ranking' ? 'horizontal_bar' : objective === 'trend' ? 'line' : v.type,
        unique,
        source: v.source || null,
        limitations: v.method || null,
        takeaway: takeawayOf(v, supports),
      },
    });
  }

  /* Most useful first: the question's own measure, then charts a finding cites, then the
     rest; within that, the original order. */
  const rank = (x) => (x.role === 'primary' ? 0 : 2) - (x.spec.supports.length ? 1 : 0);
  const ordered = items
    .map((x, i) => ({ x, i }))
    .sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i)
    .map(({ x }) => x);
  for (const x of ordered.slice(cap)) dropped.push({ id: x.id, reason: 'cap' });
  return {
    version: VIZ_PLAN_VERSION,
    items: ordered.slice(0, cap).map(({ sig, ...rest }) => rest),
    dropped,
  };
}
