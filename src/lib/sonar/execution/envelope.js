/**
 * Sonar 6.5: the common result envelope for every analytical step (Nov 28 2026).
 *
 * A step's outcome must keep apart five things that 6.4 could blur:
 *   1. the step ran and no company qualified          status complete, entitySet []
 *   2. the source holds no data for the question      status unavailable (data_absent)
 *   3. the query failed                               status provider_error
 *   4. some companies were not evaluated              status partial or bounded
 *   5. the reader may not use the dataset             status permission_denied
 *
 * Capability-specific fields live under `data`; the envelope is what downstream steps and
 * the fulfillment check read. Pure, no imports beyond the stage id helper; frozen results.
 */
import { securityId } from '../composer/stages.js';

export const STEP_STATUSES = [
  'complete',
  'complete_with_missing_data',
  'partial',
  'bounded',
  'unsupported',
  'unavailable',
  'provider_error',
  'permission_denied',
  'skipped_dependency',
  'cancelled',
];

/** Statuses whose entity set may be consumed downstream. */
export const USABLE = new Set(['complete', 'complete_with_missing_data', 'partial', 'bounded']);

/** Statuses that are failures of execution, not findings about companies. */
export const NOT_EXECUTED = new Set([
  'unsupported',
  'unavailable',
  'provider_error',
  'permission_denied',
  'skipped_dependency',
  'cancelled',
]);

/** An entity in a step's set, with its canonical id. */
export function entity({
  ticker = null,
  cik = null,
  cusip = null,
  name = null,
  value = null,
  verdict = null,
  basis = null,
}) {
  const id = securityId({ cik, cusip, ticker });
  if (!id) throw new Error('entity: a ticker, CIK or CUSIP is required');
  const v = value == null || value === '' ? null : Number(value);
  return {
    securityId: id,
    ticker: ticker ? String(ticker).toUpperCase() : null,
    cik: cik == null ? null : String(cik),
    name: name || null,
    value: Number.isFinite(v) ? v : null,
    verdict,
    basis,
  };
}

/**
 * A validated, frozen step result.
 * @param {object} r
 *   stepId, operation, status, entitySet, metrics, reportingPeriod, sources, coverage,
 *   limitations, provenance, reason, data
 */
export function stepResult(r) {
  if (!r?.stepId) throw new Error('stepResult: stepId is required');
  if (!STEP_STATUSES.includes(r.status)) throw new Error(`stepResult: bad status ${r.status}`);
  if (!USABLE.has(r.status) && !r.reason)
    throw new Error(`stepResult: a ${r.status} step needs a reason`);
  if (USABLE.has(r.status) && !(r.sources || []).length && r.operation !== 'combine')
    throw new Error('stepResult: a usable step needs source lineage');
  const seen = new Set();
  const set = [];
  for (const e of r.entitySet || []) {
    if (!e?.securityId) throw new Error('stepResult: entities must come from entity()');
    if (seen.has(e.securityId)) continue;
    seen.add(e.securityId);
    set.push(Object.freeze({ ...e }));
  }
  return Object.freeze({
    stepId: r.stepId,
    operation: r.operation || null,
    status: r.status,
    entitySet: Object.freeze(set),
    metrics: Object.freeze([...(r.metrics || [])]),
    reportingPeriod: r.reportingPeriod || null,
    sources: Object.freeze([...(r.sources || [])]),
    coverage: Object.freeze({
      requested: r.coverage?.requested ?? set.length,
      evaluated: r.coverage?.evaluated ?? set.length,
      withData: r.coverage?.withData ?? set.filter((e) => e.value != null).length,
      unchecked: r.coverage?.unchecked ?? 0,
    }),
    limitations: Object.freeze([...(r.limitations || [])]),
    provenance: r.provenance || null,
    reason: r.reason || null,
    data: r.data ?? null,
  });
}

/** Shorthand for a step that did not execute. */
export const notExecuted = (stepId, status, reason, extra = {}) =>
  stepResult({ stepId, status, reason, ...extra });

/**
 * The research outcome of a step, in words the report and the writer can use without
 * confusing "nothing qualified" with "nothing was checked".
 */
export function outcomeOf(step) {
  if (!step) return 'not_executed';
  if (step.status === 'permission_denied') return 'no_access';
  if (step.status === 'provider_error') return 'query_failed';
  if (step.status === 'unavailable') return 'no_data';
  if (step.status === 'unsupported') return 'unsupported';
  if (step.status === 'skipped_dependency' || step.status === 'cancelled') return 'not_executed';
  if (step.status === 'bounded' || step.status === 'partial' || step.coverage.unchecked > 0)
    return 'partially_evaluated';
  return step.entitySet.length ? 'qualified' : 'none_qualified';
}
