/**
 * The seven Ezana data dimensions as the Sonar loading state uses them,
 * straight from src/lib/datasets/taxonomy.js (the single source of truth for
 * their ids, names and brand colours). `colorVar` names the dimension's
 * colour token (taxonomy `color: 'var(--emerald)'` becomes '--emerald'); the
 * cube engine reads it at runtime and the rows mix it in CSS.
 *
 * Order matters: index 0-6 is the cube's colour and cluster index, and it is
 * the taxonomy's order.
 */
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';

const tokenName = (color) => {
  const m = String(color || '').match(/var\((--[\w-]+)\)/);
  return m ? m[1] : '--emerald';
};

export const DIMENSIONS = DATASET_TAXONOMY.slice(0, 7).map((d) => ({
  key: d.id,
  name: d.label,
  colorVar: tokenName(d.color),
}));

/** Status vocabulary, in order. A dimension only ever moves forward. */
export const STATUSES = ['scanning', 'linking', 'cross-checking', 'synthesizing', 'complete'];

export const STATUS_LABELS = {
  scanning: 'Scanning',
  linking: 'Linking',
  'cross-checking': 'Cross-checking',
  synthesizing: 'Synthesizing',
  complete: 'Complete',
};

/** Rotating phrases under the cube. Descriptive only, no em dashes. */
export const TICKER_PHRASES = [
  'Mapping entity relationships',
  'Cross-referencing filings and signals',
  'Testing thesis pathways',
  'Evaluating evidence confidence',
  'Ranking signal strength',
  'Synthesizing research output',
];

/** Non-sequential focus order, so the activity never reads as a checklist. */
export const FOCUS_ORDER = [0, 3, 5, 1, 6, 2, 4];
