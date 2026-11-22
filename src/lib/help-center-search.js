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
  (
    'a an and are as at be by can do does for from get how i in is it my of on or the to use using what when where which who why will with you your me we our ' +
    /* Nov 22: conversational filler, so a long natural question is matched on what it is
       about ("cancel", "archive", "data") and not on "after", "too" or "guys". */
    'after before also all any anymore about again am been being but could did dont doesnt either else even ever guys hey hi hello im ive just let lets like maybe much need okay ok once only please really should so some still such than thanks that thats the their them then there these they this those though too us very want was way were would yall yes its'
  ).split(' '),
);
/* Nov 22: words that mean the same thing in a help question. A query token matches its
   own stem or any of these (the best field wins), so "archive my data" reaches the export
   and deletion articles and "unsubscribe" reaches cancelling. Stems, as stem() makes them. */
const SYNONYMS = {
  archiv: ['export', 'download', 'delet'],
  erase: ['delet'],
  eras: ['delet'],
  wipe: ['delet'],
  remov: ['delet'],
  purg: ['delet'],
  close: ['delet', 'cancel'],
  clos: ['delet', 'cancel'],
  unsubscrib: ['cancel'],
  stop: ['cancel'],
  end: ['cancel'],
  plan: ['subscription'],
  membership: ['subscription'],
  money: ['refund', 'billing'],
  charg: ['billing', 'payment'],
  bill: ['billing'],
  card: ['payment'],
  login: ['sign'],
  log: ['sign'],
  password: ['passwor'],
  stor: ['retain', 'retention', 'delet'],
  keep: ['retain', 'retention'],
};
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

/* Stems the suffix rules leave apart that mean one thing (British and American spellings,
   "-ation" nouns). */
const STEM_ALIASES = {
  cancell: 'cancel',
  cancellat: 'cancel',
  cancelat: 'cancel',
  subscript: 'subscription',
  subscrib: 'subscription',
  delet: 'delet',
};

export function stem(word) {
  let out = word;
  for (const suf of SUFFIXES) {
    if (word.endsWith(suf) && word.length - suf.length >= 4) {
      const base = word.slice(0, -suf.length);
      out = suf === 'ies' ? `${base}y` : base;
      /* "setting" -> "set", "planning" -> "plan" (never "billing" -> "bil"). */
      if (/([bdgmnprt])\1$/.test(out)) out = out.slice(0, -1);
      break;
    }
  }
  /* A final silent e goes, so "delete" meets "deleting" and "archive" meets "archived". */
  if (out === word && out.length >= 5 && out.endsWith('e') && !out.endsWith('ee'))
    out = out.slice(0, -1);
  return STEM_ALIASES[out] || out;
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
  /* Nov 22: how rare each stem is in its help center. A token found in most articles
     ("data", "account") says little about which article is meant, so its weight shrinks;
     a rare one ("cancel", "archive") counts in full. */
  const df = { user: new Map(), partner: new Map() };
  const count = { user: 0, partner: 0 };
  for (const d of docs) {
    count[d.audience] += 1;
    const all = new Set([
      ...d.fields.title,
      ...d.fields.keywords,
      ...d.fields.headings,
      ...d.fields.body,
    ]);
    for (const t of all) df[d.audience].set(t, (df[d.audience].get(t) || 0) + 1);
  }
  docs.idf = (audience, token) => {
    const n = count[audience] || 1;
    const k = df[audience]?.get(token) || 0;
    /* 1 for a stem in no article, toward 0.25 for one in every article. */
    return Math.max(0.25, Math.min(1, Math.log((n + 1) / (k + 0.5)) / Math.log(n + 1)));
  };
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
    alts: SYNONYMS[stem(t)] || [],
  }));
  const phrase = raw.join(' ');

  const scored = [];
  const index = getHelpIndex();
  for (const doc of index) {
    if (audience && doc.audience !== audience) continue;
    let score = 0;
    let matched = 0;
    for (const { token, raw: r, prefix: p, alts } of tokens) {
      let s = Math.max(fieldScore(doc, token, p), p ? fieldScore(doc, r, true) : 0);
      let hit = token;
      for (const a of alts) {
        const sa = fieldScore(doc, a, false) * 0.8;
        if (sa > s) {
          s = sa;
          hit = a;
        }
      }
      if (s > 0) matched += 1;
      score += s * index.idf(doc.audience, hit);
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
