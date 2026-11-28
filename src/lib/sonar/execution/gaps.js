/**
 * Sonar 6.5: execution gap analysis and bounded recovery (Nov 28 2026).
 *
 * After each step, the analyzer asks what is missing and why, and classifies it:
 *   retrieval_omission, entity_resolution_failure, provider_unavailable, data_absent,
 *   entitlement_limitation, unsupported_calculation, stale_data, insufficient_history,
 *   temporal_mismatch, universe_narrowed
 * Recovery is deterministic and bounded: one attempt per step, only from an already
 * authorized source (a cached identifier map, a cached period, an alternate approved
 * identifier, a re-filter of a dataset already loaded). Never a model call, never a retry of
 * a permanent 403, never a different dataset, never recursion.
 * Pure; unit-tested in scripts/check-sonar-6-5.mjs.
 */

export const GAP_KINDS = [
  'retrieval_omission',
  'entity_resolution_failure',
  'provider_unavailable',
  'data_absent',
  'entitlement_limitation',
  'unsupported_calculation',
  'stale_data',
  'insufficient_history',
  'temporal_mismatch',
  'universe_narrowed',
];

export const RECOVERIES = [
  'reuse_identifier_map',
  'cached_period',
  'alternate_identifier',
  'refilter_loaded',
];
export const MAX_RECOVERY_ATTEMPTS = 1;

/**
 * Gaps in one step.
 * @param step  stepResult envelope
 * @param ctx   { requested, resolved, staleDays, maxAgeDays, periodsNeeded, periodsFound, expectedUniverse }
 */
export function analyzeStep(step, ctx = {}) {
  const gaps = [];
  const add = (kind, detail) => gaps.push({ step: step?.stepId, kind, detail });
  if (!step)
    return [{ step: null, kind: 'retrieval_omission', detail: 'the step produced no result' }];
  if (step.status === 'permission_denied') add('entitlement_limitation', step.reason);
  if (step.status === 'provider_error') add('provider_unavailable', step.reason);
  if (step.status === 'unavailable') add('data_absent', step.reason);
  if (step.status === 'unsupported') add('unsupported_calculation', step.reason);
  if (ctx.requested != null && ctx.resolved != null && ctx.resolved < ctx.requested)
    add(
      'entity_resolution_failure',
      `${ctx.requested - ctx.resolved} of ${ctx.requested} identifiers did not resolve`,
    );
  if (ctx.periodsNeeded != null && (ctx.periodsFound ?? 0) < ctx.periodsNeeded)
    add(
      'insufficient_history',
      `${ctx.periodsFound ?? 0} of ${ctx.periodsNeeded} periods available`,
    );
  if (ctx.staleDays != null && ctx.maxAgeDays != null && ctx.staleDays > ctx.maxAgeDays)
    add('stale_data', `data is ${ctx.staleDays} days old (limit ${ctx.maxAgeDays})`);
  if (ctx.temporal && ctx.temporal.comparable === false)
    add('temporal_mismatch', ctx.temporal.reason);
  if (
    ctx.expectedUniverse != null &&
    step.coverage &&
    step.coverage.requested < ctx.expectedUniverse
  )
    add(
      'universe_narrowed',
      `asked about ${step.coverage.requested} of ${ctx.expectedUniverse} companies`,
    );
  if (
    step.coverage?.withData === 0 &&
    step.coverage.requested > 0 &&
    step.status !== 'provider_error'
  )
    add('data_absent', `none of ${step.coverage.requested} companies had the data`);
  return gaps;
}

/**
 * Whether a gap may be recovered, and how. -> { recover: boolean, via?, reason }
 */
export function recoveryPolicy(gap, { attempts = 0, httpStatus = null, available = [] } = {}) {
  if (attempts >= MAX_RECOVERY_ATTEMPTS)
    return { recover: false, reason: 'recovery already attempted for this step' };
  if (httpStatus === 403 || httpStatus === 401 || gap.kind === 'entitlement_limitation')
    return {
      recover: false,
      reason: 'a permission refusal is permanent for this run; not retried',
    };
  if (gap.kind === 'unsupported_calculation')
    return { recover: false, reason: 'not computed; no substitute dataset is used' };
  const via =
    gap.kind === 'entity_resolution_failure'
      ? ['reuse_identifier_map', 'alternate_identifier'].find((v) => available.includes(v))
      : gap.kind === 'insufficient_history' || gap.kind === 'stale_data'
        ? available.includes('cached_period') && 'cached_period'
        : gap.kind === 'universe_narrowed' || gap.kind === 'retrieval_omission'
          ? available.includes('refilter_loaded') && 'refilter_loaded'
          : null;
  return via
    ? { recover: true, via, reason: null }
    : { recover: false, reason: 'no authorized recovery source; returned as partial' };
}
