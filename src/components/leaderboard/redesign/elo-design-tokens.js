/**
 * Page-level + auxiliary tokens for the ELO Leaderboard redesign.
 */

export { TIERS, TIER_LIST, tierForRating, getTier } from '@/lib/elo-tier-colors';

export const page = {
  bg: '#fffaf0',
  card: '#ffffff',
  ink: '#1c1917',
  inkSoft: '#57534e',
  inkMuted: '#a8a29e',
  cardLine: '#f5f0e6',
  shadow: '#ece5d3',
  brand: '#16a34a',
  brandSoft: '#dcfce7',
  brandDark: '#15803d',
};

export const delta = {
  pos: '#15803d',
  posLight: '#22c55e',
  neg: '#dc2626',
  neutral: '#a8a29e',
};

export const categoryAccents = {
  LEARN: { accent: '#7c3aed', soft: '#ede9fe' },
  TRADE: { accent: '#16a34a', soft: '#dcfce7' },
  ENGAGE: { accent: '#0284c7', soft: '#e0f2fe' },
  PICK: { accent: '#ea580c', soft: '#ffedd5' },
};

export const zones = {
  promo: { dot: '#16a34a', text: '#15803d', line: '#86efac', bg: '#f0fdf4', ring: '#16a34a40' },
  safe: {
    dot: '#a8a29e',
    text: '#a8a29e',
    line: '#f5f0e6',
    bg: 'transparent',
    ring: 'transparent',
  },
  demo: { dot: '#dc2626', text: '#b91c1c', line: '#fecaca', bg: '#fef2f2', ring: '#dc262640' },
};

export const statTiles = {
  streak: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  weekly: { bg: '#dcfce7', border: '#86efac', text: '#15803d' },
};

export const shape = {
  radius: { pill: 999, chip: 999, card: 18, rowCard: 10, button: 12, input: 12 },
  shadowCard: `0 4px 0 ${page.shadow}`,
  shadowSubtle: `0 2px 0 ${page.shadow}`,
  shadowCTA: `0 4px 0 ${page.brandDark}`,
};
