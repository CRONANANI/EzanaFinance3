/**
 * Page-level + auxiliary tokens for the ELO Leaderboard redesign (v2).
 *
 * Visual direction: "Sweet Spot" — sleek fintech between Stripe's whitespace-led
 * calm and Bloomberg's data-density. Cool neutral surfaces, Inter for UI,
 * JetBrains Mono for numbers, single hairline shadow, 1px borders only.
 *
 * Tier palette imports from the canonical `elo-tier-colors.js` — DO NOT
 * duplicate tier colors here. The tier palette is identical between v1 and v2.
 *
 * Light tokens are the v2 defaults. Dark tokens align with the app shell
 * (`theme-variables.css`: #0a0e13 page, emerald accents).
 */

export { TIERS, TIER_LIST, tierForRating, getTier } from '@/lib/elo-tier-colors';

const ELO_LIGHT = {
  page: {
    bg: '#f8f8f9',
    surface: '#ffffff',
    surfaceAlt: '#f7f7f8',
    ink: '#0a0a0a',
    inkSoft: '#525252',
    inkMuted: '#8a8a8a',
    border: '#ececec',
    borderStrong: '#dcdcdc',
  },
  brand: {
    base: '#16a34a',
    dark: '#15803d',
    soft: '#f0fdf4',
    ring: '#86efac',
  },
  delta: {
    pos: '#15803d',
    posDot: '#16a34a',
    neg: '#dc2626',
    negDot: '#dc2626',
    neutral: '#8a8a8a',
  },
  categoryAccents: {
    LEARN: '#7c3aed',
    TRADE: '#16a34a',
    ENGAGE: '#0284c7',
    PICK: '#ea580c',
  },
  zones: {
    promo: { dot: '#16a34a', text: '#15803d', bg: '#f7f7f8' },
    safe: { dot: '#8a8a8a', text: '#8a8a8a', bg: '#f7f7f8' },
    demo: { dot: '#dc2626', text: '#b91c1c', bg: '#f7f7f8' },
  },
};

const ELO_DARK = {
  page: {
    bg: '#0a0e13',
    surface: '#0d1117',
    surfaceAlt: '#161b22',
    ink: '#f0f6fc',
    inkSoft: '#c9d1d9',
    inkMuted: '#8b949e',
    border: 'rgba(16, 185, 129, 0.1)',
    borderStrong: 'rgba(255, 255, 255, 0.12)',
  },
  brand: {
    base: '#10b981',
    dark: '#34d399',
    soft: 'rgba(16, 185, 129, 0.12)',
    ring: 'rgba(16, 185, 129, 0.35)',
  },
  delta: {
    pos: '#34d399',
    posDot: '#10b981',
    neg: '#f87171',
    negDot: '#ef4444',
    neutral: '#8b949e',
  },
  categoryAccents: {
    LEARN: '#a78bfa',
    TRADE: '#34d399',
    ENGAGE: '#38bdf8',
    PICK: '#fb923c',
  },
  zones: {
    promo: { dot: '#10b981', text: '#34d399', bg: '#161b22' },
    safe: { dot: '#8b949e', text: '#8b949e', bg: '#161b22' },
    demo: { dot: '#f87171', text: '#fca5a5', bg: '#161b22' },
  },
};

const RADIUS = {
  card: 10,
  row: 6,
  chip: 5,
  button: 8,
  pill: 999,
};

function buildShape(pageColors, isDark) {
  return {
    radius: RADIUS,
    border: {
      width: '1px',
      color: pageColors.border,
    },
    shadow: {
      card: isDark ? '0 1px 3px rgba(0, 0, 0, 0.35)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
      button: 'none',
      none: 'none',
    },
  };
}

/** Full theme bundle for light or dark (used by EloThemeProvider). */
export function getEloTheme(isDark) {
  const base = isDark ? ELO_DARK : ELO_LIGHT;
  return {
    isDark: !!isDark,
    page: base.page,
    brand: base.brand,
    delta: base.delta,
    zones: base.zones,
    categoryAccents: base.categoryAccents,
    shape: buildShape(base.page, !!isDark),
  };
}

/** @deprecated Prefer `useEloTheme()` — light defaults for static imports */
export const page = ELO_LIGHT.page;
export const brand = ELO_LIGHT.brand;
export const delta = ELO_LIGHT.delta;
export const categoryAccents = ELO_LIGHT.categoryAccents;
export const zones = ELO_LIGHT.zones;

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

export const shape = buildShape(ELO_LIGHT.page, false);

export const density = {
  rowPaddingY: 9,
  rowPaddingX: 16,
  sectionGap: 14,
  cardPaddingY: 18,
  cardPaddingX: 20,
};
