/**
 * Help center follow-up suggestions (Nov 21 2026).
 *
 * The questions offered under an AI answer come from the articles that answered the
 * reader's own search: each help article carries authored "Q: ... A: ..." pairs, so the
 * suggestions are the questions those articles already answer, ranked by how close they
 * sit to what the reader asked. Nothing is generated, so a suggestion is always related
 * to the original search and always answerable from the help center.
 *
 * Pure and client-safe; unit-tested in scripts/check-help-follow-ups.mjs.
 */

const STOP = new Set(
  'a an and are as at be but by can do does for from get got how i if in into is it its me my of on or our so than that the their them then there these this to us was we what when where which who why will with you your'.split(
    ' ',
  ),
);

const decode = (s) =>
  String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&(?:ldquo|rdquo|quot);/g, '"')
    .replace(/&(?:lsquo|rsquo|#39|apos);/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/g, ' ');

/** Plain text from an authored article body (HTML string or array of HTML strings). */
export function articleText(content) {
  const html = Array.isArray(content) ? content.join(' ') : String(content || '');
  return decode(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** The authored questions in an article's text ("Q: Do I get a refund?"). */
export function articleQuestions(text) {
  const out = [];
  for (const m of String(text || '').matchAll(/\bQ:\s*([^?]{6,160}\?)/g)) {
    const q = m[1].replace(/\s+/g, ' ').trim();
    if (q && !out.includes(q)) out.push(q);
  }
  return out;
}

/** A light stem so "canceling", "cancel" and "cancellation" meet. */
const stem = (w) =>
  w
    .replace(/(?:lation|ations|ation|ings|ing|ed|es|s)$/, '')
    .replace(/(?:ll|l)$/, 'l')
    .slice(0, 6);

export function keyWords(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w))
      .map(stem),
  );
}

const overlap = (a, b) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const w of a) if (b.has(w)) n += 1;
  return n / Math.min(a.size, b.size);
};

/**
 * Up to `max` follow-up questions for a search, from the articles that answered it.
 *
 * @param {string} query the reader's search
 * @param {{ slug?: string, title?: string, text: string }[]} articles in answer order
 * @returns {string[]}
 */
export function helpFollowUps(query, articles, { max = 3 } = {}) {
  const asked = keyWords(query);
  const seen = new Set();
  const scored = [];
  (Array.isArray(articles) ? articles : []).forEach((art, rank) => {
    for (const q of articleQuestions(art?.text)) {
      const norm = q.toLowerCase();
      if (seen.has(norm)) continue;
      seen.add(norm);
      const words = keyWords(q);
      const sim = overlap(asked, words);
      /* The reader's own question, reworded, is not a follow-up. */
      if (sim >= 0.8 && words.size <= asked.size + 1) continue;
      /* Closer to the search first, then the better-matching article, then authored order. */
      scored.push({ q, score: sim * 2 + 1 / (rank + 1), rank, order: scored.length });
    }
  });
  return scored
    .sort((a, b) => b.score - a.score || a.rank - b.rank || a.order - b.order)
    .slice(0, max)
    .map((s) => s.q);
}
