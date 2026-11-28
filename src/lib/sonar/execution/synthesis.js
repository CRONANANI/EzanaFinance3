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
}) {
  const by = (st) => steps.filter((s) => s.status === st).length;
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
    unsupported: (objective?.requirements || []).filter((q) => q.status === 'unsupported').length,
    durationMs,
    providerRequests,
    cacheHits,
  };
}
