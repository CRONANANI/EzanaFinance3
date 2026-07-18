/**
 * Positional agency palette for the Government Contracts charts.
 *
 * The chart renders at most 10 agency series at once; the 10 colors are bound to
 * SLOT INDEX (spend rank), not to agency identity. The top 10 agencies by spend
 * for the current view occupy slots 0-9; everything else folds into a single
 * "Other" series. When the user filters, the selected agencies are re-ranked and
 * re-assigned slots — so an agency's color can change between views, but no two
 * VISIBLE series ever share a color. All colors are existing theme tokens
 * (light + dark aware); zero hardcoded hex, zero new tokens.
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
