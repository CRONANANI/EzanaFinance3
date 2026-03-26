/**
 * Mock data for For The Quants — replace with API calls when backend exists.
 */

export const FTQ_STAT_CARDS = [
  { id: 'built', biClass: 'bi-bar-chart-line', label: 'Strategies Built', value: '47', sub: '+8 this month' },
  { id: 'top', biClass: 'bi-trophy', label: 'Top Strategy Return', value: '+142.3% (6mo)', sub: 'by @EmmaWilson' },
  { id: 'community', biClass: 'bi-people', label: 'Community Strategies', value: '1,234', sub: '+89 this week' },
  { id: 'backtests', biClass: 'bi-lightning-charge', label: 'Active Backtests', value: '12', sub: 'running now' },
];

export const MY_STRATEGIES = [
  {
    id: 'ma-cross',
    biClass: 'bi-graph-up-arrow',
    name: 'Moving Average Crossover',
    detail: 'SMA 50/200 · Backtested: +23.4% (1Y)',
    lastRun: '2h ago',
    status: 'Active',
    statusTone: 'active',
  },
  {
    id: 'rsi-mom',
    biClass: 'bi-speedometer2',
    name: 'RSI Momentum Strategy',
    detail: 'RSI 14 · Backtested: +18.7% (6mo)',
    lastRun: '1d ago',
    status: 'Paused',
    statusTone: 'paused',
  },
  {
    id: 'mean-rev-draft',
    biClass: 'bi-bezier2',
    name: 'Mean Reversion + Sentiment',
    detail: 'Bollinger + News · Not backtested',
    lastRun: null,
    status: 'Draft',
    statusTone: 'draft',
  },
];

/** Shared benchmark line for the Latest Backtest Results card */
export const LATEST_BACKTEST_BENCHMARK = '+12.1%';

export const LATEST_BACKTESTS = [
  {
    id: 'ma-cross-bt',
    strategyName: 'Moving Average Crossover',
    period: 'Jan 2025 — Dec 2025',
    returnPct: '+23.4%',
    sharpe: '1.82',
    maxDd: '-8.3%',
    winRate: '64%',
    trades: '47',
    alpha: '+11.3%',
    chartSeed: 11,
  },
  {
    id: 'sector-ml-bt',
    strategyName: 'Sector Rotation ML',
    period: 'Jul 2025 — Dec 2025',
    returnPct: '+48.3%',
    sharpe: '2.14',
    maxDd: '-12.1%',
    winRate: '58%',
    trades: '23',
    alpha: '+36.2%',
    chartSeed: 22,
  },
];

export const LEADERBOARD = [
  { id: 'mean-reversion-alpha', rank: 1, name: 'Mean Reversion Alpha', returnPct: '+142.3%', author: 'Emma Wilson', creatorId: 'emma-wilson', subscribers: 234, hot: true },
  { id: 'momentum-congress', rank: 2, name: 'Momentum + Congressional', returnPct: '+89.7%', author: 'David Kim', creatorId: 'david-kim', subscribers: 156, hot: false },
  { id: 'pairs-etfs', rank: 3, name: 'Pairs Trading ETFs', returnPct: '+67.2%', author: 'Alex Chen', creatorId: 'alex-chen', subscribers: 98, hot: false },
  { id: 'vol-breakout', rank: 4, name: 'Volatility Breakout', returnPct: '+54.8%', author: 'Lisa Park', creatorId: 'lisa-park', subscribers: 67, hot: false },
  { id: 'sector-ml', rank: 5, name: 'Sector Rotation ML', returnPct: '+48.3%', author: 'James Wilson', creatorId: 'james-wilson', subscribers: 45, hot: false },
];

export const RISK_ANALYTICS = {
  beta: 1.24,
  betaBarPct: 78,
  var95: '-$2,340',
  sectors: [
    { label: 'Technology', pct: 68 },
    { label: 'Energy', pct: 18 },
    { label: 'Healthcare', pct: 14 },
  ],
  correlation: '0.87',
  vol30d: '22.4%',
};

export const TRENDING_MARKETS = [
  { id: 'fed-june', question: 'Will Fed cut rates in June?', side: 'Yes: 72%', volume: '$12.3M', traders: '45K' },
  { id: 'pres-2028', question: 'Next president 2028?', side: 'Vance: 34%', volume: '$8.7M', traders: '32K' },
  { id: 'btc-100k', question: 'Bitcoin > $100K by July?', side: 'Yes: 58%', volume: '$5.1M', traders: '18K' },
];

export const BETTING_ANALYTICS = {
  smartMoneyBullish: 78,
  positionChanges: [
    { trader: 'ColdMath', change: '+$450K', market: 'Fed cut June' },
    { trader: 'Theo4', change: '-$200K', market: 'BTC > $100K' },
    { trader: 'Domer', change: '+$180K', market: 'Vance 2028' },
  ],
  accuracy: '73%',
  avgError: '8.2%',
};

export const INDICATOR_TABS = ['Momentum', 'Trend', 'Volatility', 'Volume', 'Oscillators'];

export const INDICATOR_CARDS = [
  { id: 'rsi', name: 'RSI (14)', value: 'Current: 62', action: 'Use in Strategy' },
  { id: 'macd', name: 'MACD (12,26,9)', value: 'Signal: Bullish', action: 'Use in Strategy' },
  { id: 'bb', name: 'Bollinger (20,2)', value: 'Width: Narrow', action: 'Use in Strategy' },
  { id: 'adx', name: 'ADX (14)', value: 'Trend: 34', action: 'Use' },
];

export const STRATEGY_DETAILS = {
  'mean-reversion-alpha': {
    id: 'mean-reversion-alpha',
    name: 'Mean Reversion Alpha',
    creator: 'Emma Wilson',
    creatorHandle: '@EmmaWilson',
    creatorId: 'emma-wilson',
    description:
      'Pairs mean reversion on liquid large-caps with sentiment overlay from news flow. Optimized for medium-volatility regimes.',
    performance: { return6mo: '+142.3%', sharpe: '1.94', maxDd: '-6.1%', winRate: '61%' },
    parameters: [
      { key: 'lookback', label: 'Lookback (days)', value: 20, min: 5, max: 60, step: 1 },
      { key: 'zThreshold', label: 'Z-score entry', value: 2.0, min: 0.5, max: 4, step: 0.1 },
      { key: 'holdDays', label: 'Max hold (days)', value: 10, min: 1, max: 30, step: 1 },
    ],
    backtest: {
      period: 'Jul 2024 — Jan 2026',
      returnPct: '+142.3%',
      sharpe: '1.94',
      maxDd: '-6.1%',
      trades: 312,
      benchmark: '+18.2%',
      alpha: '+124.1%',
    },
  },
  'momentum-congress': {
    id: 'momentum-congress',
    name: 'Momentum + Congressional',
    creator: 'David Kim',
    creatorHandle: '@DavidKim',
    creatorId: 'david-kim',
    description: 'Sector momentum with optional tilt when congressional disclosure clusters align.',
    performance: { return6mo: '+89.7%', sharpe: '1.42', maxDd: '-9.4%', winRate: '58%' },
    parameters: [
      { key: 'momWindow', label: 'Momentum window (d)', value: 60, min: 20, max: 120, step: 5 },
      { key: 'congressWeight', label: 'Congress signal weight', value: 0.15, min: 0, max: 0.5, step: 0.05 },
    ],
    backtest: {
      period: 'Jan 2025 — Jan 2026',
      returnPct: '+89.7%',
      sharpe: '1.42',
      maxDd: '-9.4%',
      trades: 156,
      benchmark: '+14.1%',
      alpha: '+75.6%',
    },
  },
  'pairs-etfs': {
    id: 'pairs-etfs',
    name: 'Pairs Trading ETFs',
    creator: 'Alex Chen',
    creatorHandle: '@AlexChen',
    creatorId: 'alex-chen',
    description: 'Statistical pairs on highly correlated sector ETFs with cointegration filter.',
    performance: { return6mo: '+67.2%', sharpe: '1.28', maxDd: '-7.2%', winRate: '55%' },
    parameters: [
      { key: 'pairWindow', label: 'Cointegration window', value: 90, min: 30, max: 252, step: 10 },
      { key: 'entryZ', label: 'Entry z-score', value: 1.8, min: 0.5, max: 3, step: 0.1 },
    ],
    backtest: {
      period: 'Mar 2024 — Jan 2026',
      returnPct: '+67.2%',
      sharpe: '1.28',
      maxDd: '-7.2%',
      trades: 89,
      benchmark: '+16.0%',
      alpha: '+51.2%',
    },
  },
  'vol-breakout': {
    id: 'vol-breakout',
    name: 'Volatility Breakout',
    creator: 'Lisa Park',
    creatorHandle: '@LisaPark',
    creatorId: 'lisa-park',
    description: 'ATR-based breakouts with trailing stops and regime filter.',
    performance: { return6mo: '+54.8%', sharpe: '1.15', maxDd: '-11.0%', winRate: '52%' },
    parameters: [
      { key: 'atrMult', label: 'ATR multiplier', value: 2.5, min: 1, max: 5, step: 0.25 },
      { key: 'trailPct', label: 'Trail stop %', value: 4.0, min: 1, max: 10, step: 0.5 },
    ],
    backtest: {
      period: 'Jun 2024 — Jan 2026',
      returnPct: '+54.8%',
      sharpe: '1.15',
      maxDd: '-11.0%',
      trades: 214,
      benchmark: '+12.4%',
      alpha: '+42.4%',
    },
  },
  'sector-ml': {
    id: 'sector-ml',
    name: 'Sector Rotation ML',
    creator: 'James Wilson',
    creatorHandle: '@JamesWilson',
    creatorId: 'james-wilson',
    description: 'Lightweight classifier on macro + breadth features for monthly sector weights.',
    performance: { return6mo: '+48.3%', sharpe: '1.08', maxDd: '-8.9%', winRate: '57%' },
    parameters: [
      { key: 'rebalance', label: 'Rebalance (days)', value: 21, min: 5, max: 60, step: 1 },
      { key: 'topN', label: 'Top sectors', value: 3, min: 1, max: 5, step: 1 },
    ],
    backtest: {
      period: 'Jan 2024 — Jan 2026',
      returnPct: '+48.3%',
      sharpe: '1.08',
      maxDd: '-8.9%',
      trades: 48,
      benchmark: '+19.2%',
      alpha: '+29.1%',
    },
  },
};

export function getStrategyDetail(strategyId) {
  return STRATEGY_DETAILS[strategyId] ?? null;
}
