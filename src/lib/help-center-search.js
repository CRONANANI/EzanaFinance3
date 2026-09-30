/**
 * Help Center lexical search: one index over both help centers, used by the
 * the support centre model (support-model.js), the article pages, and
 * /api/help-center/ask as its retrieval fallback. Pure and synchronous, built
 * from the static content module, so it works with no network and no
 * database: search never depends on the AI endpoint being up.
 *
 * Matching is token based rather than substring based, so "connect brokerage",
 * "link my broker", "connecting" and "alpaca" all find
 * connecting-your-brokerage:
 *   - text is lower-cased, stripped of tags and entities and split on
 *     non-alphanumerics; stopwords are dropped;
 *   - each token gets a light suffix stem (connecting/connection -> connect,
 *     brokerage/brokers -> broker), applied identically to queries and docs;
 *   - the LAST query token also matches as a prefix, so "conn" finds
 *     "connect" while the user is still typing;
 *   - fields are weighted: title 5, keywords 4, headings 2, body 1.
 * Every query token must match somewhere (AND); if nothing matches all of
 * them, the best partial matches are returned instead.
 */
import {
  USER_ARTICLES,
  PARTNER_ARTICLES,
  USER_CATEGORIES,
  PARTNER_CATEGORIES,
} from './help-center-content.js';

const STOPWORDS = new Set(
  'a an and are as at be by can do does for from get how i in is it my of on or the to use using what when where which who why will with you your me we our'.split(
    ' ',
  ),
);
const SUFFIXES = [
  'ings',
  'ing',
  'ions',
  'ion',
  'ages',
  'age',
  'ments',
  'ment',
  'ies',
  'es',
  'ed',
  's',
];
const WEIGHTS = { title: 5, keywords: 4, headings: 2, body: 1 };

const ENTITIES = { amp: '&', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', nbsp: ' ' };

/** Plain text from the article HTML. */
export function htmlToText(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? ' ')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stem(word) {
  for (const suf of SUFFIXES) {
    if (word.endsWith(suf) && word.length - suf.length >= 4) {
      const base = word.slice(0, -suf.length);
      return suf === 'ies' ? `${base}y` : base;
    }
  }
  return word;
}

/** Tokens of a string, stopwords removed, stemmed. */
export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .map(stem);
}

function categoryIndex(categories) {
  const byTitle = new Map(categories.map((c) => [c.title, c.id]));
  return (title) => byTitle.get(title) || null;
}

let cached = null;

/** The index, built once per process / page load. */
export function getHelpIndex() {
  if (cached) return cached;
  const docs = [];
  for (const [audience, articles, categories] of [
    ['user', USER_ARTICLES, USER_CATEGORIES],
    ['partner', PARTNER_ARTICLES, PARTNER_CATEGORIES],
  ]) {
    const catId = categoryIndex(categories);
    for (const [slug, a] of Object.entries(articles)) {
      const text = htmlToText(a.content);
      const headings = [...String(a.content || '').matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)]
        .map((m) => htmlToText(m[1]))
        .filter(Boolean);
      const keywords = Array.isArray(a.keywords) ? a.keywords : [];
      docs.push({
        audience,
        slug,
        title: a.title,
        category: a.category || null,
        categoryId: catId(a.category),
        url: `/help-center/${audience}/article/${slug}`,
        keywords,
        headings,
        excerpt: text.slice(0, 220),
        text,
        fields: {
          title: new Set(tokenize(a.title)),
          keywords: new Set(tokenize(keywords.join(' '))),
          headings: new Set(tokenize(headings.join(' '))),
          body: new Set(tokenize(text)),
        },
      });
    }
  }
  cached = docs;
  return docs;
}

function fieldScore(doc, token, prefix) {
  let best = 0;
  for (const [field, set] of Object.entries(doc.fields)) {
    const w = WEIGHTS[field];
    if (w <= best) continue;
    if (set.has(token)) best = w;
    else if (prefix && token.length >= 2) {
      for (const t of set) {
        if (t.startsWith(token)) {
          best = w * 0.8;
          break;
        }
      }
    }
  }
  return best;
}

/**
 * Search the help centers.
 * @param {string} query
 * @param {{ audience?: 'user'|'partner'|null, limit?: number, prefix?: boolean }} [opts]
 *   prefix: treat the last query token as a prefix (as-you-type). Default true.
 * @returns {Array<{audience,slug,title,category,categoryId,url,excerpt,text,score}>}
 */
export function searchHelp(query, { audience = null, limit = 5, prefix = true } = {}) {
  const raw = String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t));
  if (!raw.length) return [];
  const endsMidWord = prefix && /[a-z0-9]$/i.test(String(query).trim());
  const tokens = raw.map((t, i) => ({
    token: stem(t),
    raw: t,
    prefix: endsMidWord && i === raw.length - 1,
  }));
  const phrase = raw.join(' ');

  const scored = [];
  for (const doc of getHelpIndex()) {
    if (audience && doc.audience !== audience) continue;
    let score = 0;
    let matched = 0;
    for (const { token, raw: r, prefix: p } of tokens) {
      const s = Math.max(fieldScore(doc, token, p), p ? fieldScore(doc, r, true) : 0);
      if (s > 0) matched += 1;
      score += s;
    }
    if (!matched) continue;
    if (doc.title.toLowerCase().includes(phrase)) score += 6;
    scored.push({ doc, score, all: matched === tokens.length });
  }
  const full = scored.filter((s) => s.all);
  const pool = full.length ? full : scored;
  return pool
    .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title))
    .slice(0, limit)
    .map(({ doc, score }) => ({
      audience: doc.audience,
      slug: doc.slug,
      title: doc.title,
      category: doc.category,
      categoryId: doc.categoryId,
      url: doc.url,
      excerpt: doc.excerpt,
      text: doc.text,
      score,
    }));
}
