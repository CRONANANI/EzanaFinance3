/**
 * Parse text containing inline keyword tokens into a renderable array.
 *
 * Input:  "Track [[kw:market-indices]]market indices[[/kw]] daily."
 * Output: [
 *   { type: 'text', content: 'Track ' },
 *   { type: 'keyword', keywordId: 'market-indices', display: 'market indices' },
 *   { type: 'text', content: ' daily.' },
 * ]
 */
const TOKEN_REGEX = /\[\[kw:([a-z0-9-]+)\]\](.*?)\[\[\/kw\]\]/gs;

export function parseKeywords(text) {
  if (typeof text !== 'string' || !text) return [{ type: 'text', content: text || '' }];

  const tokens = [];
  let lastIndex = 0;
  let match;

  TOKEN_REGEX.lastIndex = 0;
  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    tokens.push({
      type: 'keyword',
      keywordId: match[1],
      display: match[2],
    });
    lastIndex = TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', content: text }];
}
