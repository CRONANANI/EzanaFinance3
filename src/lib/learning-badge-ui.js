import { TRACKS } from '@/lib/learning-curriculum';

/** Display colors per curriculum level (Beginner → Expert). */
export const LEVEL_COLORS = {
  basic: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Beginner' },
  intermediate: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Intermediate' },
  advanced: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Advanced' },
  expert: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', label: 'Expert' },
};

const SUFFIX_TO_LEVEL = {
  foundation: 'basic',
  analyst: 'intermediate',
  advanced_trader: 'advanced',
  market_expert: 'expert',
};

const TRACK_IDS = new Set(TRACKS.map((t) => t.id));

export function trackIconForId(trackId) {
  return TRACKS.find((t) => t.id === trackId)?.icon ?? '📚';
}

export function trackShortLabel(trackId) {
  return TRACKS.find((t) => t.id === trackId)?.shortLabel ?? trackId;
}

/**
 * Map `user_learning_badges.badge_key` to track + level for chip UI.
 * Returns null if unknown.
 */
export function parseLearningBadgeKey(badgeKey) {
  if (!badgeKey || typeof badgeKey !== 'string') return null;

  const master = badgeKey.match(/^([a-z]+)_track_master$/);
  if (master && TRACK_IDS.has(master[1])) {
    return { trackId: master[1], levelKey: 'expert', isMaster: true };
  }

  const m = badgeKey.match(/^([a-z]+)_level_(.+)$/);
  if (!m || !TRACK_IDS.has(m[1])) return null;
  const levelKey = SUFFIX_TO_LEVEL[m[2]];
  if (!levelKey) return null;
  return { trackId: m[1], levelKey, isMaster: false };
}

/**
 * Stable order: by track order, then level order.
 */
export function sortBadgeKeysForDisplay(keys) {
  const order = Object.fromEntries(TRACKS.map((t, i) => [t.id, i]));
  const lv = { basic: 1, intermediate: 2, advanced: 3, expert: 4 };
  const parsed = (keys || [])
    .map((k) => ({ k, p: parseLearningBadgeKey(k) }))
    .filter((x) => x.p);
  parsed.sort((a, b) => {
    const oa = order[a.p.trackId] ?? 99;
    const ob = order[b.p.trackId] ?? 99;
    if (oa !== ob) return oa - ob;
    return (lv[a.p.levelKey] || 0) - (lv[b.p.levelKey] || 0);
  });
  return parsed.map((x) => x.k);
}
