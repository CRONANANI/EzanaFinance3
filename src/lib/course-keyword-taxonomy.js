/**
 * Per-course keyword taxonomy — niche terms from textbooks, not generic filler.
 * Level-based counts applied in learning-content.js extractKeyTerms().
 *
 * Persona reweighting (onboarding + community activity) can narrow or broaden
 * this list via extractKeyTerms(course, persona) when persona data is wired.
 */

export const COURSE_KEYWORDS = {
  'stocks-basic-1': [
    'stock exchange',
    'bid-ask spread',
    'price discovery',
    'primary market',
    'secondary market',
    'market order',
    'limit order',
    'closing price',
  ],
  'stocks-intermediate-1': [
    'P/E ratio',
    'earnings per share',
    'free cash flow',
    'intrinsic value',
    'forward P/E',
    'earnings quality',
    'GICS sector',
  ],
  'stocks-intermediate-7': [
    'efficient frontier',
    'asset allocation',
    'correlation matrix',
    'rebalancing',
    'risk-return tradeoff',
    'portfolio beta',
    'diversification ratio',
  ],
  'stocks-advanced-1': [
    'call option',
    'put option',
    'strike price',
    'expiration',
    'premium',
    'intrinsic value',
    'implied volatility',
    'moneyness',
    'covered call',
    'assignment',
    'open interest',
    'theta decay',
  ],
  'stocks-advanced-5': [
    'overfitting',
    'out-of-sample test',
    'Sharpe ratio',
    'alpha',
    'backtesting bias',
    'walk-forward validation',
    'factor exposure',
  ],
  'crypto-basic-1': [
    'blockchain',
    'decentralization',
    'proof of work',
    'wallet address',
    'private key',
    'double-spend',
    'consensus mechanism',
  ],
  'betting-basic-1': [
    'prediction market',
    'implied probability',
    'resolution rules',
    'liquidity depth',
    'market maker',
    'Kalshi',
    'Polymarket',
  ],
};
