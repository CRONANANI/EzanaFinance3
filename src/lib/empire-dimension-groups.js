/**
 * Shared Empire-Rankings dimension taxonomy — the single source of truth for the
 * Dalio power-dimension groupings, their display order, and the UI-label → stored
 * dimension-id bridge. Extracted from the empire-ranking dashboard page so the
 * public OECD explorer's "empire dimensions" mode reuses the exact same grouping
 * (Part B of the OECD explorer phase-4 spec). The dashboard imports
 * `DIMENSION_GROUPS` from here unchanged — behaviour is byte-identical.
 */

/* Dimension subsets for the radar Focus control — 18 dims is too noisy to scan
 * when the user only cares about (say) economic factors, so we let them focus.
 * Keys are UI display names (see POWER_DIMENSIONS); `all` = no filter. */
export const DIMENSION_GROUPS = {
  all: null,
  economic: new Set([
    'Debt Burden',
    'Expected Growth',
    'Economic Output',
    'Markets & Financial Center',
    'Reserve Currency Status',
    'Trade',
    'Cost Competitiveness',
  ]),
  military: new Set([
    'Military Strength',
    'Geology',
    'Resource Efficiency',
    'Internal Conflict',
    'Infrastructure',
  ]),
  social: new Set([
    'Education',
    'Innovation & Technology',
    'Character & Civility',
    'Rule of Law',
    'Wealth Gaps',
    'Acts of Nature',
  ]),
};

export const DIMENSION_OPTIONS = [
  { value: 'all', label: 'All 18' },
  { value: 'economic', label: 'Economic' },
  { value: 'military', label: 'Military' },
  { value: 'social', label: 'Social' },
];

/* Canonical UI order for the 18 power dimensions. */
export const POWER_DIMENSIONS = [
  'Debt Burden',
  'Expected Growth',
  'Internal Conflict',
  'Education',
  'Innovation & Technology',
  'Cost Competitiveness',
  'Military Strength',
  'Trade',
  'Economic Output',
  'Markets & Financial Center',
  'Reserve Currency Status',
  'Geology',
  'Resource Efficiency',
  'Infrastructure',
  'Character & Civility',
  'Rule of Law',
  'Wealth Gaps',
  'Acts of Nature',
];

/* UI display label → canonical dimension id stored in `empire_dimensions`. */
export const UI_DIMENSION_TO_ID = {
  'Debt Burden': 'debt_burden',
  'Expected Growth': 'expected_growth',
  'Internal Conflict': 'internal_conflict',
  Education: 'education',
  'Innovation & Technology': 'innovation_technology',
  'Cost Competitiveness': 'cost_competition',
  'Military Strength': 'military_strength',
  Trade: 'trade',
  'Economic Output': 'economic_output',
  'Markets & Financial Center': 'markets_financial_center',
  'Reserve Currency Status': 'reserve_currency',
  Geology: 'geology',
  'Resource Efficiency': 'resource_efficiency',
  Infrastructure: 'infrastructure',
  'Character & Civility': 'character_social_contracts',
  'Rule of Law': 'rule_of_law',
  'Wealth Gaps': 'wealth_gaps',
  'Acts of Nature': 'acts_of_nature',
};

/** Focus-group id → the set of stored dimension ids it contains (null = all). */
export function dimensionIdsForFocus(focus) {
  const set = DIMENSION_GROUPS[focus];
  if (!set) return null;
  const ids = new Set();
  for (const name of set) {
    const id = UI_DIMENSION_TO_ID[name];
    if (id) ids.add(id);
  }
  return ids;
}
