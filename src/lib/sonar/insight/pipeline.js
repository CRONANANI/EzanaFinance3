/**
 * The insight step (Nov 2026): runs once per research report, after the claim validator and
 * before the methodology audit, at every depth. No model call: deterministic findings,
 * scoring, selection and the visualization plan are arithmetic and string checks on what the
 * run already holds, so a quick ping keeps its latency budget.
 *
 *   1. deterministic candidates (derived.js) from the currency picture, the ranking and the
 *      trend lines, each figure registered as a metric (M:id) and each claim run through the
 *      same validator as the model's;
 *   2. selection (select.js): gates, scoring, redundancy against the executive answer and
 *      the charts; descriptive facts move to supporting facts, not into the bin;
 *   3. data gaps that limit the conclusion are stated next to it;
 *   4. the visualization plan (viz-plan.js).
 *
 * Mutates and returns `report`; returns diagnostics for telemetry (never rendered).
 */
import { validateClaim } from '@/lib/sonar/engine/findings';
import { numbersOf } from '@/lib/sonar/engine/evidence';
import { rankingInsights, trendInsight, insightMetrics } from './derived';
import { selectFindings } from './select';
import { planVisualizations } from './viz-plan';
import { measuresOf } from './intent';

export const INSIGHT_PIPELINE_VERSION = 'insight-v1';

const startsWith = (e, prefix) => String(e?.title || '').startsWith(prefix);

/** Validate a derived finding like any other claim; null when it does not survive. */
function validated(x, { markers, byMarker, metricsById }) {
  const claim = {
    title: x.title,
    explanation: [x.explanation, x.comparison].filter(Boolean).join(' '),
    classification: x.classification,
    evidence: markers,
    metrics: (x.figures || []).map((g) => g.id),
    entities: x.entities || [],
  };
  const v = validateClaim(claim, { byMarker, metricsById });
  if (v.action === 'removed') return null;
  return {
    id: x.id,
    insight: x.insight,
    title: x.title,
    explanation: x.explanation,
    comparison: x.comparison || null,
    implication: x.implication || null,
    caveat: x.caveat || null,
    classification: v.classification,
    evidenceIds: v.evidenceIds,
    markers: markers.filter((m) => byMarker.has(m)),
    metrics: claim.metrics.filter((m) => metricsById.has(m)),
    entities: x.entities || [],
    gap: Boolean(x.gap),
    derived: true,
    validation: { action: v.action, problems: v.problems },
  };
}

/**
 * @param {object} report  validated research report (mutated)
 * @param {{ intent, marked, metrics, visualizations, layout, depth }} ctx
 *   metrics is mutated: derived figures are appended so findings can cite them.
 */
export function applyInsightStep(report, ctx = {}) {
  const {
    intent = null,
    marked = [],
    metrics = [],
    visualizations = [],
    layout = {},
    depth = 'standard',
  } = ctx;
  if (!report) return { report, diagnostics: null };
  const t0 = Date.now();
  /* Records carry their parsed figures (toEvidence); a saved or replayed record may not. */
  const byMarker = new Map(
    marked.map((e) => [
      e.marker,
      Array.isArray(e.numbers) && Array.isArray(e.entities)
        ? e
        : {
            ...e,
            numbers: Array.isArray(e.numbers)
              ? e.numbers
              : numbersOf(`${e.title || ''} ${e.text || ''}`),
            entities: Array.isArray(e.entities) ? e.entities : [],
          },
    ]),
  );
  const derived = [];
  const limitations = [];

  /* Currency stress: the picture's insights, citing its computed-measures records. */
  const intel = layout?.macro?.countryIntel || null;
  if (
    intel?.insights?.length &&
    (intent?.family === 'currency_stress' || intent?.primary === 'risk_assessment')
  ) {
    const place = intel.place || '';
    const computed = marked
      .filter((e) => startsWith(e, `${place}: computed currency measures`))
      .map((e) => e.marker);
    const gapRec = marked
      .filter((e) => startsWith(e, `${place}: data not available`))
      .map((e) => e.marker);
    for (const x of intel.insights) derived.push({ x, markers: x.gap ? gapRec : computed });
  }

  /* Rankings: concentration as wide as the data, mixed periods, the missing history. */
  const rankVis = (visualizations || []).find(
    (v) => v && /^macro_rank_/.test(v.id || '') && (v.rows || []).length >= 2,
  );
  if (rankVis) {
    const r = rankingInsights(rankVis, intent);
    const markers = marked
      .filter((e) => (rankVis.evidenceIds || []).includes(e.id))
      .map((e) => e.marker);
    for (const x of r.findings)
      derived.push({
        x: {
          ...x,
          figures: (x.figures || []).map((g) => ({ ...g, inputs: rankVis.evidenceIds || [] })),
        },
        markers,
      });
    limitations.push(...r.limitations);
  }

  /* Trends: momentum of the lines that measure what the question asks about. */
  if (intent?.objectives?.includes('trend') && intent?.family !== 'currency_stress') {
    const lines = (visualizations || []).filter(
      (v) =>
        v?.type === 'line' &&
        (!intent.measure ||
          measuresOf(v.title).includes(intent.measure) ||
          !measuresOf(v.title).length),
    );
    for (const v of lines.slice(0, 2)) {
      const x = trendInsight(v);
      if (!x) continue;
      const markers = marked
        .filter((e) => (v.evidenceIds || []).includes(e.id))
        .map((e) => e.marker);
      derived.push({
        x: { ...x, figures: x.figures.map((g) => ({ ...g, inputs: v.evidenceIds || [] })) },
        markers,
      });
    }
  }

  /* Register every derived figure as a metric, then validate the derived claims. */
  const have = new Set(metrics.map((m) => m.id));
  for (const { x } of derived)
    for (const m of insightMetrics([x]))
      if (!have.has(m.id)) {
        metrics.push(m);
        have.add(m.id);
      }
  const metricsById = new Map(metrics.map((m) => [m.id, m]));
  const derivedValid = derived
    .map((d) => validated(d.x, { markers: d.markers, byMarker, metricsById }))
    .filter(Boolean);

  /* Selection over the model's findings and the derived ones. */
  const leader = rankVis?.rows?.[0]?.label || null;
  const chartTitles = (visualizations || []).map((v) => v?.title).filter(Boolean);
  const sel = selectFindings([...(report.keyFindings || []), ...derivedValid], {
    intent,
    conclusion: report.executiveConclusion?.text || '',
    charts: chartTitles,
    leader,
    evidence: marked,
    depth,
  });
  /* Never an empty findings section when a fair candidate exists: keep the best one. */
  if (!sel.keyFindings.length) {
    const fallback = sel.supporting.find((s) => s.placement === 'evidence');
    if (fallback) {
      sel.keyFindings.push(fallback);
      sel.supporting = sel.supporting.filter((s) => s !== fallback);
    }
  }
  report.keyFindings = sel.keyFindings;
  report.supportingFacts = sel.supporting.map((s) => ({
    id: s.id,
    title: s.title,
    explanation: s.explanation || s.text || '',
    classification: s.classification,
    markers: s.markers || [],
    placement: s.placement,
  }));

  /* Limits of the conclusion: a gap finding or a coverage limit is stated beside it. */
  report.limitations = [...new Set([...(report.limitations || []), ...limitations])].slice(0, 8);
  const gap = sel.keyFindings.find((k) => k.gap);
  report.conclusionLimits = gap ? gap.implication || gap.explanation : limitations[0] || null;

  /* Visualization plan. */
  const plan = planVisualizations(visualizations, { intent, findings: sel.keyFindings, depth });
  report.insight = {
    version: INSIGHT_PIPELINE_VERSION,
    intent: intent
      ? {
          primary: intent.primary,
          primaryLabel: intent.primaryLabel,
          objectives: intent.objectives,
          family: intent.family,
          familyLabel: intent.familyLabel,
          measure: intent.measure,
        }
      : null,
  };
  return {
    report,
    visualPlan: plan,
    diagnostics: {
      version: INSIGHT_PIPELINE_VERSION,
      ms: Date.now() - t0,
      derived: { candidates: derived.length, valid: derivedValid.length },
      selection: sel.diagnostics,
      visualizations: { kept: plan.items.length, dropped: plan.dropped },
    },
  };
}
