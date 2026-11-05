/**
 * Sonar research modes (Nov 2026): how much research a question warrants.
 *
 *   quick     a lookup, a single fact, one record set. The quick ping.
 *   standard  focused analysis: a trend, a ranking or comparison within one
 *             or two datasets, a single exposure question. The research
 *             engine at standard depth, run automatically.
 *   deep      an assignment that needs coordinated evidence across several
 *             datasets, a horizon, relationships or a defensible conclusion.
 *             Offered; the visitor chooses.
 *
 * The scoring, triggers and borderline band live in research-mode-core.js.
 * This module adds the coverage check: the planner runs on a lightweight
 * resolution (deterministic entities, no database) so the classification
 * uses the planned work, and a standard plan that would drop evidence the
 * question asks for offers deep instead. It also estimates from that plan.
 *
 * Pure: no model, no network, no database. Unit-tested in
 * scripts/check-sonar-research-mode.mjs.
 */
import {
  classifyCore,
  liteResolution,
  estimateFromPlan,
  FAMILIES,
  FAMILY_SOURCES,
} from '@/lib/sonar/research-mode-core';
import { buildResearchSpec } from '@/lib/sonar/engine/research-spec';
import { planResearch } from '@/lib/sonar/engine/planner';

export * from '@/lib/sonar/research-mode-core';

/** The coverage check, given the core's working values. Pure. */
export function planCoverage({
  u,
  t,
  now,
  companies,
  mode,
  confidence,
  angles,
  opIds,
  explicit,
  families,
}) {
  const lite = liteResolution(u, companies);
  const preview = { mode, confidence, angles, operations: opIds };
  const specAt = (depth) =>
    buildResearchSpec(u, { query: t, resolution: lite, depth, now, classification: preview });
  const stdSpec = specAt('standard');
  const stdPlan = planResearch(stdSpec, lite, { depth: 'standard' });
  const kept = new Set(stdPlan.tasks.map((x) => x.source));
  const capped = new Set(
    stdPlan.excluded.filter((x) => x.reason === 'depth_cap').map((x) => x.source),
  );
  const dropped = explicit.filter(
    (f) =>
      !FAMILY_SOURCES[f].some((s) => kept.has(s)) && FAMILY_SOURCES[f].some((s) => capped.has(s)),
  );
  const plannedWork = {
    tasks: stdPlan.tasks.length,
    families: families.length,
    droppedAtStandard: dropped.map((f) => FAMILIES[f].label),
  };
  const escalate = mode === 'standard' && dropped.length > 0;
  const finalMode = escalate ? 'deep' : mode;
  if (finalMode === 'deep') {
    const deepSpec = specAt('deep');
    const deepPlan = planResearch(deepSpec, lite, { depth: 'deep' });
    plannedWork.tasks = deepPlan.tasks.length;
    return {
      plannedWork,
      escalate,
      format: deepSpec.format,
      estimate: estimateFromPlan('deep', {
        tasks: deepPlan.tasks.length,
        memo: deepSpec.format === 'investment_memo',
      }),
    };
  }
  if (finalMode === 'standard') {
    return {
      plannedWork,
      escalate,
      format: stdSpec.format,
      estimate: estimateFromPlan('standard', { tasks: stdPlan.tasks.length }),
    };
  }
  return { plannedWork, escalate, format: 'report', estimate: estimateFromPlan('quick') };
}

/**
 * @param {string} query
 * @param {{ understood?: object, now?: Date, coverage?: boolean }} [opts]
 *   coverage: false skips the planner coverage check.
 */
export function classifyResearchMode(
  query,
  { understood = null, now = new Date(), coverage = true } = {},
) {
  return classifyCore(query, {
    understood,
    now,
    coverage: coverage === false ? null : planCoverage,
  });
}

export default classifyResearchMode;
