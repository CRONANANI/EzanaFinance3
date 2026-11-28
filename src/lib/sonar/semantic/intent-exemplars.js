/**
 * Sonar 6.0 (Nov 28 2026): versioned research-intent exemplars for candidate retrieval.
 *
 * Representative questions per typed intent, not a list of every wording: the embedding
 * stage only retrieves candidates, and the canonical intent's slots decide. Hard negatives
 * sit next to their positives on purpose (manager count vs value vs change vs percentage),
 * so a near neighbour of the wrong measure is visible in the margin check.
 */

export const INTENT_EXEMPLARS_VERSION = 'intent-ex-v1';

export const INTENT_EXEMPLARS = [
  {
    id: 'own-breadth-1',
    family: 'institutional_ownership',
    measure: 'breadth',
    text: 'Which of this member of Congress’s stocks are held by the most institutional investors?',
  },
  {
    id: 'own-breadth-2',
    family: 'institutional_ownership',
    measure: 'breadth',
    text: 'Rank a politician’s holdings by how many 13F managers own each stock.',
  },
  {
    id: 'own-breadth-3',
    family: 'institutional_ownership',
    measure: 'breadth',
    text: 'Which stocks in this portfolio are most widely held by hedge funds and asset managers?',
  },
  {
    id: 'own-value-1',
    family: 'institutional_ownership',
    measure: 'value',
    text: 'Which of these holdings have the most institutional money invested in them?',
  },
  {
    id: 'own-value-2',
    family: 'institutional_ownership',
    measure: 'value',
    text: 'Rank the portfolio by the total dollar value reported by 13F filers.',
  },
  {
    id: 'own-change-1',
    family: 'institutional_ownership',
    measure: 'change',
    text: 'Which of these stocks gained the most institutional holders last quarter?',
  },
  {
    id: 'own-change-2',
    family: 'institutional_ownership',
    measure: 'change',
    text: 'Where are funds adding or exiting positions among these holdings?',
  },
  {
    id: 'own-pct-1',
    family: 'institutional_ownership',
    measure: 'percentage',
    text: 'What percentage of each company’s shares do institutions own?',
  },
  {
    id: 'cong-overlap-1',
    family: 'congressional_overlap',
    text: 'Which of this member’s stocks are also held by other members of Congress?',
  },
  {
    id: 'fund-1',
    family: 'fundamental_analysis',
    text: 'How healthy are this company’s margins, growth and balance sheet?',
  },
  {
    id: 'dcf-1',
    family: 'dcf_valuation',
    text: 'What is the intrinsic value of this company on a discounted cash flow basis?',
  },
  {
    id: 'bt-1',
    family: 'backtest',
    text: 'How would copying a politician’s disclosed purchases have performed?',
  },
  {
    id: 'gov-dep-1',
    family: 'government_contract_dependency',
    text: 'How dependent is this company on US government revenue?',
  },
  { id: 'fx-1', family: 'currency_pressure', text: 'Is this country’s currency under pressure?' },
  { id: 'risk-1', family: 'growth_risk', text: 'What could slow this company’s growth?' },
];

/* Provisional (not yet calibrated against production embeddings): a candidate may fill an
   unstated ownership measure only above this similarity and this margin over the best
   candidate of another measure. Calibrate with scripts/check-sonar-semantic.mjs fixtures
   against the live embedder before lowering either. */
export const MEASURE_MIN_SCORE = 0.86;
export const MEASURE_MIN_MARGIN = 0.04;

/**
 * The ownership measure the candidates support, or null. Never consulted when the
 * question states its own measure (canonical-intent.js).
 * @param {{ id: string, family: string, measure?: string, score: number }[]|null} candidates
 */
export function semanticMeasure(candidates) {
  const own = (candidates || []).filter((c) => c.family === 'institutional_ownership' && c.measure);
  if (!own.length) return null;
  const top = own[0];
  const rival = own.find((c) => c.measure !== top.measure);
  if (top.score < MEASURE_MIN_SCORE) return null;
  if (rival && top.score - rival.score < MEASURE_MIN_MARGIN) return null;
  return { measure: top.measure, score: top.score, exemplarId: top.id };
}
