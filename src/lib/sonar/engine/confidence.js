/**
 * Sonar 6.2: research confidence, audited (Nov 28 2026).
 *
 * The writer states a confidence; it is a claim, not a measurement. A report keeps "high"
 * only when the evidence and the calculations back it: the required calculated outputs
 * complete, cited claims with support, a written answer that finished (not truncated, not
 * the deterministic fallback), enough selected evidence and a passing audit. Otherwise
 * the level is lowered and the reasons are recorded. Confidence is never raised here.
 *
 * Pure: no I/O.
 */

const ORDER = { low: 0, medium: 1, high: 2 };
const LEVELS = ['low', 'medium', 'high'];

export const CONFIDENCE_RULES = {
  highMinCitationCoverage: 0.8,
  highMinClaimSupport: 0.8,
  highMinEvidence: 3,
  highMinAuditPass: 0.8,
  mediumMinCitationCoverage: 0.5,
  mediumMinClaimSupport: 0.5,
};

/**
 * @param {object} p
 * @param {'high'|'medium'|'low'} p.claimed        the writer's (or fallback's) level
 * @param {boolean} [p.deterministic]               the report was built without the writer
 * @param {boolean} [p.writerTruncated]
 * @param {number|null} [p.citationCoverage]        cited findings with evidence or metrics
 * @param {number|null} [p.claimSupportRate]        claims kept after validation
 * @param {number} [p.evidenceCount]                evidence items selected
 * @param {{passed:number,total:number}|null} [p.audit]
 * @param {string|null} [p.fulfillmentState]        composition contract state (null: none)
 * @returns {{ level: string, claimed: string, capped: boolean, reasons: string[] }}
 */
export function auditConfidence({
  claimed = 'medium',
  deterministic = false,
  writerTruncated = false,
  citationCoverage = null,
  claimSupportRate = null,
  evidenceCount = 0,
  audit = null,
  fulfillmentState = null,
} = {}) {
  const R = CONFIDENCE_RULES;
  const start = ORDER[claimed] != null ? claimed : 'medium';
  let cap = 2;
  const reasons = [];
  const lower = (to, why) => {
    if (to < cap) cap = to;
    reasons.push(why);
  };
  if (deterministic)
    lower(1, 'The written analysis did not complete; the report shows calculated results only.');
  if (writerTruncated) lower(1, 'The written analysis was cut at its length budget.');
  if (fulfillmentState === 'failed') lower(0, 'The required calculations did not run.');
  else if (fulfillmentState && fulfillmentState !== 'complete')
    lower(1, 'Some required calculated outputs are missing.');
  if (citationCoverage != null) {
    if (citationCoverage < R.mediumMinCitationCoverage)
      lower(0, 'Fewer than half of the findings cite evidence or a calculated metric.');
    else if (citationCoverage < R.highMinCitationCoverage)
      lower(1, 'Not every finding cites evidence or a calculated metric.');
  }
  if (claimSupportRate != null && claimSupportRate < R.mediumMinClaimSupport)
    lower(0, 'Validation removed or downgraded most of the written claims.');
  else if (claimSupportRate != null && claimSupportRate < R.highMinClaimSupport)
    lower(1, 'Validation removed or downgraded unsupported claims.');
  if (evidenceCount < R.highMinEvidence)
    lower(1, 'Too little evidence was selected for high confidence.');
  if (audit?.total && audit.passed / audit.total < R.highMinAuditPass)
    lower(1, 'The methodology audit did not pass enough checks.');
  const level = LEVELS[Math.min(ORDER[start], cap)];
  return {
    level,
    claimed: start,
    capped: level !== start,
    reasons: level !== start ? reasons : [],
  };
}
