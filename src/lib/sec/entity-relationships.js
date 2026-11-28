/**
 * Verified corporate relationships (Sonar 6.5.2, Nov 28 2026): the model and validation for
 * parent/subsidiary attribution of federal awards. The table is prepared, not applied
 * (docs/sql/sonar-6-5-2/SQL_04); until it exists no relationship is loaded and group-scope
 * obligations stay unavailable in screens.
 *
 * Rules:
 *   - a similar name is never evidence of ownership;
 *   - a relationship holds only between its effective dates;
 *   - only status 'verified' with a source document joins an award to a parent;
 *   - identifiers are typed (cik, uei, lei, duns); a name alone is not an identifier.
 * Pure. Unit-tested in scripts/check-sonar-6-5-2.mjs.
 */

export const IDENTIFIER_TYPES = Object.freeze(['cik', 'uei', 'lei', 'duns']);
export const RELATIONSHIP_KINDS = Object.freeze([
  'subsidiary',
  'parent',
  'affiliate',
  'predecessor',
]);
export const STATUSES = Object.freeze(['verified', 'unverified', 'rejected']);
/* Evidence classes, strongest first. A source parent field (USAspending parent UEI) is
   recorded as evidence but is not on its own a verification. */
export const EVIDENCE = Object.freeze([
  'filed_exhibit',
  'registry_record',
  'manual_review',
  'source_parent_field',
]);
const VERIFYING = new Set(['filed_exhibit', 'registry_record', 'manual_review']);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** -> problems: string[] (empty when valid) */
export function validateRelationship(r) {
  const p = [];
  if (!r?.parent?.cik || !/^\d{1,10}$/.test(String(r.parent.cik)))
    p.push('parent CIK missing or invalid');
  if (!IDENTIFIER_TYPES.includes(r?.child?.identifierType))
    p.push('child identifier type missing or unknown');
  if (!r?.child?.identifier) p.push('child identifier missing');
  if (!RELATIONSHIP_KINDS.includes(r?.type)) p.push('relationship type unknown');
  if (!STATUSES.includes(r?.status)) p.push('status unknown');
  if (!EVIDENCE.includes(r?.evidence)) p.push('evidence class unknown');
  if (r?.effectiveFrom && !DATE.test(r.effectiveFrom)) p.push('effectiveFrom invalid');
  if (r?.effectiveTo && !DATE.test(r.effectiveTo)) p.push('effectiveTo invalid');
  if (r?.effectiveFrom && r?.effectiveTo && r.effectiveFrom > r.effectiveTo)
    p.push('effective period inverted');
  if (r?.status === 'verified' && !r?.source?.reference)
    p.push('a verified relationship needs a source reference');
  if (r?.status === 'verified' && !VERIFYING.has(r?.evidence))
    p.push(`evidence "${r?.evidence}" cannot verify a relationship on its own`);
  return p;
}

/** Whether a relationship is in effect on a date. */
export function activeAt(r, date) {
  const d = String(date || '').slice(0, 10);
  if (!DATE.test(d)) return false;
  return (!r.effectiveFrom || d >= r.effectiveFrom) && (!r.effectiveTo || d <= r.effectiveTo);
}

/**
 * Valid, verified relationships in the shape execution/entities.js attributeAward reads
 * ({ child: { uei | cik }, parentCik, verified, source, effectiveFrom, effectiveTo }).
 * Invalid or unverified rows are returned separately with their problems, never used.
 */
export function toAttributionRelations(rows = []) {
  const relations = [];
  const rejected = [];
  for (const r of rows || []) {
    const problems = validateRelationship(r);
    if (problems.length || r.status !== 'verified') {
      rejected.push({ r, problems: problems.length ? problems : [`status ${r.status}`] });
      continue;
    }
    relations.push({
      child: { [r.child.identifierType]: r.child.identifier },
      parentCik: String(r.parent.cik),
      type: r.type,
      verified: true,
      source: r.source.reference,
      effectiveFrom: r.effectiveFrom || null,
      effectiveTo: r.effectiveTo || null,
    });
  }
  return { relations, rejected };
}
