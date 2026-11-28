/**
 * Sonar 6.5: structured synthesis input and execution telemetry (Nov 28 2026).
 *
 * writerInput() hands the existing writer (production models unchanged) what execution
 * actually established, in classes it cannot blur:
 *   facts          direct source facts with their records
 *   calculations   deterministic results with inputs, period, formula and version
 *   qualified      companies that passed every condition
 *   failed         companies that failed a condition, and which
 *   unknown        companies a condition could not evaluate, and why
 *   unavailable    datasets or conditions that did not execute
 *   objective      the per-requirement fulfillment
 * plus the rule the writer must follow: no completed analysis where execution failed, no
 * relationship as proof because several datasets were cited.
 *
 * telemetry() counts what ran, with no private content and no organization identifiers.
 * Pure; unit-tested in scripts/check-sonar-6-5.mjs.
 */

export const CLAIM_CLASSES = [
  'source_fact',
  'calculation',
  'interpretation',
  'hypothesis',
  'unsupported',
];

export function writerInput({ screen, objective, relationships = [] }) {
  const r = screen?.conditionReport;
  const unavailable = (screen?.steps || [])
    .filter(
      (s) => !['complete', 'complete_with_missing_data', 'partial', 'bounded'].includes(s.status),
    )
    .map((s) => ({ step: s.stepId, status: s.status, reason: s.reason }));
  const rows = (objective?.requirements || []).map(
    (q) => `- ${q.label}: ${q.status}${q.reason ? ` (${q.reason})` : ''}`,
  );
  return {
    qualified: (r?.passing || []).map((m) => m.ticker),
    failed: (r?.failing || []).map((m) => ({
      ticker: m.ticker,
      failed: Object.entries(m.cells)
        .filter(([, v]) => v === 'fail')
        .map(([k]) => k),
    })),
    unknown: (r?.unknown || []).map((m) => ({
      ticker: m.ticker,
      unknown: Object.entries(m.reasons),
    })),
    unavailable,
    relationships: relationships.filter((x) => x?.kind !== 'interpretive'),
    objective,
    block: [
      `Objective: ${objective?.objectiveStatus || 'unknown'}.`,
      ...rows,
      r
        ? `Passed every condition: ${r.passing.map((m) => m.ticker).join(', ') || 'none'}. Unknown (not evaluated on at least one condition): ${r.unknown.map((m) => m.ticker).join(', ') || 'none'}.`
        : null,
      'Rules: report a condition that was not executed as not executed; do not describe unknown companies as failing; datasets observed together are co-occurrence, not cause.',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

/** Classify a claim by what supports it. */
export function classifyClaim({ cites = [], calcIds = [], hedged = false } = {}) {
  if (calcIds.length) return 'calculation';
  if (cites.length && !hedged) return 'source_fact';
  if (cites.length && hedged) return 'interpretation';
  if (hedged) return 'hypothesis';
  return 'unsupported';
}

/** Execution telemetry: counts and statuses only. */
export function telemetry({
  planType,
  required = [],
  steps = [],
  objective = null,
  durationMs = null,
  providerRequests = 0,
  cacheHits = 0,
  outcome = null,
  universe = null,
  entityResolutionFailures = 0,
  crossDatasetJoins = null,
  planGenerated = true,
  dataQuality = null,
}) {
  const by = (st) => steps.filter((s) => s.status === st).length;
  const reqs = objective?.requirements || [];
  return {
    planType,
    requiredDatasets: [...new Set(required)],
    executedDatasets: [
      ...new Set(
        steps
          .filter((s) =>
            ['complete', 'complete_with_missing_data', 'partial', 'bounded'].includes(s.status),
          )
          .map((s) => s.source)
          .filter(Boolean),
      ),
    ],
    steps: steps.length,
    dependencyFailures: by('skipped_dependency'),
    providerErrors: by('provider_error'),
    permissionDenied: by('permission_denied'),
    objective: objective?.objectiveStatus || null,
    unsupported: reqs.filter((q) => q.status === 'unsupported').length,
    /* Sonar 6.5.1: aggregate counts only (no tickers, no research text, no org ids). */
    planGenerated: Boolean(planGenerated),
    executedRequirements: reqs.filter(
      (q) => q.status === 'satisfied' || q.status === 'partially_satisfied',
    ).length,
    unknownConditions: outcome?.unknown ?? null,
    uncheckedUniverse: universe?.unchecked ?? outcome?.unchecked ?? null,
    bounded: (universe?.coverageStatus || outcome?.status) === 'bounded',
    entityResolutionFailures,
    crossDatasetJoins: crossDatasetJoins ?? Math.max(0, new Set(required).size - 1),
    objectiveComplete: objective?.objectiveStatus === 'complete',
    /* Sonar 6.5.2: aggregate data-quality counts (numbers only). */
    dataQuality: dataQuality
      ? Object.fromEntries(Object.entries(dataQuality).map(([k, v]) => [k, Number(v) || 0]))
      : null,
    durationMs,
    providerRequests,
    cacheHits,
  };
}

/**
 * Internal category for a failed research attempt (Sonar 6.5.1). Provider internals are
 * reduced to a category; the user sees the category's plain message, never the raw error.
 */
export const FAILURE_CATEGORIES = Object.freeze({
  provider_entitlement: 'A data provider refused the request (plan or entitlement).',
  dataset_unavailable: 'A required dataset could not be read.',
  timeout: 'The research ran out of time before every step finished.',
  dependency_failure: 'A step could not run because a step it depends on failed.',
  invalid_output: 'The research produced an output that failed validation.',
  unexpected: 'An unexpected application error stopped the research.',
});

export function failureCategory(e) {
  const status = e?.status ?? e?.httpStatus ?? null;
  const msg = String(e?.message || e?.reason || e || '');
  if (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    e?.entitlement ||
    /billing|credit balance|quota|entitle|forbidden|permission denied|payment required/i.test(msg)
  )
    return 'provider_entitlement';
  if (e?.status === 'cancelled' || /timed? ?out|deadline|abort/i.test(msg)) return 'timeout';
  if (e?.status === 'skipped_dependency' || /depends on|skipped_dependency/i.test(msg))
    return 'dependency_failure';
  if (
    /could not be read|does not exist|relation .* does not exist|unavailable|ECONN|fetch failed|provider_error/i.test(
      msg,
    ) ||
    e?.status === 'provider_error' ||
    e?.status === 'unavailable'
  )
    return 'dataset_unavailable';
  if (/invalid|validation|schema|parse/i.test(msg)) return 'invalid_output';
  return 'unexpected';
}
