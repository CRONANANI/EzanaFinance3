/**
 * The ticker guard's word lists. A token on TICKER_BLOCKLIST is never read
 * as a ticker unless it is cued ($USA, "ticker USA", "13F holders of USA")
 * or the whole ping is that one or two tokens. This is the rule that stops
 * "…industry in the USA" resolving to Liberty All-Star Equity Fund (USA).
 */
import { ISO2, ISO3, US_STATE_CODES } from '@/lib/sonar/understand/geo-codes';

const ACRONYMS = [
  'US',
  'USA',
  'U.S.',
  'U.S.A.',
  'UK',
  'EU',
  'UAE',
  'AI',
  'IT',
  'ALL',
  'ONE',
  'ARE',
  'NOW',
  'CEO',
  'CFO',
  'CTO',
  'GDP',
  'CPI',
  'ETF',
  'IPO',
  'M&A',
  'SEC',
  'FED',
  'IRS',
  'DOD',
  'NATO',
  'OPEC',
  'EV',
  'EVS',
  'TOP',
  'BIG',
  'NEW',
  'ANY',
  'HAS',
  'CAN',
  'FOR',
  'AND',
  'THE',
];

export const TICKER_BLOCKLIST = new Set(
  [...ACRONYMS, ...ISO2, ...ISO3, ...US_STATE_CODES].map((s) => s.toUpperCase()),
);

/** Text immediately before a token that marks it as a ticker. */
export const TICKER_CUES =
  /\b(ticker|tickers|stock|stocks|shares|share price|price of|holders of|13f holders of|nyse:?|nasdaq:?)\s*$/i;

/** Text immediately before a geo token that marks it as geography. */
export const GEO_PREPOSITION = /\b(in|across|within|for|of|from|inside|throughout)\s+(the\s+)?$/i;
