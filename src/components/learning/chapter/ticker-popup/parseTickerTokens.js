/**
 * Parse text containing inline ticker tokens into a renderable array.
 *
 * Input:  "Look at how [[ticker:AAPL]]Apple[[/ticker]] compounded since 2010."
 * Output: [
 *   { type: 'text', content: 'Look at how ' },
 *   { type: 'ticker', symbol: 'AAPL', display: 'Apple' },
 *   { type: 'text', content: ' compounded since 2010.' },
 * ]
 */
const TICKER_TOKEN_REGEX = /\[\[ticker:([A-Z][A-Z0-9.-]{0,9})\]\](.*?)\[\[\/ticker\]\]/gs;

export function parseTickerTokens(text) {
  if (typeof text !== 'string' || !text) {
    return [{ type: 'text', content: text || '' }];
  }

  const tokens = [];
  let lastIndex = 0;
  let match;
  TICKER_TOKEN_REGEX.lastIndex = 0;

  while ((match = TICKER_TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    tokens.push({
      type: 'ticker',
      symbol: match[1].toUpperCase(),
      display: match[2],
    });
    lastIndex = TICKER_TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', content: text }];
}
