/**
 * /home News Center ("The Wire"): the feed model. Pure (no React, no `@/`
 * imports) so scripts/check-news-center.mjs can test it under plain Node.
 *
 *   interest profile + holdings/watchlist  ->  buildInterestIndex()
 *   Echo hub cards                         ->  scoreEcho()
 *   market news rows                       ->  normalizeNews() -> scoreNews()
 *   community feed posts                   ->  pickCommunity()
 *   all of the above                       ->  composeFeed()
 *
 * Nothing here invents content: every item is a real Echo article, a real
 * news row or a real community post, only ordered by the reader's interests.
 */

export const WIRE_NAME = 'The Wire';

export const WIRE_TABS = [
  { id: 'for-you', label: 'For you' },
  { id: 'echo', label: 'Echo' },
  { id: 'news', label: 'News' },
  { id: 'community', label: 'Community' },
];

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const NEWS_MAX_AGE_MS = 7 * DAY_MS;
const FALLBACK_TICKER_SCORE = 50;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Profile dimension (as /api/user/interest-profile returns it) -> the word
   used in the "why you are seeing this" line. */
const TERM_DIMS = [
  ['themes', 'theme'],
  ['sectors', 'sector'],
  ['industries', 'industry'],
  ['entities', 'entity'],
  ['geographies', 'region'],
  ['assetClasses', 'asset class'],
];

/* Echo article_meta dimensions that can match a profile term. */
const ECHO_META_DIMS = [
  'themes',
  'sectors',
  'industries',
  'institutions',
  'investors',
  'government',
  'geos',
  'assetClasses',
];

/* Slot order of the For you list after the lead story. */
const FOR_YOU_PATTERN = [
  'news',
  'echo',
  'creator',
  'news',
  'echo',
  'trending',
  'news',
  'echo',
  'news',
];

const upper = (v) =>
  String(v || '')
    .trim()
    .toUpperCase();
const lower = (v) =>
  String(v || '')
    .trim()
    .toLowerCase();

/**
 * The reader's interests as two lookups: tickers (UPPER -> 0..100) and terms
 * (lowercase -> { label, dim, score }). `fallbackTickers` (holdings and
 * watchlist symbols) seed the index so a reader whose profile has not been
 * computed yet still gets a relevant feed. With personalization switched off
 * the index is empty and the feed falls back to recency.
 */
export function buildInterestIndex(profile, fallbackTickers = []) {
  const tickers = new Map();
  const terms = new Map();
  const enabled = profile?.personalization_enabled !== false;
  if (!enabled) return { enabled: false, tickers, terms, size: 0 };

  for (const t of fallbackTickers || []) {
    const k = upper(t);
    if (k) tickers.set(k, FALLBACK_TICKER_SCORE);
  }
  const interests = profile?.interests || {};
  for (const row of interests.tickers || []) {
    const k = upper(row?.value);
    const score = Number(row?.score) || 0;
    if (k && score > 0) tickers.set(k, Math.max(tickers.get(k) || 0, Math.min(100, score)));
  }
  for (const [dim, word] of TERM_DIMS) {
    for (const row of interests[dim] || []) {
      const k = lower(row?.value);
      const score = Number(row?.score) || 0;
      if (!k || score <= 0) continue;
      const prev = terms.get(k);
      if (!prev || prev.score < score) {
        terms.set(k, { label: String(row.value).trim(), dim: word, score: Math.min(100, score) });
      }
    }
  }
  return { enabled: true, tickers, terms, size: tickers.size + terms.size };
}

/** Best three matches, diminishing: 1, 1/2, 1/4. Capped at 100. */
function blend(matches) {
  const top = [...matches].sort((a, b) => b.score - a.score).slice(0, 3);
  const interest = Math.min(
    100,
    top.reduce((sum, m, i) => sum + m.score / 2 ** i, 0),
  );
  return { interest, reason: top[0] ? { kind: top[0].kind, label: top[0].label } : null };
}

function toMs(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/** Echo hub card -> { score, reason }. */
export function scoreEcho(card, idx, now = Date.now()) {
  const matches = [];
  for (const t of card?.tickers || []) {
    const k = upper(t);
    if (idx.tickers.has(k)) matches.push({ kind: 'ticker', label: k, score: idx.tickers.get(k) });
  }
  const meta = card?.meta || {};
  for (const dim of ECHO_META_DIMS) {
    for (const v of Array.isArray(meta[dim]) ? meta[dim] : []) {
      const hit = idx.terms.get(lower(v));
      if (hit) matches.push({ kind: hit.dim, label: hit.label, score: hit.score });
    }
  }
  const { interest, reason } = blend(matches);
  const at = toMs(card?.publishedAt);
  const ageDays = at ? Math.max(0, now - at) / DAY_MS : 365;
  const recency = 30 * Math.exp(-ageDays / 45);
  return { score: interest + recency + (card?.featured ? 8 : 0), reason };
}

/** A market news row (either provider shape) -> one item shape, or null. */
export function normalizeNews(raw) {
  const title = String(raw?.headline || raw?.title || '').trim();
  const url = String(raw?.url || '').trim();
  if (!title || !/^https?:\/\//i.test(url)) return null;
  return {
    title,
    url,
    source: String(raw?.source || '').trim(),
    summary: String(raw?.summary || '').trim(),
    at: toMs(raw?.datetime ?? raw?.time_published),
  };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * News item -> { score, reason }. A ticker counts only as a whole,
 * case-sensitive word of two or more characters (so "A" or "it" never match);
 * a term counts as a case-insensitive phrase of four or more characters.
 */
export function scoreNews(item, idx, now = Date.now()) {
  const text = `${item.title} ${item.summary || ''}`;
  const textLower = text.toLowerCase();
  const matches = [];
  for (const [sym, score] of idx.tickers) {
    if (sym.length < 2) continue;
    const re = new RegExp(`(^|[^A-Za-z0-9])${escapeRe(sym)}([^A-Za-z0-9]|$)`);
    if (re.test(text)) matches.push({ kind: 'ticker', label: sym, score });
  }
  for (const [term, hit] of idx.terms) {
    if (term.length < 4) continue;
    if (textLower.includes(term))
      matches.push({ kind: hit.dim, label: hit.label, score: hit.score });
  }
  const { interest, reason } = blend(matches);
  const ageHours = item.at ? Math.max(0, now - item.at) / HOUR_MS : 96;
  const recency = 40 * Math.exp(-ageHours / 18);
  return { score: interest * 0.8 + recency, reason };
}

/**
 * The two community slots.
 *   creatorPost: the newest post from the reader's favourite creator, where
 *     "favourite" is the followed author whose recent posts the reader liked
 *     most (ties: whoever posted most recently).
 *   trendingPost: the top trending post that is not the same post.
 * `following` and `trending` are /api/community/feed post arrays.
 */
export function pickCommunity(following = [], trending = [], selfId = null) {
  const byAuthor = new Map();
  for (const p of following || []) {
    const id = p?.author?.id;
    if (!id || id === selfId) continue;
    const at = toMs(p.created_at) || 0;
    const e = byAuthor.get(id) || { likes: 0, latest: null, latestAt: -1 };
    if (p.liked_by_me) e.likes += 1;
    if (at > e.latestAt) {
      e.latest = p;
      e.latestAt = at;
    }
    byAuthor.set(id, e);
  }
  const best = [...byAuthor.values()].sort(
    (a, b) => b.likes - a.likes || b.latestAt - a.latestAt,
  )[0];
  const creatorPost = best?.latest || null;
  const trendingPost =
    (trending || []).find((p) => p?.id && p.id !== creatorPost?.id && p?.author?.id !== selfId) ||
    null;
  return { creatorPost, trendingPost, creatorLikes: best?.likes || 0 };
}

/** '12m', '5h', '3d', then 'Nov 02'. */
export function relativeTime(at, now = Date.now()) {
  const t = toMs(at);
  if (!t) return '';
  const diff = Math.max(0, now - t);
  if (diff < HOUR_MS) return `${Math.max(1, Math.round(diff / 60000))}m`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h`;
  if (diff < 7 * DAY_MS) return `${Math.floor(diff / DAY_MS)}d`;
  const d = new Date(t);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** The "why you are seeing this" line; '' when there is no match. */
export function reasonText(reason) {
  if (!reason?.label) return '';
  return reason.kind === 'ticker'
    ? `Because you follow ${reason.label}`
    : `Matches your interest in ${reason.label}`;
}

function echoItem(card, scored) {
  return {
    key: `echo:${card.id}`,
    kind: 'echo',
    title: card.title || '',
    dek: card.excerpt || '',
    href: `/ezana-echo/${card.id}`,
    external: false,
    source: 'Ezana Echo',
    byline: card.author || 'Ezana Editorial',
    at: toMs(card.publishedAt),
    mins: card.readTime || 1,
    image: card.heroImage?.src || card.coverImage || null,
    imageAlt: card.heroImage?.alt || '',
    reason: scored.reason,
    score: scored.score,
  };
}

function newsItem(n, scored) {
  return {
    key: `news:${n.url}`,
    kind: 'news',
    title: n.title,
    dek: n.summary || '',
    href: n.url,
    external: true,
    source: n.source || 'News',
    at: n.at,
    image: null,
    reason: scored.reason,
    score: scored.score,
  };
}

function postItem(post, kind, creatorLikes) {
  const name = post.author?.name || 'Member';
  return {
    key: `${kind}:${post.id}`,
    kind,
    title: post.title || post.excerpt || '',
    dek: post.title ? post.excerpt || '' : '',
    href: `/community?post=${post.id}`,
    external: false,
    source: name,
    handle: post.author?.username || null,
    avatar: post.author?.avatar_url || null,
    at: toMs(post.created_at),
    likes: post.likes_count || 0,
    comments: post.comments_count || 0,
    ticker: post.mentioned_ticker || null,
    image: null,
    reason: null,
    note:
      kind === 'trending'
        ? 'Trending in the community'
        : creatorLikes > 0
          ? `New from ${name}, a creator you engage with most`
          : `New from ${name}, who you follow`,
    score: 0,
  };
}

/**
 * Everything the News Center renders.
 *   { lead, forYou, echo, news, community, personalized }
 * `lead` is the top Echo story (preferring one with an image); `forYou` mixes
 * the rest by FOR_YOU_PATTERN; the other three are the per-tab lists.
 */
export function composeFeed({
  echoCards = [],
  newsRows = [],
  following = [],
  trending = [],
  idx,
  selfId = null,
  now = Date.now(),
  limit = 8,
} = {}) {
  const index = idx || buildInterestIndex(null);

  const echo = (echoCards || [])
    .filter((c) => c?.id && c?.title)
    .map((c) => echoItem(c, scoreEcho(c, index, now)))
    .sort((a, b) => b.score - a.score || (b.at || 0) - (a.at || 0));

  const seen = new Set();
  const news = [];
  for (const raw of newsRows || []) {
    const n = normalizeNews(raw);
    if (!n) continue;
    if (n.at && now - n.at > NEWS_MAX_AGE_MS) continue;
    const dedupe = n.title.toLowerCase();
    if (seen.has(n.url) || seen.has(dedupe)) continue;
    seen.add(n.url);
    seen.add(dedupe);
    news.push(newsItem(n, scoreNews(n, index, now)));
  }
  news.sort((a, b) => b.score - a.score || (b.at || 0) - (a.at || 0));

  const { creatorPost, trendingPost, creatorLikes } = pickCommunity(following, trending, selfId);
  const creator = creatorPost ? postItem(creatorPost, 'creator', creatorLikes) : null;
  const trend = trendingPost ? postItem(trendingPost, 'trending', 0) : null;
  const community = [creator, trend].filter((p) => p && p.title);

  const lead = echo.find((e) => e.image) || echo[0] || null;
  const pools = {
    echo: echo.filter((e) => e !== lead),
    news: [...news],
    creator: creator?.title ? [creator] : [],
    trending: trend?.title ? [trend] : [],
  };
  const forYou = [];
  let guard = 0;
  while (forYou.length < limit && guard < 4) {
    let took = false;
    for (const slot of FOR_YOU_PATTERN) {
      if (forYou.length >= limit) break;
      const next = pools[slot].shift();
      if (next) {
        forYou.push(next);
        took = true;
      }
    }
    if (!took) break;
    guard += 1;
  }

  return {
    lead,
    forYou,
    echo: echo.slice(0, limit + 1),
    news: news.slice(0, limit + 1),
    community,
    personalized: index.enabled && index.size > 0,
  };
}
