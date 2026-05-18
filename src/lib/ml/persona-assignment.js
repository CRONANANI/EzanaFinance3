/**
 * Assigns a persona archetype from interest profile + demographics.
 * Archetypes: learner, casual_tracker, news_junkie, active_trader,
 * capitol_watcher, quant, community_builder, crypto_native
 */

export const PERSONA_NOTIFICATION_CAPS = {
  learner: 5,
  casual_tracker: 8,
  news_junkie: 15,
  active_trader: 25,
  capitol_watcher: 8,
  quant: 8,
  community_builder: 10,
  crypto_native: 12,
};

export function assignPersona(profile, demographics) {
  const scores = {};

  scores.learner = 0;
  if (profile.risk_category === 'Conservative') scores.learner += 30;
  if (
    demographics?.experience_level === 'Beginner' ||
    demographics?.experience_level === 'none' ||
    demographics?.experience_level === 'beginner'
  ) {
    scores.learner += 30;
  }
  if ((profile.feature_scores?.learning || 0) > 20) scores.learner += 40;

  scores.casual_tracker = 0;
  if (profile.risk_category === 'Moderate' || profile.risk_category === 'Intermediate') {
    scores.casual_tracker += 30;
  }
  if ((profile.feature_scores?.watchlist || 0) > 15) scores.casual_tracker += 35;
  if ((profile.feature_scores?.company_research || 0) > 10) scores.casual_tracker += 20;
  if (profile.total_breadcrumbs > 50 && profile.total_breadcrumbs < 300)
    scores.casual_tracker += 15;

  scores.news_junkie = 0;
  if ((profile.feature_scores?.market_analysis || 0) > 25) scores.news_junkie += 40;
  if ((profile.feature_scores?.echo || 0) > 15) scores.news_junkie += 30;
  if (Object.keys(profile.topic_scores || {}).length > 3) scores.news_junkie += 30;

  scores.active_trader = 0;
  if (profile.risk_score > 70) scores.active_trader += 25;
  if ((profile.feature_scores?.trading || 0) > 30) scores.active_trader += 40;
  if (Object.keys(profile.ticker_scores || {}).length > 15) scores.active_trader += 35;

  scores.capitol_watcher = 0;
  if ((profile.feature_scores?.capitol || 0) > 20) scores.capitol_watcher += 50;
  if ((profile.topic_scores?.regulatory || 0) > 10) scores.capitol_watcher += 25;
  if ((profile.topic_scores?.congressional || 0) > 10) scores.capitol_watcher += 25;

  scores.quant = 0;
  if (demographics?.experience_level === 'Expert' || demographics?.experience_level === 'expert') {
    scores.quant += 25;
  }
  if ((profile.feature_scores?.quants || 0) > 20) scores.quant += 45;
  if (profile.risk_score > 75) scores.quant += 15;
  if ((profile.feature_scores?.trading || 0) > 20) scores.quant += 15;

  scores.community_builder = 0;
  if ((profile.feature_scores?.community || 0) > 20) scores.community_builder += 50;
  if (profile.total_breadcrumbs > 200) scores.community_builder += 25;
  scores.community_builder += Math.min(25, profile.feature_scores?.community || 0);

  scores.crypto_native = 0;
  if ((profile.sector_scores?.Crypto || 0) > 20) scores.crypto_native += 40;
  if ((profile.feature_scores?.prediction_markets || 0) > 15) scores.crypto_native += 35;
  if (profile.ticker_scores?.BTC || profile.ticker_scores?.ETH || profile.ticker_scores?.SOL) {
    scores.crypto_native += 25;
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  return {
    persona: sorted[0][0],
    confidence: Math.min(1, sorted[0][1] / 100),
    all_scores: scores,
  };
}
