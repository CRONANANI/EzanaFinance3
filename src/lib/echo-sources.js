/**
 * Echo source notes (Nov 18 2026). Draft articles carry editorial fact-check
 * markers such as "[VERIFY: INDEC]" or "[VERIFY: market data]". Readers never
 * see the bracket. In paragraph text each marker becomes a numbered source
 * reference ([[src:N]]note[[/src]]) that the article renders as a small
 * superscript number opening a card with the note (and a link when the note
 * holds one). Everywhere else (titles, excerpts, captions, figure text, the
 * globe rail, keyword cards) the marker is simply removed.
 *
 * The rows in public.echo_articles are not modified. hasUnverifiedMarkers
 * still sees articles that carried markers (the `unverified` flag set in
 * echo-data.js), so they stay noindex until the markers are resolved at the
 * source.
 */
export const VERIFY_RE = /\s*\[VERIFY:?\s*([^\]]*)\]/gi;

export function hasVerify(text) {
  return typeof text === 'string' && /\[VERIFY/i.test(text);
}

/** Remove markers, tidying the space they leave before punctuation. */
export function stripVerify(text) {
  if (typeof text !== 'string' || !hasVerify(text)) return text;
  return text
    .replace(VERIFY_RE, '')
    .replace(/\s+([,.;:!?)])/g, '$1')
    .replace(/\s{2,}/g, ' ');
}

export function stripVerifyDeep(value) {
  if (typeof value === 'string') return stripVerify(value);
  if (Array.isArray(value)) return value.map(stripVerifyDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripVerifyDeep(v);
    return out;
  }
  return value;
}

/**
 * Article blocks in reading order: paragraph text gets numbered source
 * references, every other string loses its markers.
 */
export function citeVerifyBlocks(blocks) {
  if (!Array.isArray(blocks)) return blocks;
  let n = 0;
  return blocks.map((b) => {
    if (b && b.type === 'paragraph' && typeof b.text === 'string' && hasVerify(b.text)) {
      const text = b.text.replace(VERIFY_RE, (_, note) => {
        n += 1;
        const clean = String(note || '').trim() || 'Source pending';
        return `[[src:${n}]]${clean}[[/src]]`;
      });
      return { ...stripVerifyDeep({ ...b, text: '' }), text };
    }
    return stripVerifyDeep(b);
  });
}
