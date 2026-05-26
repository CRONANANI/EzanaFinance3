/**
 * Page-level + auxiliary tokens for the ELO Leaderboard redesign (v2).
 *
 * Visual direction: "Sweet Spot" — sleek fintech between Stripe's whitespace-led
 * calm and Bloomberg's data-density. Cool neutral surfaces, Inter for UI,
 * JetBrains Mono for numbers, single hairline shadow, 1px borders only.
 *
 * Tier palette imports from the canonical `elo-tier-colors.js` — DO NOT
 * duplicate tier colors here. The tier palette is identical between v1 and v2.
 */

export { TIERS, TIER_LIST, tierForRating, getTier } from '@/lib/elo-tier-colors';

export const page = {
  bg: '#f8f8f9',
  surface: '#ffffff',
  surfaceAlt: '#f7f7f8',
  ink: '#0a0a0a',
  inkSoft: '#525252',
  inkMuted: '#8a8a8a',
  border: '#ececec',
  borderStrong: '#dcdcdc',
};

export const brand = {
  base: '#16a34a',
  dark: '#15803d',
  soft: '#f0fdf4',
  ring: '#86efac',
};

export const delta = {
  pos: '#15803d',
  posDot: '#16a34a',
  neg: '#dc2626',
  negDot: '#dc2626',
  neutral: '#8a8a8a',
};

export const categoryAccents = {
  LEARN: '#7c3aed',
  TRADE: '#16a34a',
  ENGAGE: '#0284c7',
  PICK: '#ea580c',
};

export const zones = {
  promo: { dot: '#16a34a', text: '#15803d', bg: '#f7f7f8' },
  safe: { dot: '#8a8a8a', text: '#8a8a8a', bg: '#f7f7f8' },
  demo: { dot: '#dc2626', text: '#b91c1c', bg: '#f7f7f8' },
};

export const type = {
  sans: 'var(--font-sans, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
  mono: 'var(--font-mono, "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace)',
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  numericFeatures: 'tabular-nums',
};

export const shape = {
  radius: {
    card: 10,
    row: 6,
    chip: 5,
    button: 8,
    pill: 999,
  },
  border: {
    width: '1px',
    color: page.border,
  },
  shadow: {
    card: '0 1px 2px rgba(15, 23, 42, 0.04)',
    button: 'none',
    none: 'none',
  },
};

export const density = {
  rowPaddingY: 9,
  rowPaddingX: 16,
  sectionGap: 14,
  cardPaddingY: 18,
  cardPaddingX: 20,
};
