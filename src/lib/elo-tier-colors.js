/**
 * Canonical ELO tier palette + helpers for the entire platform.
 *
 * Each tier provides four colors:
 *   - ink:   body text on light bg, also chip border tone
 *   - base:  primary brand color for the tier (dots, avatars, accents)
 *   - soft:  tinted background (chips, highlighted rows)
 *   - ring:  mid-tone for borders and outer ring on avatars
 *
 * Plus the ELO range that maps to this tier.
 *
 * Sourced from the design package handoff at /handoff/design-tokens.ts.
 */

/**
 * @typedef {Object} Tier
 * @property {string} key
 * @property {string} label
 * @property {string} ink
 * @property {string} base
 * @property {string} soft
 * @property {string} ring
 * @property {number} min
 * @property {number} max
 */

/** @type {Record<string, Tier>} */
export const TIERS = {
  novice: {
    key: 'novice',
    label: 'Novice',
    ink: '#0f7d4e',
    base: '#16a34a',
    soft: '#dcfce7',
    ring: '#86efac',
    min: 0,
    max: 599,
  },
  apprentice: {
    key: 'apprentice',
    label: 'Apprentice',
    ink: '#075985',
    base: '#0284c7',
    soft: '#e0f2fe',
    ring: '#7dd3fc',
    min: 600,
    max: 1199,
  },
  strategist: {
    key: 'strategist',
    label: 'Strategist',
    ink: '#5b21b6',
    base: '#7c3aed',
    soft: '#ede9fe',
    ring: '#c4b5fd',
    min: 1200,
    max: 1799,
  },
  tactician: {
    key: 'tactician',
    label: 'Tactician',
    ink: '#9a3412',
    base: '#ea580c',
    soft: '#ffedd5',
    ring: '#fdba74',
    min: 1800,
    max: 2399,
  },
  master: {
    key: 'master',
    label: 'Master',
    ink: '#9d174d',
    base: '#db2777',
    soft: '#fce7f3',
    ring: '#f9a8d4',
    min: 2400,
    max: 2999,
  },
  grandmaster: {
    key: 'grandmaster',
    label: 'Grandmaster',
    ink: '#78350f',
    base: '#0f172a',
    soft: '#fef3c7',
    ring: '#fcd34d',
    min: 3000,
    max: 99999,
  },
};

export const TIER_LIST = [
  TIERS.novice,
  TIERS.apprentice,
  TIERS.strategist,
  TIERS.tactician,
  TIERS.master,
  TIERS.grandmaster,
];

export const TIER_COLORS = {
  novice: TIERS.novice.base,
  apprentice: TIERS.apprentice.base,
  strategist: TIERS.strategist.base,
  tactician: TIERS.tactician.base,
  master: TIERS.master.base,
  grandmaster: TIERS.grandmaster.base,
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

export function getTier(tierKey) {
  return TIERS[tierKey] || TIERS.novice;
}

export function getTierColor(tierKey) {
  return TIERS[tierKey]?.base || TIERS.novice.base;
}

export function getTierLabel(tierKey) {
  return TIER_LABELS[tierKey] || 'Novice';
}

export function tierForRating(rating) {
  return TIER_LIST.find((t) => rating >= t.min && rating <= t.max) ?? TIERS.novice;
}

export function getTierColorTint(tierKey) {
  const hex = getTierColor(tierKey);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.15)`;
}
