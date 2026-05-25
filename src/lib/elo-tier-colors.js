/**
 * Canonical ELO tier colors + labels for the entire platform.
 */

export const TIER_COLORS = {
  novice: '#94a3b8',
  apprentice: '#60a5fa',
  strategist: '#a78bfa',
  tactician: '#10b981',
  master: '#f59e0b',
  grandmaster: '#D4AF37',
};

export const TIER_LABELS = {
  all: 'All Tiers',
  novice: 'Novice',
  apprentice: 'Apprentice',
  strategist: 'Strategist',
  tactician: 'Tactician',
  master: 'Master',
  grandmaster: 'Grandmaster',
};

/** @param {string} tier @returns {string} */
export function getTierColor(tier) {
  return TIER_COLORS[tier] || TIER_COLORS.novice;
}

/** @param {string} tier @returns {string} */
export function getTierLabel(tier) {
  return TIER_LABELS[tier] || 'Novice';
}

/** @param {string} tier @returns {string} */
export function getTierColorTint(tier) {
  const hex = getTierColor(tier);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.15)`;
}
