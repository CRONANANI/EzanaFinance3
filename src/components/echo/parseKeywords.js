/**
 * Parse Echo inline markup in paragraph text into a renderable token array.
 *
 * Supported tokens:
 *   [[kw:term-id]]display[[/kw]]          -> { type: 'keyword', keywordId, display }
 *   [[person:person-id]]Name[[/person]]   -> { type: 'person',  personId,  display }
 *
 * Input:  "Track [[kw:market-indices]]market indices[[/kw]] with [[person:jdoe]]J. Doe[[/person]]."
 * Output: [
 *   { type: 'text', content: 'Track ' },
 *   { type: 'keyword', keywordId: 'market-indices', display: 'market indices' },
 *   { type: 'text', content: ' with ' },
 *   { type: 'person', personId: 'jdoe', display: 'J. Doe' },
 *   { type: 'text', content: '.' },
 * ]
 *
 * The renderer assigns the FIRST marked occurrence of each id a scroll anchor
 * (`echo-anchor-term-{id}` / `echo-anchor-person-{id}`) so the Metadata sidebar
 * can jump to it. Author convention: mark each id exactly once.
 */
const TOKEN_REGEX = /\[\[(kw|person):([a-z0-9-]+)\]\]([\s\S]*?)\[\[\/(?:kw|person)\]\]/g;

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
    const kind = match[1];
    const id = match[2];
    const display = match[3];
    if (kind === 'person') {
      tokens.push({ type: 'person', personId: id, display });
    } else {
      tokens.push({ type: 'keyword', keywordId: id, display });
    }
    lastIndex = TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', content: text }];
}
