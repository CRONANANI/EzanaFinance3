/**
 * Positional agency palette for the Government Contracts charts.
 *
 * The chart renders at most 10 agency series at once; the 10 colors are bound to
 * SLOT INDEX (spend rank), not to agency identity. The top 10 agencies by spend
 * occupy slots 0-9; everything else folds into a single "Other" series.
 *
 * Build the slot map from the GLOBAL ranking, never from the filtered view.
 * Callers used to re-rank the selection and rebuild the map from it, which
 * meant selecting a single agency made it rank 0 of a one-item ranking and
 * repainted it slot 0's green — so the treemap disagreed with the rail pill
 * and the legend that had just shown that agency's real colour. A colour is a
 * property of the agency for a given dataset, not of what is on screen:
 * filtering changes which series show, never what colour they are.
 *
 * Caveat on distinctness: the slots are distinct TOKENS, but two of them can
 * resolve to the same paint. --info and --blue are both #3b82f6 in the light
 * theme, so slots 1 and 4 are indistinguishable there. Pre-existing, and worth
 * fixing by substituting a token rather than by re-ranking.
 *
 * All colors are existing theme tokens (light + dark aware); zero hardcoded
 * hex, zero new tokens.
 */
export const AGENCY_SLOT_COLORS = [
  'var(--positive)',
  'var(--info)',
  'var(--warning)',
  'var(--purple)',
  'var(--blue)',
  'var(--cyan)',
  'var(--indigo)',
  'var(--gold)',
  'var(--pink)',
  'var(--orange)',
];
export const OTHER_COLOR = 'var(--text-faint)';
export const OTHER_LABEL = 'Other';
export const MAX_SLOTS = AGENCY_SLOT_COLORS.length; // 10

/**
 * Rank agencies by spend desc and bind the top MAX_SLOTS to slot colors.
 * @param {Array<{agency:string,total:number}>} agencyTotals
 * @returns {Map<string,string>} agency → color token (top 10 only)
 */
export function buildSlotMap(agencyTotals) {
  const map = new Map();
  [...(agencyTotals || [])]
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_SLOTS)
    .forEach((a, i) => map.set(a.agency, AGENCY_SLOT_COLORS[i]));
  return map;
}

/** Slot color for an agency, or OTHER_COLOR when it's outside the top 10. */
export function colorForAgency(slotMap, agency) {
  return (slotMap && slotMap.get(agency)) || OTHER_COLOR;
}
