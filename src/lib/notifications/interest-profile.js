/**
 * Builds and updates a user's interest profile from behavioral signals.
 */

import { getAdminClient } from '@/lib/supabase';
import { getTagWeight } from '@/lib/echo-tag-taxonomy';

const DEFAULT_NOTIFICATION_PREFS = {
  earnings_alerts: true,
  macro_events: true,
  watchlist_movers: true,
  portfolio_alerts: true,
  sector_shifts: true,
  congressional_trades: true,
  price_targets: true,
  breaking_news: true,
  weekly_digest: true,
  min_severity: 'noteworthy',
};

const SECTOR_MAP = {
  AAPL: 'Technology',
  NVDA: 'Technology',
  MSFT: 'Technology',
  GOOG: 'Technology',
  GOOGL: 'Technology',
  META: 'Technology',
  TSLA: 'Technology',
  AMZN: 'Technology',
  NFLX: 'Technology',
  JPM: 'Finance',
  GS: 'Finance',
  MS: 'Finance',
  BAC: 'Finance',
  V: 'Finance',
  JNJ: 'Healthcare',
  PFE: 'Healthcare',
  UNH: 'Healthcare',
  LLY: 'Healthcare',
  XOM: 'Energy',
  CVX: 'Energy',
  COP: 'Energy',
  SLB: 'Energy',
  PG: 'Consumer Staples',
  KO: 'Consumer Staples',
  WMT: 'Consumer Staples',
  DIS: 'Communication',
  CMCSA: 'Communication',
  T: 'Communication',
  BA: 'Industrials',
  CAT: 'Industrials',
  UNP: 'Industrials',
  NEE: 'Utilities',
  DUK: 'Utilities',
  SO: 'Utilities',
  AMT: 'Real Estate',
  PLD: 'Real Estate',
  CCI: 'Real Estate',
  BTC: 'Crypto',
  ETH: 'Crypto',
  SOL: 'Crypto',
};

const PAGE_TO_FEATURE = {
  '/company-research': 'company_research',
  '/market-analysis': 'market_analysis',
  '/ezana-echo': 'echo',
  '/for-the-quants': 'quants',
  '/inside-the-capitol': 'capitol',
  '/watchlist': 'watchlist',
  '/betting-markets': 'prediction_markets',
  '/centaur-intelligence': 'centaur',
  '/learning-center': 'learning',
  '/trading': 'trading',
  '/community': 'community',
};

function normalizeRiskFromProfile(row) {
  if (!row) return { riskScore: 50, riskCategory: 'Moderate' };
  let riskCategory = row.risk_category || 'Moderate';
  let riskScore = row.risk_score;
  if (riskScore == null && row.investor_profile?.risk) {
    const r = String(row.investor_profile.risk).replace('-Oriented', '').trim();
    const map = {
      Conservative: 25,
      Moderate: 50,
      Intermediate: 50,
      Growth: 70,
      Aggressive: 85,
      Expert: 85,
      Beginner: 30,
    };
    riskScore = map[r] ?? 50;
    riskCategory = r || riskCategory;
  }
  if (riskScore == null) riskScore = 50;
  return { riskScore, riskCategory };
}

export async function buildUserProfile(userId) {
  const admin = getAdminClient();
  const [watchlistData, portfolioData, breadcrumbs, questionnaire, existingRes] = await Promise.all(
    [
      fetchWatchlistTickers(userId),
      fetchPortfolioHoldings(userId),
      fetchRecentBreadcrumbs(userId, 30),
      fetchQuestionnaireProfile(userId),
      admin
        .from('user_interest_profiles')
        .select('notification_prefs')
        .eq('user_id', userId)
        .maybeSingle(),
    ],
  );
  const existingProfile = existingRes?.data;

  const tickerScores = {};

  for (const ticker of watchlistData) {
    tickerScores[ticker] = (tickerScores[ticker] || 0) + 40;
  }

  for (const ticker of portfolioData) {
    tickerScores[ticker] = (tickerScores[ticker] || 0) + 60;
  }

  const tickerViews = breadcrumbs.filter((b) => b.event_type === 'ticker_view');
  for (const b of tickerViews) {
    const t = b.event_data?.ticker;
    if (t) tickerScores[t] = (tickerScores[t] || 0) + 5;
  }

  const searches = breadcrumbs.filter((b) => b.event_type === 'search');
  for (const b of searches) {
    const t =
      b.event_data?.ticker ||
      (typeof b.event_data?.query === 'string' ? b.event_data.query.toUpperCase() : null);
    if (t && t.length <= 5 && /^[A-Z0-9.-]+$/.test(t)) tickerScores[t] = (tickerScores[t] || 0) + 8;
  }

  const featureScores = {};
  const pageViews = breadcrumbs.filter((b) => b.event_type === 'page_view');
  for (const b of pageViews) {
    const page = b.event_data?.page;
    for (const [prefix, feature] of Object.entries(PAGE_TO_FEATURE)) {
      if (page?.startsWith(prefix)) {
        featureScores[feature] = Math.min(100, (featureScores[feature] || 0) + 3);
      }
    }
  }

  const topicScores = {};
  const tagEngagement = {};

  function bumpEngagement(tagId, field, amount = 1) {
    if (!tagEngagement[tagId]) {
      tagEngagement[tagId] = {
        opens: 0,
        reads: 0,
        keyword_clicks: 0,
        saves: 0,
        shares: 0,
        total_dwell_ms: 0,
      };
    }
    tagEngagement[tagId][field] += amount;
  }

  function bumpTopicScore(tagId, points) {
    const weighted = points * getTagWeight(tagId);
    topicScores[tagId] = Math.min(100, (topicScores[tagId] || 0) + weighted);
  }

  for (const b of breadcrumbs.filter((b) => b.event_type === 'article_open')) {
    const topics = b.event_data?.topics || [];
    for (const t of topics) {
      bumpTopicScore(t, 2);
      bumpEngagement(t, 'opens');
    }
  }

  const articleReads = breadcrumbs.filter((b) => b.event_type === 'article_read');
  for (const b of articleReads) {
    const topics = b.event_data?.topics || [];
    const keywordClickCount = b.event_data?.keyword_clicks || 0;
    const dwellMs = b.event_data?.dwell_ms || 0;
    const intensityBonus = Math.min(20, keywordClickCount * 2);
    for (const t of topics) {
      bumpTopicScore(t, 5 + intensityBonus);
      bumpEngagement(t, 'reads');
      bumpEngagement(t, 'total_dwell_ms', dwellMs);
    }
  }

  for (const b of breadcrumbs.filter((b) => b.event_type === 'keyword_click')) {
    const topics = b.event_data?.topics || [];
    const legacyTopic = b.event_data?.topic;
    const tagList = topics.length ? topics : legacyTopic ? [legacyTopic] : [];
    for (const t of tagList) {
      bumpTopicScore(t, 2);
      bumpEngagement(t, 'keyword_clicks');
    }
  }

  for (const b of breadcrumbs.filter((b) => b.event_type === 'article_save')) {
    const topics = b.event_data?.topics || [];
    for (const t of topics) {
      bumpTopicScore(t, 15);
      bumpEngagement(t, 'saves');
    }
  }

  for (const b of breadcrumbs.filter((b) => b.event_type === 'article_share')) {
    const topics = b.event_data?.topics || [];
    for (const t of topics) {
      bumpTopicScore(t, 10);
      bumpEngagement(t, 'shares');
    }
  }

  const watchlistAdds = breadcrumbs.filter((b) => b.event_type === 'watchlist_add');
  for (const b of watchlistAdds) {
    const t = b.event_data?.ticker;
    if (t) tickerScores[t] = Math.min(100, (tickerScores[t] || 0) + 40);
  }

  const watchlistRemoves = breadcrumbs.filter((b) => b.event_type === 'watchlist_remove');
  for (const b of watchlistRemoves) {
    const t = b.event_data?.ticker;
    if (t) tickerScores[t] = Math.max(0, (tickerScores[t] || 0) - 20);
  }

  const trades = breadcrumbs.filter((b) => b.event_type === 'trade_executed');
  for (const b of trades) {
    const t = b.event_data?.ticker;
    if (t) tickerScores[t] = Math.min(100, (tickerScores[t] || 0) + 60);
  }

  const notifClicks = breadcrumbs.filter((b) => b.event_type === 'notification_click');
  for (const b of notifClicks) {
    const type = b.event_data?.type;
    if (type) topicScores[type] = Math.min(100, (topicScores[type] || 0) + 10);
  }

  const courseEvents = breadcrumbs.filter(
    (b) => b.event_type === 'course_start' || b.event_type === 'course_complete',
  );
  for (const b of courseEvents) {
    featureScores.learning = Math.min(
      100,
      (featureScores.learning || 0) + (b.event_type === 'course_complete' ? 15 : 5),
    );
  }

  const postCreates = breadcrumbs.filter((b) => b.event_type === 'post_create');
  featureScores.community = Math.min(100, (featureScores.community || 0) + postCreates.length * 8);

  for (const k of Object.keys(tickerScores)) {
    tickerScores[k] = Math.min(100, Math.max(0, tickerScores[k]));
  }

  const sectorScores = {};
  for (const [ticker, score] of Object.entries(tickerScores)) {
    const sector = SECTOR_MAP[ticker];
    if (sector) {
      sectorScores[sector] = Math.min(100, (sectorScores[sector] || 0) + Math.round(score * 0.3));
    }
  }

  const { riskScore, riskCategory } = normalizeRiskFromProfile(questionnaire);

  const mergedPrefs = {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(existingProfile?.notification_prefs &&
    typeof existingProfile.notification_prefs === 'object'
      ? existingProfile.notification_prefs
      : {}),
  };

  await admin.from('user_interest_profiles').upsert(
    {
      user_id: userId,
      ticker_scores: tickerScores,
      sector_scores: sectorScores,
      feature_scores: featureScores,
      topic_scores: topicScores,
      tag_engagement: tagEngagement,
      risk_score: riskScore,
      risk_category: riskCategory,
      notification_prefs: mergedPrefs,
      last_computed_at: new Date().toISOString(),
      total_breadcrumbs: breadcrumbs.length,
    },
    { onConflict: 'user_id' },
  );

  return { tickerScores, sectorScores, featureScores, topicScores, riskScore, riskCategory };
}

async function fetchWatchlistTickers(userId) {
  const admin = getAdminClient();
  const { data } = await admin.from('user_watchlist_items').select('ticker').eq('user_id', userId);
  const set = new Set((data || []).map((r) => r.ticker).filter(Boolean));
  return [...set];
}

async function fetchPortfolioHoldings(userId) {
  const admin = getAdminClient();
  const { data } = await admin
    .from('mock_portfolios')
    .select('portfolio')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data?.portfolio?.positions) return [];
  const pos = data.portfolio.positions;
  if (Array.isArray(pos)) {
    return [...new Set(pos.map((p) => p.symbol || p.ticker).filter(Boolean))];
  }
  return Object.keys(pos).filter((k) => k && typeof pos[k] === 'object');
}

async function fetchRecentBreadcrumbs(userId, days) {
  const admin = getAdminClient();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await admin
    .from('activity_breadcrumbs')
    .select('event_type, event_data, created_at')
    .eq('user_id', userId)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(500);
  return data || [];
}

async function fetchQuestionnaireProfile(userId) {
  const admin = getAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('risk_score, risk_category, investor_profile')
    .eq('id', userId)
    .maybeSingle();
  return data;
}
