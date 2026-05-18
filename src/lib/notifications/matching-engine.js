/**
 * Scores an event against a user's interest profile.
 */

const SEVERITY_THRESHOLDS = {
  critical: 15,
  noteworthy: 35,
  routine: 65,
};

const TICKER_SECTOR = {
  AAPL: 'Technology',
  NVDA: 'Technology',
  MSFT: 'Technology',
  GOOG: 'Technology',
  GOOGL: 'Technology',
  META: 'Technology',
  TSLA: 'Technology',
  JPM: 'Finance',
  GS: 'Finance',
  JNJ: 'Healthcare',
  XOM: 'Energy',
  BTC: 'Crypto',
  ETH: 'Crypto',
};

export function scoreEventForUser(classified, userProfile, userSegment = null) {
  let score = 0;

  const userTickers = userProfile.ticker_scores || {};
  const tickers = classified.tickers || [];
  for (const ticker of tickers) {
    if (userTickers[ticker]) {
      score += Math.round(userTickers[ticker] * 0.5);
    }
  }

  const userSectors = userProfile.sector_scores || {};
  for (const ticker of tickers) {
    const sector = TICKER_SECTOR[ticker];
    if (sector && userSectors[sector]) {
      score += Math.round(userSectors[sector] * 0.2);
    }
  }

  const featureScores = userProfile.feature_scores || {};
  const TYPE_FEATURE_MAP = {
    earnings: 'company_research',
    macro: 'market_analysis',
    geopolitical: 'market_analysis',
    sector_move: 'company_research',
    regulatory: 'capitol',
    technical: 'quants',
    crypto: 'prediction_markets',
  };
  const feature = TYPE_FEATURE_MAP[classified.eventType];
  if (feature && featureScores[feature]) {
    score += Math.round(featureScores[feature] * 0.15);
  }

  const topicScores = userProfile.topic_scores || {};
  if (topicScores[classified.eventType]) {
    score += Math.round(topicScores[classified.eventType] * 0.15);
  }

  if (classified.severity === 'critical') score = Math.max(score, 40);
  if (classified.severity === 'noteworthy') score = Math.max(score, 20);

  if (userSegment?.persona) {
    if (userSegment.persona === 'capitol_watcher' && classified.eventType === 'regulatory')
      score += 20;
    if (userSegment.persona === 'crypto_native' && classified.eventType === 'crypto') score += 20;
    if (
      userSegment.persona === 'news_junkie' &&
      (classified.eventType === 'macro' || classified.eventType === 'geopolitical')
    ) {
      score += 15;
    }
    if (userSegment.persona === 'active_trader' && classified.eventType === 'technical')
      score += 15;
    if (userSegment.persona === 'learner' && classified.eventType === 'earnings') score += 10;
    score = Math.min(100, score);
  }

  score = Math.min(100, score);

  const threshold = SEVERITY_THRESHOLDS[classified.severity] || 50;
  const passesScore = score >= threshold;

  const prefs = userProfile.notification_prefs || {};
  const minSeverity = prefs.min_severity || 'noteworthy';
  const SEVERITY_ORDER = { routine: 0, noteworthy: 1, critical: 2 };
  const severityPasses =
    (SEVERITY_ORDER[classified.severity] ?? 0) >= (SEVERITY_ORDER[minSeverity] ?? 1);

  const TYPE_PREF_MAP = {
    earnings: 'earnings_alerts',
    macro: 'macro_events',
    sector_move: 'sector_shifts',
    regulatory: 'congressional_trades',
    technical: 'price_targets',
  };
  const prefKey = TYPE_PREF_MAP[classified.eventType];
  const prefEnabled = prefKey ? prefs[prefKey] !== false : true;

  return {
    score,
    shouldNotify: passesScore && severityPasses && prefEnabled,
    reason: passesScore ? 'relevance' : 'below_threshold',
  };
}
