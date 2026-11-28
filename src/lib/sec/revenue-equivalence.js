/**
 * Revenue concept equivalence registry (Sonar 6.4 integration, Nov 28 2026). Pure.
 *
 * A PROPOSAL. Nothing in production reads it: revenueGrowth (composer/calc.js) still refuses
 * growth across two different XBRL revenue concepts. This module defines how a reviewed,
 * versioned equivalence would be expressed and checked, so it can be validated before any
 * calculation changes.
 *
 * Why not treat revenue tags as interchangeable: us-gaap:Revenues is total revenue (it can
 * include lease, interest and other non-contract income); RevenueFromContractWithCustomer*
 * is ASC 606 contract revenue only, a subset; ...IncludingAssessedTax is gross of excise
 * and sales taxes; RegulatedAndUnregulatedOperatingRevenue is a utility presentation. In
 * production (CY2024 to CY2025, 4,026 tickers with both years) 68 issuers switched between
 * Revenues and contract revenue, and only 29 of them moved by 25% or less: the switch
 * usually reflects a different measure, not a relabel.
 *
 * Equivalence is therefore never global. A pair is usable for one issuer only when that
 * issuer's own filing shows both concepts for the same period with the same value
 * (OVERLAP evidence), or when a reviewed registry entry says so for a stated context.
 */

export const REVENUE_EQUIVALENCE_VERSION = 'rev-equiv-v0-proposed';

/** Relative difference under which two tags for the same period are the same figure. */
export const OVERLAP_TOLERANCE = 0.005;

const C = {
  REV: 'us-gaap:Revenues',
  ASC606: 'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax',
  ASC606_GROSS: 'us-gaap:RevenueFromContractWithCustomerIncludingAssessedTax',
  SALES_NET: 'us-gaap:SalesRevenueNet',
  REGULATED: 'us-gaap:RegulatedAndUnregulatedOperatingRevenue',
};

/**
 * The registry. Every entry needs: source concepts, accounting definition, applicable
 * filing context, evidence rule, effective periods, review status, methodology, version.
 * status: 'never' (refuse always), 'issuer_overlap' (allowed per issuer with overlap
 * evidence), 'reviewed' (allowed in the stated context; none yet).
 */
export const REVENUE_EQUIVALENCES = Object.freeze([
  {
    id: 'sales-net-to-asc606',
    concepts: [C.SALES_NET, C.ASC606],
    definition:
      'SalesRevenueNet was deprecated with ASC 606 adoption (fiscal 2018-2019); filers moved net sales to contract revenue.',
    context: 'Annual periods spanning the issuer’s ASC 606 adoption year only',
    evidence: 'issuer_overlap',
    effective: { from: '2017-01-01', to: '2020-12-31' },
    status: 'issuer_overlap',
    methodology: 'Same issuer, same period, both tags within 0.5%; else not comparable.',
    version: REVENUE_EQUIVALENCE_VERSION,
  },
  {
    id: 'revenues-to-asc606',
    concepts: [C.REV, C.ASC606],
    definition:
      'Revenues is total revenue; contract revenue excludes leases, interest and other income. Equal only for issuers with no non-contract revenue.',
    context: 'Any period, issuer by issuer',
    evidence: 'issuer_overlap',
    effective: { from: null, to: null },
    status: 'issuer_overlap',
    methodology: 'Same issuer, same period, both tags within 0.5%; else not comparable.',
    version: REVENUE_EQUIVALENCE_VERSION,
  },
  {
    id: 'gross-vs-net-of-tax',
    concepts: [C.ASC606_GROSS, C.ASC606],
    definition: 'Gross of excise and sales taxes versus net of them: different measures.',
    context: 'Never',
    evidence: 'none',
    effective: { from: null, to: null },
    status: 'never',
    methodology: 'Refused. Report each year on its own basis.',
    version: REVENUE_EQUIVALENCE_VERSION,
  },
  {
    id: 'regulated-vs-total',
    concepts: [C.REGULATED, C.REV],
    definition: 'Utility operating revenue presentation versus total revenues.',
    context: 'Utilities, issuer by issuer',
    evidence: 'issuer_overlap',
    effective: { from: null, to: null },
    status: 'issuer_overlap',
    methodology: 'Same issuer, same period, both tags within 0.5%; else not comparable.',
    version: REVENUE_EQUIVALENCE_VERSION,
  },
]);

const pairKey = (a, b) => [a, b].sort().join('|');
const BY_PAIR = new Map(REVENUE_EQUIVALENCES.map((e) => [pairKey(...e.concepts), e]));

const inWindow = (end, eff) => (!eff?.from || end >= eff.from) && (!eff?.to || end <= eff.to);

/**
 * Can two annual revenue figures of ONE issuer be compared?
 * @param {{concept, end}} prev
 * @param {{concept, end}} cur
 * @param {{ overlap?: {period_end, values: Record<concept, number>}[] }} evidence
 *   same-issuer facts where both concepts were reported for one period (from companyfacts)
 * @returns {{ comparable: boolean, basis: string, entry: string|null }}
 */
export function assessRevenueComparability(prev, cur, { overlap = [] } = {}) {
  if (!prev?.concept || !cur?.concept)
    return { comparable: true, basis: 'concept not recorded (legacy rows)', entry: null };
  if (prev.concept === cur.concept) return { comparable: true, basis: 'same concept', entry: null };
  const e = BY_PAIR.get(pairKey(prev.concept, cur.concept));
  if (!e) return { comparable: false, basis: 'no registry entry for this pair', entry: null };
  if (e.status === 'never') return { comparable: false, basis: e.definition, entry: e.id };
  if (!inWindow(cur.end, e.effective) || !inWindow(prev.end, e.effective))
    return { comparable: false, basis: 'outside the entry’s effective periods', entry: e.id };
  if (e.status === 'reviewed') return { comparable: true, basis: e.methodology, entry: e.id };
  const proof = (overlap || []).find((o) => {
    const a = Number(o?.values?.[prev.concept]);
    const b = Number(o?.values?.[cur.concept]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return false;
    return Math.abs(a - b) / Math.max(a, b) <= OVERLAP_TOLERANCE;
  });
  return proof
    ? {
        comparable: true,
        basis: `issuer reported both tags for ${proof.period_end} with the same value`,
        entry: e.id,
      }
    : { comparable: false, basis: 'no same-period overlap showing both tags agree', entry: e.id };
}
