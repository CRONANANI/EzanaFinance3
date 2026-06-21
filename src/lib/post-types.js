/**
 * Partner-only post formats for the community feed. Shared by the composer
 * (to offer the formats) and PostCard (to render them) so labels/colors stay
 * in sync. These are gated to partners server-side in /api/community/posts.
 */

export const POST_TYPES = {
  analyst_take: {
    key: 'analyst_take',
    label: 'Analyst Take',
    icon: 'bi-clipboard-data',
    color: 'var(--positive)',
    soft: 'var(--positive-bg)',
    hint: 'A researched view on a name or theme.',
  },
  trade_idea: {
    key: 'trade_idea',
    label: 'Trade Idea',
    icon: 'bi-graph-up-arrow',
    color: 'var(--gold)',
    soft: 'var(--gold-bg)',
    hint: 'An actionable setup. Add a position disclosure below.',
  },
  market_brief: {
    key: 'market_brief',
    label: 'Market Brief',
    icon: 'bi-newspaper',
    color: 'var(--info)',
    soft: 'var(--info-bg)',
    hint: 'A short read on what is moving markets.',
  },
};

export const POST_TYPE_LIST = [
  POST_TYPES.analyst_take,
  POST_TYPES.trade_idea,
  POST_TYPES.market_brief,
];

export const ALLOWED_POST_TYPES = Object.keys(POST_TYPES);

export const STANDARD_DISCLAIMER = 'Not financial advice — shared for educational purposes.';

export function getPostType(key) {
  return key ? POST_TYPES[key] || null : null;
}
