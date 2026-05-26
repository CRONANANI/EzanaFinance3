/**
 * Design tokens for the Stripe-leaning profile redesign.
 */

export { TIERS, TIER_LIST, tierForRating, getTier } from '@/lib/elo-tier-colors';

export const page = {
  bg: '#fafafa',
  surface: '#ffffff',
  surfaceAlt: '#f7f7f8',
  surfaceMuted: '#fafafa',
  ink: '#0a0a0a',
  inkSoft: '#525252',
  inkMuted: '#a3a3a3',
  border: '#ededed',
  borderStrong: '#e0e0e0',
};

export const brand = {
  base: '#16a34a',
  dark: '#15803d',
  soft: '#f0fdf4',
  ring: '#bbf7d0',
};

export const status = {
  danger: '#dc2626',
  warn: '#b45309',
  info: '#0284c7',
};

export const delta = {
  pos: '#15803d',
  posDot: '#16a34a',
  neg: '#dc2626',
  negDot: '#dc2626',
  neutral: '#a3a3a3',
};

export const categoryAccents = {
  LEARN: '#7c3aed',
  STREAK: '#ea580c',
  BEAT: '#16a34a',
  COPY: '#0284c7',
  COMP: '#b45309',
  LEARNING: '#7c3aed',
  TRADING: '#16a34a',
  COMMUNITY: '#0284c7',
};

export const achievementCategoryAccents = {
  TRADING: '#16a34a',
  LEARNING: '#7c3aed',
  COMMUNITY: '#0284c7',
};

export const type = {
  sans: 'var(--font-sans, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
  mono: 'var(--font-mono, "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace)',
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  numericFeatures: 'tabular-nums',
  useMonoForNumbers: false,
};

export const shape = {
  radius: {
    card: 12,
    inner: 8,
    chip: 6,
    button: 10,
    pill: 999,
  },
  border: { width: '1px', color: page.border },
  shadow: {
    card: '0 1px 2px rgba(15, 23, 42, 0.04)',
    hero: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -16px rgba(15, 23, 42, 0.08)',
    button: '0 1px 2px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
    none: 'none',
  },
};

export const density = {
  cardPaddingY: 20,
  cardPaddingX: 20,
  sectionGap: 16,
  rowPaddingY: 10,
  rowPaddingX: 16,
  pagePaddingY: 20,
  pagePaddingX: 28,
};
