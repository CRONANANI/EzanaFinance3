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
    color: '#10b981',
    soft: 'rgba(16,185,129,0.12)',
    hint: 'A researched view on a name or theme.',
  },
  trade_idea: {
    key: 'trade_idea',
    label: 'Trade Idea',
    icon: 'bi-graph-up-arrow',
    color: '#d4a853',
    soft: 'rgba(212,168,83,0.14)',
    hint: 'An actionable setup. Add a position disclosure below.',
  },
  market_brief: {
    key: 'market_brief',
    label: 'Market Brief',
    icon: 'bi-newspaper',
    color: '#38bdf8',
    soft: 'rgba(56,189,248,0.14)',
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
