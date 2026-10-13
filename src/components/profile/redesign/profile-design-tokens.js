/**
 * Design tokens for the Stripe-leaning profile redesign.
 */

export { TIERS, TIER_LIST, tierForRating, getTier } from '@/lib/elo-tier-colors';

export const page = {
  bg: 'var(--app-bg, #fafafa)',
  surface: 'var(--surface-card, #ffffff)',
  surfaceAlt: 'var(--bg-tertiary, #f7f7f8)',
  surfaceMuted: 'var(--app-bg, #fafafa)',
  ink: 'var(--text-primary, #0a0a0a)',
  inkSoft: 'var(--text-secondary, #525252)',
  inkMuted: 'var(--text-muted, #a3a3a3)',
  border: 'var(--border-primary, #ededed)',
  borderStrong: 'var(--border-hover, #e0e0e0)',
};

export const brand = {
  base: 'var(--emerald, #16a34a)',
  dark: 'var(--emerald-hover, #15803d)',
  soft: 'var(--emerald-bg, #f0fdf4)',
  ring: 'var(--emerald-border, #bbf7d0)',
};

export const status = {
  danger: 'var(--negative, #dc2626)',
  warn: 'var(--warning, #b45309)',
  info: 'var(--info, #0284c7)',
};

export const delta = {
  pos: 'var(--positive, #15803d)',
  posDot: 'var(--positive, #16a34a)',
  neg: 'var(--negative, #dc2626)',
  negDot: 'var(--negative, #dc2626)',
  neutral: 'var(--text-muted, #a3a3a3)',
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
  border: { width: '1px', color: 'var(--border-primary, #ededed)' },
  shadow: {
    card: 'var(--shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.04))',
    hero: 'var(--shadow-md, 0 1px 2px rgba(15, 23, 42, 0.04))',
    button: 'var(--shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.08))',
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
