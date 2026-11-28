/**
 * Sonar 6.5: verified cross-dataset relationships (Nov 28 2026).
 *
 * A relationship is reported only with its evidence: the entities, the datasets, the exact
 * records, the type, the comparable periods, the metrics, the method, the limitations, and
 * whether it is observed, calculated or interpretive. Co-occurrence is never causation:
 * "award exposure and 13F managers both rose over the observed periods" is allowed;
 * "institutions bought because of the contracts" is not, unless separate evidence for the
 * mechanism is cited.
 * Pure; unit-tested in scripts/check-sonar-6-5.mjs.
 */
import { comparable } from './temporal.js';

export const RELATIONSHIP_TYPES = [
  'shared_entity',
  'parent_subsidiary',
  'temporal_co_occurrence',
  'ownership_change',
  'award_concentration',
  'financial_exposure',
  'sector_overlap',
  'portfolio_overlap',
  'correlation',
];
export const CLASSES = ['observed', 'calculated', 'interpretive'];

/**
 * Build a relationship, or refuse with the reasons.
 * r: { type, entities, datasets, records, periods: [p1, p2], metrics, method, limitations, kind }
 * -> { ok, relationship?, problems }
 */
export function relationship(r = {}) {
  const problems = [];
  if (!RELATIONSHIP_TYPES.includes(r.type)) problems.push(`unknown relationship type ${r.type}`);
  if (!(r.entities || []).length) problems.push('no entities');
  if ((r.datasets || []).length < 1) problems.push('no source datasets');
  if (!(r.records || []).length) problems.push('no source records');
  if (!CLASSES.includes(r.kind))
    problems.push('not classified as observed, calculated or interpretive');
  if (r.type === 'correlation' && !r.method)
    problems.push('a correlation needs its calculation method');
  let temporal = null;
  if (r.type === 'temporal_co_occurrence' || r.type === 'correlation') {
    const [a, b] = r.periods || [];
    temporal = comparable(a, b);
    if (!temporal.comparable) problems.push(`periods not comparable: ${temporal.reason}`);
  }
  if (problems.length) return { ok: false, problems };
  return {
    ok: true,
    problems: [],
    relationship: Object.freeze({
      type: r.type,
      entities: r.entities,
      datasets: r.datasets,
      records: r.records,
      periods: r.periods || [],
      metrics: r.metrics || [],
      method: r.method || null,
      limitations: r.limitations || [],
      kind: r.kind,
      temporal,
      quantitative: r.kind !== 'interpretive',
    }),
  };
}

/* Causal wording that co-occurring datasets cannot support on their own. */
const CAUSAL =
  /\b(because of|due to|driven by|caused|causes|led to|as a result of|in response to|thanks to|resulted in)\b/i;

/**
 * Whether a sentence claims causation between datasets without cited mechanism evidence.
 * -> { ok, reason }
 */
export function causalClaimCheck(sentence, { mechanismEvidence = [] } = {}) {
  if (!CAUSAL.test(String(sentence || ''))) return { ok: true, reason: null };
  if (mechanismEvidence.length) return { ok: true, reason: null };
  return {
    ok: false,
    reason: 'states causation that the cited datasets only show as co-occurrence',
  };
}

/** Only verified, non-interpretive relationships may feed a quantitative chart. */
export const chartable = (rels = []) => rels.filter((r) => r?.quantitative);
