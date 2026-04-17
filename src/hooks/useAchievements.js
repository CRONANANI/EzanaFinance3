'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { supabase } from '@/lib/supabase';

/**
 * Unified Achievement shape.
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} [icon]           bootstrap-icons class name (bi-*)
 * @property {'community'|'learning'|'trading'} category
 * @property {string} criteria
 * @property {string} [earnedAt]       ISO date — undefined/null if locked
 * @property {number} [progress]       0-100 when in progress
 * @property {'bronze'|'silver'|'gold'|'platinum'|'diamond'} [tier]
 */

/** Map learning community-badge tier_name → unified tier */
const TIER_MAP = {
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
  Platinum: 'platinum',
  Diamond: 'diamond',
};

/** Trading achievements derived client-side from mock/live portfolio stats. */
function buildTradingAchievements({ positionsCount, totalTrades, uniqueSectorsCount, totalReturnPct }) {
  const defs = [
    {
      id: 'trading-first-trade',
      name: 'First Trade',
      description: "You've opened your first position.",
      criteria: 'Open at least 1 position.',
      icon: 'bi-arrow-up-right-circle',
      category: 'trading',
      tier: 'bronze',
      check: () => positionsCount >= 1 || totalTrades >= 1,
      progress: () => Math.min(100, (positionsCount + totalTrades) * 100),
    },
    {
      id: 'trading-five-tickers',
      name: 'Diversifier',
      description: 'Hold 5 or more different tickers at once.',
      criteria: 'Have 5+ open positions.',
      icon: 'bi-pie-chart',
      category: 'trading',
      tier: 'silver',
      check: () => positionsCount >= 5,
      progress: () => Math.min(100, (positionsCount / 5) * 100),
    },
    {
      id: 'trading-three-sectors',
      name: 'Sector Spread',
      description: 'Own stocks across at least 3 sectors.',
      criteria: 'Hold positions in 3+ distinct sectors.',
      icon: 'bi-diagram-3',
      category: 'trading',
      tier: 'silver',
      check: () => uniqueSectorsCount >= 3,
      progress: () => Math.min(100, (uniqueSectorsCount / 3) * 100),
    },
    {
      id: 'trading-in-the-green',
      name: 'In the Green',
      description: 'Your portfolio is positive for the session.',
      criteria: 'Achieve a positive total return.',
      icon: 'bi-graph-up-arrow',
      category: 'trading',
      tier: 'bronze',
      check: () => totalReturnPct > 0,
      progress: () => (totalReturnPct > 0 ? 100 : 0),
    },
    {
      id: 'trading-double-digit',
      name: 'Double-Digit Gains',
      description: 'Hit 10% cumulative portfolio return.',
      criteria: 'Reach 10% total return.',
      icon: 'bi-trophy',
      category: 'trading',
      tier: 'gold',
      check: () => totalReturnPct >= 10,
      progress: () => Math.max(0, Math.min(100, (totalReturnPct / 10) * 100)),
    },
  ];

  return defs.map((d) => {
    const earned = d.check();
    const prog = Math.round(d.progress());
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      criteria: d.criteria,
      icon: d.icon,
      category: 'trading',
      tier: d.tier,
      earnedAt: earned ? new Date().toISOString() : undefined,
      progress: earned ? 100 : prog,
    };
  });
}

/** Community achievements derived from follower/post counts (best-effort; zero when tables empty). */
async function fetchCommunityAchievements(userId) {
  if (!userId) return [];
  try {
    const [{ count: followers }, { count: posts }] = await Promise.all([
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('followed_id', userId),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    const followerCount = Number(followers || 0);
    const postCount = Number(posts || 0);

    const defs = [
      {
        id: 'community-first-post',
        name: 'First Post',
        description: 'Shared your first post with the community.',
        criteria: 'Publish 1 community post.',
        icon: 'bi-chat-square-text',
        tier: 'bronze',
        check: postCount >= 1,
        progress: Math.min(100, postCount * 100),
      },
      {
        id: 'community-ten-posts',
        name: 'Voice in the Crowd',
        description: 'Published 10 posts.',
        criteria: 'Publish 10 community posts.',
        icon: 'bi-megaphone',
        tier: 'silver',
        check: postCount >= 10,
        progress: Math.min(100, (postCount / 10) * 100),
      },
      {
        id: 'community-first-follower',
        name: 'First Follower',
        description: 'Someone followed you for the first time.',
        criteria: 'Attract 1 follower.',
        icon: 'bi-person-plus',
        tier: 'bronze',
        check: followerCount >= 1,
        progress: Math.min(100, followerCount * 100),
      },
      {
        id: 'community-twenty-followers',
        name: 'Community Leader',
        description: 'Built a following of 20 investors.',
        criteria: 'Reach 20 followers.',
        icon: 'bi-people',
        tier: 'gold',
        check: followerCount >= 20,
        progress: Math.min(100, (followerCount / 20) * 100),
      },
    ];

    return defs.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      criteria: d.criteria,
      icon: d.icon,
      category: 'community',
      tier: d.tier,
      earnedAt: d.check ? new Date().toISOString() : undefined,
      progress: d.check ? 100 : Math.round(d.progress),
    }));
  } catch {
    return [];
  }
}

/** Map /api/learning/community-badges rows → unified Achievement[] */
function mapLearningBadges(raw) {
  const badges = Array.isArray(raw?.badges) ? raw.badges : [];
  return badges.map((b) => ({
    id: `learning-${b.id}`,
    name: b.badge_name,
    description: b.badge_description,
    criteria: b.badge_description,
    icon: b.badge_icon || 'bi-mortarboard',
    category: 'learning',
    tier: TIER_MAP[b.tier_name] || 'bronze',
    earnedAt: b.earned ? b.earnedAt || new Date().toISOString() : undefined,
    progress: b.earned ? 100 : 0,
  }));
}

/**
 * Unified achievements feed for the current user. Pulls and merges:
 *   - Learning: /api/learning/community-badges (5 tracks × 5 tiers)
 *   - Community: derived from follower / post counts
 *   - Trading: derived from open positions / total return / sectors
 */
export function useAchievements({ positions = [], totalReturnPct = 0 } = {}) {
  const { user } = useAuth();
  const mock = useMockPortfolio();
  const [learning, setLearning] = useState([]);
  const [community, setCommunity] = useState([]);
  const [loading, setLoading] = useState(true);

  const positionsCount = positions.length;
  const uniqueSectorsCount = useMemo(() => {
    const s = new Set();
    for (const p of positions) {
      const v = (p.sector || '').trim();
      if (v) s.add(v);
    }
    return s.size;
  }, [positions]);

  const totalTrades = mock?.recentTransactions?.length || 0;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [badgesRes, commAch] = await Promise.all([
          fetch('/api/learning/community-badges').then((r) => (r.ok ? r.json() : null)),
          fetchCommunityAchievements(user.id),
        ]);
        if (cancelled) return;
        setLearning(badgesRes ? mapLearningBadges(badgesRes) : []);
        setCommunity(commAch);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const trading = useMemo(
    () => buildTradingAchievements({
      positionsCount,
      totalTrades,
      uniqueSectorsCount,
      totalReturnPct,
    }),
    [positionsCount, totalTrades, uniqueSectorsCount, totalReturnPct],
  );

  const all = useMemo(
    () => [...trading, ...community, ...learning],
    [trading, community, learning],
  );

  return {
    loading,
    achievements: all,
    earnedCount: all.filter((a) => Boolean(a.earnedAt)).length,
    totalCount: all.length,
  };
}
