/**
 * Pinned cards: one cardId per section (see PinnedCardsContext).
 * CARD_TITLES must include every pinnable cardId for Home previews.
 */

export const SECTION_NAMES = {
  dashboard: 'Dashboard',
  capitol: 'Inside the Capitol',
  research: 'Company Research',
  betting: 'Betting Markets',
  quants: 'For the Quants',
  watchlist: 'Watchlist',
  community: 'Community',
  learning: 'Learning Center',
};

export const SECTION_URLS = {
  dashboard: '/home-dashboard',
  capitol: '/inside-the-capitol',
  research: '/company-research',
  betting: '/betting-markets',
  quants: '/for-the-quants',
  watchlist: '/watchlist',
  community: '/community',
  learning: '/learning-center',
};

/** Default pins for new profiles — one card per section */
export const DEFAULT_PINNED_CARDS = {
  dashboard: 'dashboard-portfolio-hero',
  capitol: 'itc-latest-trades',
  research: 'company-overview',
  betting: 'polymarket-trending',
  watchlist: 'stock-watchlist',
  learning: 'learning-course-table',
  community: 'community-feed',
  quants: 'quant-model',
};

/** Display order on Home */
export const HOME_SECTION_ORDER = [
  'dashboard',
  'capitol',
  'research',
  'betting',
  'watchlist',
  'learning',
  'community',
  'quants',
];

/** Human-readable titles for every pinnable card */
export const CARD_TITLES = {
  // Dashboard (home-dashboard)
  'dashboard-portfolio-hero': 'Portfolio overview',
  'dashboard-my-holdings': 'My Holdings',
  'dashboard-watchlist-mini': 'Watchlist',
  'dashboard-total-profits': 'Total Profits',
  'dashboard-sector-distribution': 'Sector Distribution',
  'dashboard-recent-transactions': 'Recent Transactions',

  // Inside the Capitol
  'itc-latest-trades': 'Latest Trades',
  'itc-top-performers': 'Top Performing Politicians',
  'itc-featured-politicians': "Politicians I'm Following",
  'itc-sectors': 'Sector Activity',
  'itc-unusual-volume': 'Unusual Trading Volume',
  'itc-bipartisan-trades': 'Bipartisan Trades',
  'itc-earnings-watch': 'Upcoming Earnings Watch',

  // Company research
  'stock-heatmap': 'Stock Market Heatmap',
  'company-overview': 'Company Overview',
  'stock-quote': 'Stock Quote',
  'key-metrics': 'Key Metrics',
  'analyst-recommendations': 'Analyst Recommendations',
  'company-news': 'Company News',
  'earnings-card': 'Earnings',
  'competitors-card': 'Competitors',

  // Betting
  'trader-lookup': 'Polymarket Trader Lookup',
  'copy-trading-feed': 'Copy Trading Feed',
  'polymarket-trending': 'Live Prediction Markets',
  'sports-odds': 'Sports Odds Board',
  'polymarket-leaderboard': 'Polymarket Leaderboard',
  'ev-finder': 'Expected Value Finder',
  'line-movement': 'Line Movement Tracker',
  'resolved-markets': 'Recently Resolved Markets',

  // For the Quants
  'quant-model': 'Quant Model Lab',
  'backtesting-engine': 'Backtesting Engine',
  'statistical-analysis': 'Statistical Analysis',
  'ml-predictions': 'ML Predictions',
  'portfolio-optimization': 'Portfolio Optimization',
  'risk-analytics': 'Risk Analytics',

  // Watchlist page
  'stock-watchlist': 'Watchlist & Chart',
  'price-alerts': 'Price Alerts',

  // Community
  'legendary-investors': 'Legendary Investors',
  'community-feed': 'Community Feed',
  'my-friends': 'My Friends',
  'friends-activity': 'Friends Activity',
  'active-discussions': 'Active Discussions',
  'leaderboard': 'Leaderboard',
  'community-insights': 'Community Insights',

  // Learning
  'learning-course-table': 'My Courses',
  'learning-achievements': 'Achievements',
};

export function getCardTitle(cardId) {
  return CARD_TITLES[cardId] || cardId;
}
