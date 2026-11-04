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

/**
 * Nov 4: English words that are never a ticker when typed in lower case,
 * cue or no cue. "Which defense stocks are members of Congress trading?"
 * read "stocks are" as a cue and resolved to Alexandria Real Estate (ARE).
 * Upper case ("ARE") or a $ ("$are") still reads as the ticker.
 */
export const LOWERCASE_WORDS = new Set(
  (
    'a an the and or but nor so if as at by for from in into of off on onto out over to up with ' +
    'about above after against among around before behind below between beyond during except inside ' +
    'near since than through toward under until upon via within without ' +
    'am are is was were be been being do does did done has have had having will would shall should ' +
    'can could may might must ought need dare ' +
    'i me my we us our you your he him his she her it its they them their this that these those ' +
    'who whom whose which what when where why how whats ' +
    'all any both each every few many more most much other some such no not only own same too very ' +
    'just now then there here also again ever still yet ' +
    'one two three four five ten top best big new old low high hot good bad ' +
    'buy buys sell sells hold holds get gets go goes see make makes know think want like ' +
    'members member people trade trades trading stock stocks share shares fund funds'
  ).split(' '),
);

/** Text immediately before a token that marks it as a ticker. */
export const TICKER_CUES =
  /\b(ticker|tickers|stock|stocks|shares|share price|price of|holders of|13f holders of|nyse:?|nasdaq:?)\s*$/i;

/** Text immediately before a geo token that marks it as geography. */
export const GEO_PREPOSITION = /\b(in|across|within|for|of|from|inside|throughout)\s+(the\s+)?$/i;
