/**
 * Data mappers — adapt existing hooks to Stripe redesign component props.
 */

import { tierForRating } from '@/lib/elo-tier-colors';

function initialsFromName(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  );
}

const ELO_CAT_MAP = {
  learning: 'LEARNING',
  portfolio: 'TRADING',
  competition: 'TRADING',
  activity: 'COMMUNITY',
  social: 'COMMUNITY',
};

export function mapProfileUser({ profile, followerCount, eloState, meData, totalTraders = 0 }) {
  const name = profile.full_name || profile.username || 'Member';
  const rating = eloState?.elo?.current_rating ?? meData?.rating ?? 0;
  const tier = eloState?.elo?.tier ?? meData?.tier ?? tierForRating(rating).key;
  const peak = eloState?.elo?.peak_rating ?? meData?.peak ?? rating;

  const txs = eloState?.transactions ?? [];
  const ratingHistory = [...txs].reverse().map((e) => Number(e.rating_after) || 0);

  const earnedByCategory = { LEARNING: 0, TRADING: 0, COMMUNITY: 0 };
  for (const tx of txs) {
    if (tx.category === 'decay' || tx.category === 'admin') continue;
    const bucket = ELO_CAT_MAP[tx.category] || 'TRADING';
    earnedByCategory[bucket] += Number(tx.delta) || 0;
  }

  const globalRank = meData?.globalRank ?? meData?.rank ?? 0;
  let rankPercentile = null;
  if (globalRank > 0 && totalTraders > 0) {
    rankPercentile = Math.max(1, Math.min(99, Math.ceil((globalRank / totalTraders) * 100)));
  }

  return {
    id: profile.id,
    name,
    initials: initialsFromName(name),
    avatarUrl: profile.avatar_url,
    joinedAt: profile.created_at,
    followerCount,
    rank: globalRank,
    totalTraders,
    rankPercentile,
    tier,
    rating,
    peak,
    streakDays: meData?.streakDays ?? 0,
    weeklyDelta: meData?.delta7d ?? 0,
    ratingHistory,
    earnedByCategory,
  };
}

const METRIC_LABELS = {
  totalReturn: 'TOTAL RETURN',
  vsSP500: 'VS S&P 500',
  consistency: 'CONSISTENCY',
  diversification: 'DIVERSIFICATION',
  holdingDiscipline: 'AVG HOLD TIME',
  contributionStreak: 'CONTRIBUTION STREAK',
};

const METRIC_KEY_ORDER = [
  'totalReturn',
  'vsSP500',
  'consistency',
  'diversification',
  'holdingDiscipline',
  'contributionStreak',
];

export function mapPerfStats(metrics) {
  return METRIC_KEY_ORDER.map((k) => {
    const m = metrics[k];
    if (!m) {
      return {
        key: k,
        label: METRIC_LABELS[k],
        value: '—',
        rawValue: null,
        vsAvgLabel: '',
        vsAvgDirection: 'neutral',
        topPercentile: 0,
        barFill: 0,
        muted: true,
      };
    }
    return {
      key: m.key,
      label: METRIC_LABELS[k] || (m.label || k).toUpperCase(),
      value: m.value || '—',
      rawValue: m.rawValue ?? null,
      vsAvgLabel: m.vsAverageFormatted || '',
      vsAvgDirection:
        Math.abs(m.vsAverage) < 0.05
          ? 'neutral'
          : m.higherIsBetter
            ? m.vsAverage >= 0
              ? 'pos'
              : 'neg'
            : m.vsAverage <= 0
              ? 'pos'
              : 'neg',
      topPercentile: m.percentile ?? 0,
      barFill: Math.max(0, Math.min(1, (m.percentile ?? 0) / 100)),
      muted: m.value === '—' || m.value == null,
    };
  });
}

const ACH_GLYPHS = {
  trading: '$',
  learning: '◆',
  community: '✦',
};

export function mapAchievements(achievementsState) {
  const list = achievementsState?.list ?? achievementsState?.achievements ?? [];
  return list.map((a) => ({
    key: a.id || a.key || a.slug,
    name: a.name || a.title || 'Achievement',
    category: (a.category || 'TRADING').toUpperCase(),
    iconGlyph: a.iconGlyph || ACH_GLYPHS[(a.category || 'trading').toLowerCase()] || '★',
    earnedAt: a.earnedAt ?? a.earned_at ?? null,
    progress: a.progress ?? 0,
  }));
}

function computeWindowLocalSeries(full, range) {
  if (!full || full.length === 0) return [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const windowStart = (() => {
    if (range === 'YTD') {
      return new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    }
    const days = range === '1W' ? 7 : range === '1M' ? 30 : 90;
    const d = new Date(today.getTime());
    d.setUTCDate(d.getUTCDate() - days);
    return d;
  })();
  const fromIso = windowStart.toISOString().slice(0, 10);

  const sorted = [...full].sort((a, b) => a.date.localeCompare(b.date));
  const anchor = sorted.find((r) => r.date >= fromIso) ?? sorted[0];
  const anchorCum = Number(anchor?.cumReturnPct) || 0;

  return sorted
    .filter((r) => r.date >= fromIso)
    .map((r) => ({
      date: r.date,
      ret: ((1 + Number(r.cumReturnPct) / 100) / (1 + anchorCum / 100) - 1) * 100,
    }));
}

export function mapPerformanceSeries(userSeriesFull, range, platformResp) {
  const userWindow = computeWindowLocalSeries(userSeriesFull, range);
  const byDate = new Map();

  for (const u of userWindow) {
    byDate.set(u.date, { you: u.ret });
  }
  for (const p of platformResp?.points ?? []) {
    const row = byDate.get(p.date) ?? {};
    row.median = Number(p.platform) || 0;
    row.top25 = Number(p.cohort) || 0;
    byDate.set(p.date, { ...row, date: p.date });
  }

  const dates = [...byDate.keys()].sort();
  return {
    you: dates.map((d) => byDate.get(d).you ?? 0),
    median: dates.map((d) => byDate.get(d).median ?? 0),
    top25: dates.map((d) => byDate.get(d).top25 ?? 0),
    dates,
  };
}

/**
 * Heuristic "Ways to Improve" until /api/users/:userId/quests exists.
 */
export function generateHeuristicQuests({ metrics, achievementsState, activity }) {
  const quests = [];
  const achList = achievementsState?.achievements ?? achievementsState?.list ?? [];

  if (metrics?.consistency?.percentile != null && metrics.consistency.percentile < 50) {
    quests.push({
      key: 'beat-market',
      category: 'BEAT',
      title: 'Beat the market this month',
      description:
        'Your consistency is below average — closing a few winning weeks lifts your ranking quickly.',
      xpRangeLabel: '+50 – 200',
      ctaLabel: 'View portfolio',
      ctaHref: '/home-dashboard',
    });
  }

  const earnedAchievements = achList.filter((a) => a.earnedAt || a.earned_at).length;
  if (earnedAchievements < 3) {
    quests.push({
      key: 'browse-learning',
      category: 'LEARN',
      title: 'Complete a course module',
      description: 'Bronze courses give 5–15 ELO each — and unlock learning achievements.',
      xpRangeLabel: '+5 – 15',
      ctaLabel: 'Browse Learning Center',
      ctaHref: '/learning-center',
    });
  }

  if ((activity?.streakDays ?? 0) < 3) {
    quests.push({
      key: 'streak',
      category: 'STREAK',
      title: 'Build a daily streak',
      description: '+1 ELO per day with bonus +5 every 7 days for staying engaged.',
      xpRangeLabel: '+1 – 5',
      ctaLabel: 'Open dashboard',
      ctaHref: '/home-dashboard',
    });
  }

  if (metrics?.diversification?.percentile != null && metrics.diversification.percentile < 50) {
    quests.push({
      key: 'diversify',
      category: 'BEAT',
      title: 'Spread across more sectors',
      description:
        'Diversification is below average — holding more sectors stabilizes your return.',
      xpRangeLabel: '+10 – 40',
      ctaLabel: 'Open watchlist',
      ctaHref: '/watchlist',
    });
  }

  quests.push({
    key: 'copy-request',
    category: 'COPY',
    title: 'Get a copy-trade request approved',
    description: 'Each approved follower yields ELO based on copier returns.',
    xpRangeLabel: '+10 – 50',
    ctaLabel: 'Manage copy requests',
    ctaHref: '/community',
  });

  return quests.slice(0, 5);
}
