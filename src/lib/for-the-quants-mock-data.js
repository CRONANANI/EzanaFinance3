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
    version: 3,
  },
  {
    id: 'rsi-mom',
    biClass: 'bi-speedometer2',
    name: 'RSI Momentum Strategy',
    detail: 'RSI 14 · Backtested: +18.7% (6mo)',
    lastRun: '1d ago',
    status: 'Paused',
    statusTone: 'paused',
    version: 1,
  },
  {
    id: 'mean-rev-draft',
    biClass: 'bi-bezier2',
    name: 'Mean Reversion + Sentiment',
    detail: 'Bollinger + News · Not backtested',
    lastRun: null,
    status: 'Draft',
    statusTone: 'draft',
    version: 2,
  },
];

/** Shared benchmark line for the Latest Backtest Results card */
export const LATEST_BACKTEST_BENCHMARK = '+12.1%';

/** Two rows in Latest Backtest Results — pairs with Strategy Builder column height */
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

/* ── Dataset Registry ─────────────────────────────────────── */
export const DATASETS = [
  {
    id: 'congressional-trades',
    name: 'Congressional Trades',
    source: 'FMP / Quiver',
    description: 'Real-time stock trades disclosed by US Congress members',
    updateFreq: 'Daily',
    historyRange: '2004–present',
    icon: 'bi-bank',
    planAccess: { personal: '2 years', advanced: 'Full', family: 'Full', pro: 'Full + real-time' },
    endpoint: '/api/fmp/congress-latest',
  },
  {
    id: 'hedge-fund-13f',
    name: 'Hedge Fund 13F Filings',
    source: 'Quiver / SEC',
    description: 'Quarterly institutional holdings (top hedge funds)',
    updateFreq: 'Quarterly',
    historyRange: '2013–present',
    icon: 'bi-briefcase',
    planAccess: { personal: null, advanced: '5 years', family: 'Full', pro: 'Full + alerts' },
    endpoint: '/api/quiver/sec13f',
  },
  {
    id: 'insider-trading',
    name: 'Corporate Insider Trades',
    source: 'SEC Form 4',
    description: 'C-suite and board member buy/sell disclosures',
    updateFreq: 'Daily',
    historyRange: '2010–present',
    icon: 'bi-person-badge',
    planAccess: { personal: '1 year', advanced: 'Full', family: 'Full', pro: 'Full + alerts' },
    endpoint: null,
  },
  {
    id: 'macro-indicators',
    name: 'Macro Economic Indicators',
    source: 'FRED / BLS',
    description: 'CPI, GDP, unemployment, PMI, Fed funds rate, yield curves',
    updateFreq: 'Monthly',
    historyRange: '1950–present',
    icon: 'bi-globe',
    planAccess: { personal: '5 years', advanced: 'Full', family: 'Full', pro: 'Full' },
    endpoint: null,
  },
  {
    id: 'lobbying',
    name: 'Corporate Lobbying Spend',
    source: 'Quiver',
    description: 'Quarterly lobbying expenditure by company and sector',
    updateFreq: 'Quarterly',
    historyRange: '2018–present',
    icon: 'bi-megaphone',
    planAccess: { personal: null, advanced: '3 years', family: 'Full', pro: 'Full' },
    endpoint: '/api/quiver/lobbying',
  },
  {
    id: 'sector-performance',
    name: 'Sector Performance',
    source: 'FMP',
    description: 'S&P 500 sector returns by timeframe (1D to 5Y)',
    updateFreq: 'Real-time',
    historyRange: '2000–present',
    icon: 'bi-pie-chart',
    planAccess: { personal: '1 year', advanced: 'Full', family: 'Full', pro: 'Full' },
    endpoint: '/api/fmp/sector-performance',
  },
];

/* ── Strategy Templates ───────────────────────────────────── */
export const STRATEGY_TEMPLATES = [
  {
    id: 'tmpl-follow-congress',
    name: 'Follow Congress',
    description:
      'Buy when 3+ Congress members disclose purchases of the same stock within 7 days. Sell after 30 days or 10% gain.',
    category: 'Alternative Data',
    datasets: ['congressional-trades'],
    expectedReturn: '+18.4%',
    sharpe: '1.42',
    icon: 'bi-bank2',
    conditions: [
      { type: 'data', dataset: 'congressional-trades', field: 'type', op: 'equals', value: 'purchase' },
      { type: 'aggregate', fn: 'count_distinct', field: 'representative', window: '7d', op: 'gte', value: 3 },
      { type: 'action', action: 'buy', sizing: 'equal_weight', exitRule: '30d_or_10pct' },
    ],
  },
  {
    id: 'tmpl-momentum-rsi',
    name: 'Momentum + RSI',
    description:
      'Classic momentum strategy: buy when RSI crosses above 30 from oversold AND 50-day MA is above 200-day MA.',
    category: 'Technical',
    datasets: [],
    expectedReturn: '+14.2%',
    sharpe: '1.18',
    icon: 'bi-graph-up-arrow',
    conditions: [
      { type: 'indicator', name: 'RSI', period: 14, op: 'crosses_above', value: 30 },
      { type: 'indicator', name: 'SMA', period: 50, op: 'gt', compareTo: 'SMA_200' },
      { type: 'action', action: 'buy', sizing: '5pct_portfolio', exitRule: 'rsi_above_70' },
    ],
  },
  {
    id: 'tmpl-insider-buying',
    name: 'Insider Buying Alpha',
    description: 'Track CEO/CFO open-market purchases above $500K. Buy the stock, hold 60 days.',
    category: 'Alternative Data',
    datasets: ['insider-trading'],
    expectedReturn: '+22.1%',
    sharpe: '1.65',
    icon: 'bi-person-check',
    conditions: [
      {
        type: 'data',
        dataset: 'insider-trading',
        field: 'insider_title',
        op: 'in',
        value: ['CEO', 'CFO', 'COO'],
      },
      { type: 'data', dataset: 'insider-trading', field: 'transaction_value', op: 'gte', value: 500000 },
      { type: 'action', action: 'buy', sizing: 'equal_weight', exitRule: '60d_hold' },
    ],
  },
  {
    id: 'tmpl-mean-reversion',
    name: 'Mean Reversion',
    description:
      'Short-term mean reversion: buy when price drops 2+ standard deviations below 20-day mean. Exit on mean cross.',
    category: 'Statistical',
    datasets: [],
    expectedReturn: '+11.8%',
    sharpe: '1.31',
    icon: 'bi-arrow-left-right',
    conditions: [
      { type: 'indicator', name: 'Bollinger', period: 20, op: 'below_lower', stdDev: 2 },
      { type: 'action', action: 'buy', sizing: '3pct_portfolio', exitRule: 'cross_middle_band' },
    ],
  },
  {
    id: 'tmpl-sector-rotation',
    name: 'Sector Rotation',
    description:
      'Monthly rotation into the 3 best-performing sectors over the trailing 3 months. Equal-weight allocation.',
    category: 'Macro',
    datasets: ['sector-performance'],
    expectedReturn: '+16.7%',
    sharpe: '1.25',
    icon: 'bi-arrow-repeat',
    conditions: [
      { type: 'data', dataset: 'sector-performance', field: 'change_3m', op: 'top_n', value: 3 },
      { type: 'action', action: 'buy', sizing: 'equal_weight', exitRule: 'monthly_rebalance' },
    ],
  },
];

/* ── Visual Builder: Condition options ────────────────────── */
export const CONDITION_CATEGORIES = [
  {
    label: 'Market Data',
    conditions: [
      { id: 'price_above_sma', label: 'Price above SMA', params: [{ name: 'Period', type: 'number', default: 50 }] },
      { id: 'price_below_sma', label: 'Price below SMA', params: [{ name: 'Period', type: 'number', default: 200 }] },
      { id: 'rsi_below', label: 'RSI below threshold', params: [{ name: 'Threshold', type: 'number', default: 30 }] },
      { id: 'rsi_above', label: 'RSI above threshold', params: [{ name: 'Threshold', type: 'number', default: 70 }] },
      { id: 'volume_spike', label: 'Volume spike (vs 20d avg)', params: [{ name: 'Multiple', type: 'number', default: 2 }] },
      { id: 'macd_crossover', label: 'MACD bullish crossover', params: [] },
      {
        id: 'bollinger_touch',
        label: 'Price touches Bollinger Band',
        params: [{ name: 'Band', type: 'select', options: ['Lower', 'Upper'], default: 'Lower' }],
      },
    ],
  },
  {
    label: 'Alternative Data',
    conditions: [
      { id: 'congress_buy', label: 'Congress member buys stock', params: [{ name: 'Min members', type: 'number', default: 1 }] },
      { id: 'congress_sell', label: 'Congress member sells stock', params: [{ name: 'Min members', type: 'number', default: 1 }] },
      { id: 'insider_purchase', label: 'Corporate insider purchase', params: [{ name: 'Min value ($)', type: 'number', default: 100000 }] },
      { id: 'hedge_fund_new_position', label: 'Hedge fund initiates position', params: [{ name: 'Min AUM ($B)', type: 'number', default: 10 }] },
    ],
  },
  {
    label: 'Macro',
    conditions: [
      {
        id: 'fed_rate_change',
        label: 'Fed changes interest rate',
        params: [{ name: 'Direction', type: 'select', options: ['Cut', 'Hike', 'Any'], default: 'Any' }],
      },
      {
        id: 'cpi_surprise',
        label: 'CPI surprise vs consensus',
        params: [{ name: 'Direction', type: 'select', options: ['Above', 'Below'], default: 'Above' }],
      },
      { id: 'yield_curve_inversion', label: 'Yield curve inverts (2Y/10Y)', params: [] },
    ],
  },
];

export const ACTION_OPTIONS = [
  { id: 'buy', label: 'Buy', icon: 'bi-cart-plus' },
  { id: 'sell', label: 'Sell', icon: 'bi-cart-dash' },
  { id: 'short', label: 'Short', icon: 'bi-arrow-down-circle' },
  { id: 'alert_only', label: 'Alert Only (no trade)', icon: 'bi-bell' },
];

export const SIZING_OPTIONS = [
  { id: 'equal_weight', label: 'Equal Weight' },
  { id: '5pct', label: '5% of Portfolio' },
  { id: '3pct', label: '3% of Portfolio' },
  { id: '1pct', label: '1% of Portfolio' },
  { id: 'kelly', label: 'Kelly Criterion' },
];

export const EXIT_RULES = [
  { id: 'trailing_stop_10', label: '10% trailing stop' },
  { id: 'trailing_stop_5', label: '5% trailing stop' },
  { id: 'time_30d', label: 'Exit after 30 days' },
  { id: 'time_60d', label: 'Exit after 60 days' },
  { id: 'target_10pct', label: '10% profit target' },
  { id: 'rsi_exit', label: 'Exit when RSI > 70' },
  { id: 'manual', label: 'Manual exit only' },
];

/* ── Backtest Explainability (trade-level) ────────────────── */
export const EXPLAINER_TRADES = [
  {
    id: 'expl-1',
    ticker: 'NVDA',
    action: 'BUY',
    date: '2026-01-15',
    price: '$142.50',
    reasons: [
      { condition: 'Congress member buys stock', detail: 'Rep. Pelosi disclosed NVDA purchase ($500K–$1M) on 2026-01-14' },
      { condition: 'RSI below 30', detail: 'RSI(14) was 28.4 — oversold signal confirmed' },
    ],
    outcome: { exitDate: '2026-02-14', exitPrice: '$168.20', pnl: '+18.0%', holdDays: 30 },
  },
  {
    id: 'expl-2',
    ticker: 'AAPL',
    action: 'BUY',
    date: '2026-02-03',
    price: '$198.10',
    reasons: [
      { condition: 'Corporate insider purchase', detail: 'CEO Tim Cook purchased 50,000 shares ($9.9M) on 2026-02-02' },
    ],
    outcome: { exitDate: '2026-04-03', exitPrice: '$215.40', pnl: '+8.7%', holdDays: 59 },
  },
  {
    id: 'expl-3',
    ticker: 'META',
    action: 'BUY',
    date: '2026-03-10',
    price: '$510.00',
    reasons: [
      { condition: 'Volume spike (vs 20d avg)', detail: 'Volume was 3.2× the 20-day average — institutional accumulation signal' },
      { condition: 'Price above SMA(50)', detail: 'Price $510 vs SMA(50) $485 — uptrend confirmed' },
    ],
    outcome: { exitDate: null, exitPrice: null, pnl: 'Open', holdDays: null },
  },
];

/* ── Strategy Comparison ──────────────────────────────────── */
export const COMPARISON_STRATEGIES = [
  { id: 'cmp-congress', name: 'Follow Congress', returnPct: '+18.4%', sharpe: '1.42', maxDd: '-8.2%', winRate: '67%', trades: 42, alpha: '+6.3%', color: '#6366f1' },
  { id: 'cmp-momentum', name: 'Momentum RSI', returnPct: '+14.2%', sharpe: '1.18', maxDd: '-12.1%', winRate: '58%', trades: 89, alpha: '+2.1%', color: '#10b981' },
  { id: 'cmp-insider', name: 'Insider Buying', returnPct: '+22.1%', sharpe: '1.65', maxDd: '-6.8%', winRate: '72%', trades: 28, alpha: '+10.0%', color: '#f59e0b' },
  { id: 'cmp-mean-rev', name: 'Mean Reversion', returnPct: '+11.8%', sharpe: '1.31', maxDd: '-9.5%', winRate: '62%', trades: 156, alpha: '-0.3%', color: '#ec4899' },
  { id: 'cmp-sector-rot', name: 'Sector Rotation', returnPct: '+16.7%', sharpe: '1.25', maxDd: '-10.4%', winRate: '61%', trades: 36, alpha: '+4.6%', color: '#06b6d4' },
];
