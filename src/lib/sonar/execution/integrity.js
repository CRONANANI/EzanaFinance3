/**
 * Numerical integrity rules for research measures (Sonar 6.5.2, Nov 28 2026).
 *
 * A lightweight check applied to a measure result before it reaches a table or the writer.
 * Not an execution framework: it only answers "does this figure say what it claims?". A
 * result that fails is withheld (value null, reason) and counted; it is never "fixed".
 * Interfaces are plain objects so 6.6 valuation and forecasting results can use the same
 * checks.
 *
 * Result shape checked (fields optional unless a rule needs them):
 *   { metric, methodologyVersion, measureKind: 'period_flow' | 'award_start_cohort_cumulative'
 *     | 'point_in_time' | 'ratio', value | exposureRatio, period | contractPeriod,
 *     numerator: { value, definition, period }, denominator: { value, definition, period },
 *     currency, company: { cik | ticker }, ticker, sources: [], missing: [], synthetic }
 */

const has = (v) => v !== null && v !== undefined && v !== '';

/** -> { ok, violations: [{ rule, detail }] } */
export function checkMeasure(r, { asOf = null } = {}) {
  const v = [];
  const add = (rule, detail) => v.push({ rule, detail });
  const value = r?.exposureRatio !== undefined ? r.exposureRatio : r?.value;
  const period = r?.contractPeriod || r?.period || r?.numerator?.period || null;
  /* Temporal. */
  if (!period?.to && !period?.end) add('temporal.period_defined', 'no reporting period');
  if (asOf && period?.to && period.to > asOf)
    add('temporal.no_future', `period ends ${period.to}, after ${asOf}`);
  if (
    r?.measureKind === 'award_start_cohort_cumulative' &&
    /flow|incurred|during the period/i.test(String(r?.label || ''))
  )
    add('temporal.cumulative_not_flow', 'a cumulative cohort amount is labelled as a period flow');
  if (
    r?.measureKind === 'period_flow' &&
    r?.methodologyVersion &&
    !/flow/.test(r.methodologyVersion)
  )
    add('temporal.cumulative_not_flow', `period flow computed by ${r.methodologyVersion}`);
  /* Entity. */
  if (!r?.ticker && !r?.company?.cik && !r?.company?.ticker)
    add('entity.identified', 'no company or security');
  /* Numerical. */
  if (has(value)) {
    if (!Number.isFinite(Number(value))) add('numeric.finite', 'value is not a finite number');
    if ((r?.missing || []).length)
      add('numeric.missing_not_zero', `value present with missing inputs: ${r.missing.join(', ')}`);
    if (r?.measureKind === 'ratio' || r?.numerator || r?.denominator) {
      if (!has(r?.numerator?.value) || !has(r?.denominator?.value))
        add('numeric.ratio_terms', 'a ratio must keep its numerator and denominator');
      else if (!(Number(r.denominator.value) > 0))
        add('numeric.denominator', 'denominator is not positive');
      else if (
        Math.abs(Number(r.numerator.value) / Number(r.denominator.value) - Number(value)) >
        1e-9 * Math.max(1, Math.abs(Number(value)))
      )
        add('numeric.ratio_consistent', 'value does not equal numerator / denominator');
    }
    if (r?.currency && r?.denominator?.currency && r.currency !== r.denominator.currency)
      add('numeric.currency', `${r.currency} over ${r.denominator.currency}`);
  }
  /* Source. */
  if (has(value) && !(r?.sources || []).length)
    add('source.lineage', 'a figure without source lineage');
  if (has(value) && !r?.methodologyVersion && r?.metric)
    add('source.methodology_version', 'no methodology version');
  if (r?.synthetic) add('source.not_synthetic', 'synthetic data presented as evidence');
  return { ok: v.length === 0, violations: v };
}

/** Withhold a failing result: value null, reason, violations attached. */
export function enforce(r, opts) {
  const c = checkMeasure(r, opts);
  if (c.ok) return { ...r, integrity: { ok: true, violations: [] } };
  const out = { ...r, integrity: c };
  if (out.exposureRatio !== undefined) out.exposureRatio = null;
  else if (out.value !== undefined) out.value = null;
  out.reason = `integrity: ${c.violations.map((x) => x.rule).join(', ')}`;
  out.coverage = 'unavailable';
  return out;
}

/**
 * The state a research result is in, for the writer and the renderer (Sonar 6.5.2):
 * complete | complete_with_missing_data | partial_coverage | unsupported_measure |
 * provider_unavailable | failed_calculation.
 */
export function researchState({
  steps = [],
  outcome = null,
  objective = null,
  integrityViolations = 0,
} = {}) {
  if (integrityViolations > 0 && !(outcome?.passing > 0)) return 'failed_calculation';
  if (
    steps.some(
      (s) =>
        s.status === 'provider_error' ||
        s.status === 'permission_denied' ||
        s.status === 'unavailable',
    )
  )
    return 'provider_unavailable';
  if ((objective?.requirements || []).some((q) => q.status === 'unsupported'))
    return 'unsupported_measure';
  if (outcome?.status === 'bounded' || outcome?.unchecked > 0 || outcome?.status === 'partial')
    return 'partial_coverage';
  if (outcome?.unknown > 0 || outcome?.status === 'complete_with_missing_data')
    return 'complete_with_missing_data';
  return 'complete';
}
