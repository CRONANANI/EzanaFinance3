/**
 * Classifies incoming market events for the notification matching engine.
 */

const EARNINGS_SIGNALS = ['earnings', 'revenue', 'eps', 'guidance', 'quarterly results', 'beats estimates', 'misses estimates'];
const MACRO_SIGNALS = ['fed', 'interest rate', 'inflation', 'cpi', 'gdp', 'employment', 'unemployment', 'pmi', 'jobless claims', 'fomc'];
const GEO_SIGNALS = ['war', 'conflict', 'sanctions', 'tariff', 'iran', 'china', 'russia', 'ukraine', 'trade war', 'embargo'];
const SECTOR_SIGNALS = ['sector rotation', 'outperform', 'underperform', 'upgrade', 'downgrade', 'overweight', 'underweight'];
const REGULATORY_SIGNALS = ['sec', 'regulation', 'antitrust', 'lawsuit', 'investigation', 'compliance', 'fine', 'penalty'];
const TECHNICAL_SIGNALS = ['breakout', 'breakdown', 'support', 'resistance', 'golden cross', 'death cross', '52-week high', '52-week low'];
const CRYPTO_SIGNALS = ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi', 'stablecoin', 'halving'];

const COMMON_WORDS = new Set(['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'HAS', 'ITS', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'MAY', 'DAY', 'TOO', 'ANY', 'WHO', 'BOY', 'DID', 'GET', 'HIM', 'HOW', 'MAN', 'SAY', 'SHE', 'TOP', 'USE', 'VS', 'IPO', 'ETF', 'CEO', 'CFO', 'USA', 'EU', 'AI', 'TV']);

export function classifyEvent(event) {
  const text = `${event.headline || event.title || ''} ${event.summary || event.body || ''}`.toLowerCase();

  const typeScores = {
    earnings: EARNINGS_SIGNALS.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0),
    macro: MACRO_SIGNALS.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0),
    geopolitical: GEO_SIGNALS.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0),
    sector_move: SECTOR_SIGNALS.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0),
    regulatory: REGULATORY_SIGNALS.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0),
    technical: TECHNICAL_SIGNALS.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0),
    crypto: CRYPTO_SIGNALS.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0),
  };

  const sorted = Object.entries(typeScores).sort((a, b) => b[1] - a[1]);
  const eventType = sorted[0][1] > 0 ? sorted[0][0] : 'macro';

  const HIGH_SEVERITY = ['war', 'crash', 'emergency', 'breaking', 'crisis', 'recession', 'default', 'collapse', 'plunge'];
  const highCount = HIGH_SEVERITY.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0);
  const severity = highCount >= 2 ? 'critical' : highCount >= 1 || typeScores[eventType] >= 3 ? 'noteworthy' : 'routine';

  const upper = `${event.headline || event.title || ''} ${event.summary || ''}`.toUpperCase();
  const tickerRegex = /\b([A-Z]{1,5})\b/g;
  const potentialTickers = [...new Set((upper.match(tickerRegex) || []).filter((t) => t.length >= 2 && t.length <= 5))];
  const tickers = potentialTickers.filter((t) => !COMMON_WORDS.has(t)).slice(0, 5).sort();

  const BULL = ['beats', 'surge', 'rally', 'upgrade', 'growth', 'record', 'bullish', 'soars', 'gains'];
  const BEAR = ['misses', 'decline', 'crash', 'downgrade', 'warning', 'bearish', 'drops', 'falls', 'plunge'];
  const bullScore = BULL.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0);
  const bearScore = BEAR.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0);
  const sentiment = bullScore > bearScore ? 'bullish' : bearScore > bullScore ? 'bearish' : 'neutral';

  const headline = event.headline || event.title || '';
  const fingerprint = `${eventType}-${tickers.join(',')}-${headline.slice(0, 50)}`;

  return {
    eventType,
    severity,
    tickers,
    sentiment,
    fingerprint,
  };
}
