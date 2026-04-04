/**
 * Learning badges for Community (regular users): 5 tracks × 5 tiers (Bronze → Diamond).
 * Storage keys match `user_learning_badges.badge_key` from course completion (see learning-progress-logic).
 */

import { TRACKS, getLevelLabel } from '@/lib/learning-curriculum';
import { levelBadgeKey, trackBadgeKey } from '@/lib/learning-progress-logic';
import { learningTrackBiClass } from '@/lib/dashboard-bi-icons';

/** Display category labels (aligned with product copy). */
export const LEARNING_COMMUNITY_CATEGORY_LABEL = {
  stocks: 'Stocks & Investing',
  crypto: 'Crypto & Digital Assets',
  betting: 'Betting Markets',
  commodities: 'Commodities',
  risk: 'Risk & Psychology',
};

/** Tab order for filters. */
export const LEARNING_COMMUNITY_CATEGORY_ORDER = [
  LEARNING_COMMUNITY_CATEGORY_LABEL.stocks,
  LEARNING_COMMUNITY_CATEGORY_LABEL.crypto,
  LEARNING_COMMUNITY_CATEGORY_LABEL.betting,
  LEARNING_COMMUNITY_CATEGORY_LABEL.commodities,
  LEARNING_COMMUNITY_CATEGORY_LABEL.risk,
];

/** Tier visuals — same palette as partner Community badges tab. */
export const LEARNING_BADGE_TIER_STYLES = {
  1: { border: '#cd7f32', bg: 'rgba(205,127,50,0.08)', glow: 'rgba(205,127,50,0.2)' },
  2: { border: '#c0c0c0', bg: 'rgba(192,192,192,0.08)', glow: 'rgba(192,192,192,0.2)' },
  3: { border: '#d4a853', bg: 'rgba(212,168,83,0.08)', glow: 'rgba(212,168,83,0.2)' },
  4: { border: '#e5e4e2', bg: 'rgba(229,228,226,0.08)', glow: 'rgba(229,228,226,0.25)' },
  5: { border: '#b9f2ff', bg: 'rgba(185,242,255,0.08)', glow: 'rgba(185,242,255,0.3)' },
};

const TIER_LEVELS = [
  { tier: 1, tier_name: 'Bronze', tier_color: '#cd7f32', curriculumLevel: 'basic' },
  { tier: 2, tier_name: 'Silver', tier_color: '#c0c0c0', curriculumLevel: 'intermediate' },
  { tier: 3, tier_name: 'Gold', tier_color: '#d4a853', curriculumLevel: 'advanced' },
  { tier: 4, tier_name: 'Platinum', tier_color: '#e5e4e2', curriculumLevel: 'expert' },
  { tier: 5, tier_name: 'Diamond', tier_color: '#b9f2ff', curriculumLevel: null },
];

/**
 * All 25 badge definitions (not yet merged with earned state).
 */
export function getAllLearningCommunityBadgeDefinitions() {
  const out = [];
  for (const track of TRACKS) {
    const cat = LEARNING_COMMUNITY_CATEGORY_LABEL[track.id];
    if (!cat) continue;
    const icon = learningTrackBiClass(track.id);
    for (const t of TIER_LEVELS) {
      const badge_key =
        t.tier === 5 ? trackBadgeKey(track.id) : levelBadgeKey(track.id, t.curriculumLevel);
      if (!badge_key) continue;

      const badge_name = `${track.shortLabel} — ${t.tier_name}`;
      let badge_description;
      if (t.tier === 5) {
        badge_description = `Master the full ${cat} path: complete every course through Expert with passing quiz scores.`;
      } else {
        badge_description = `Complete all ${getLevelLabel(t.curriculumLevel)} courses in ${cat} with passing quiz scores.`;
      }

      out.push({
        id: `${track.id}-tier-${t.tier}`,
        trackId: track.id,
        badge_category: cat,
        tier: t.tier,
        tier_name: t.tier_name,
        tier_color: t.tier_color,
        badge_icon: icon,
        badge_key,
        badge_name,
        badge_description,
      });
    }
  }
  return out;
}

/**
 * @param {{ badge_key: string, earned_at?: string }[]} earnedRows
 */
export function buildLearningCommunityBadgeState(earnedRows) {
  const earnedMap = Object.fromEntries((earnedRows || []).map((r) => [r.badge_key, r.earned_at]));
  const defs = getAllLearningCommunityBadgeDefinitions();
  const badges = defs.map((d) => ({
    ...d,
    earned: Boolean(earnedMap[d.badge_key]),
    earnedAt: earnedMap[d.badge_key] || null,
  }));

  const categories = {};
  for (const b of badges) {
    if (!categories[b.badge_category]) categories[b.badge_category] = [];
    categories[b.badge_category].push(b);
  }

  for (const k of Object.keys(categories)) {
    categories[k].sort((a, z) => a.tier - z.tier);
  }

  return {
    categories,
    badges,
    totalEarned: badges.filter((b) => b.earned).length,
    totalAvailable: badges.length,
  };
}
