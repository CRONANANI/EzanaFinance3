/**
 * Polymarket matcher — server-side.
 *
 * Two-stage matching with hard relevance gate:
 * 1. Extract named entities (orgs, countries, people, tickers) from event
 * 2. Search Gamma using ONLY entity-based queries
 * 3. Hard gate: every candidate market must share a named entity with the article
 * 4. If no entity-direct matches, backfill with same-topic markets by tag_slug
 * 5. If still nothing, return empty — never show an irrelevant market
 *
 * URL construction uses groupSlug only (event-level slug). Markets
 * without a groupSlug are filtered out so we never emit a 404 link.
 *
 * findMatchingMarkets is SEMANTIC-first: it embeds the article and does a
 * pgvector nearest-neighbour query against the polymarket_market_index (built by
 * the index-polymarket cron), then layers the entity boost + sports reject +
 * volume/confidence gate on top. When embeddings/index aren't available (no key,
 * empty index, or a miss) it falls back to the original entity-based Gamma
 * search, so behaviour degrades gracefully rather than breaking.
 */
import { getAdminClient } from '@/lib/supabase';
import { embedText, hasEmbeddingKey } from '@/lib/embeddings';
import { cacheGetOrSet } from '@/lib/cache';

const GAMMA_BASE = 'https://gamma-api.polymarket.com';

const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

// Similarity gate (cosine, 0..1) and volume floor — tune empirically against the
// Polymarket example set. Env-overridable so they adjust without a redeploy.
const SIM_THRESHOLD = Number(process.env.POLYMARKET_SIM_THRESHOLD) || 0.78;
const MIN_VOLUME = Number(process.env.POLYMARKET_MIN_VOLUME) || 0;

/* ════════════════════════════════════════════════════════════════════
   Stop words — not emitted as search queries (entity-only queries).
   ════════════════════════════════════════════════════════════════════ */
// eslint-disable-next-line no-unused-vars -- vocabulary reference; matching uses KNOWN_ENTITIES only
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'at',
  'by',
  'from',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'report',
  'reports',
  'reported',
  'reporting',
  'say',
  'says',
  'said',
  'update',
  'updates',
  'news',
  'live',
  'breaking',
  'latest',
  'amid',
  'over',
  'new',
  'post',
  'posts',
  'see',
  'minutes',
  'minute',
  'signal',
  'signals',
  'steady',
  'cooling',
  'heating',
  'watch',
  'watching',
  'still',
  'just',
  'than',
  'into',
  'out',
  'up',
  'down',
  'but',
  'not',
  'has',
  'have',
  'had',
  'will',
  'can',
  'may',
  'week',
  'month',
  'year',
  'day',
  'days',
  'last',
  'next',
  'after',
  'before',
  'about',
  'between',
  'during',
  'through',
  'while',
  'since',
  'could',
  'would',
  'should',
  'also',
  'more',
  'most',
  'much',
  'many',
  'some',
  'other',
  'what',
  'when',
  'where',
  'which',
  'who',
  'how',
  'why',
  'does',
  'did',
  'doing',
  'steep',
  'price',
  'battle',
  'reverse',
  'fortunes',
  'pays',
  'sources',
  'according',
  'leaves',
  'stance',
  'frustrated',
  'opportunity',
  'investors',
  'lead',
  'securities',
  'fraud',
  'lawsuit',
  'apps',
  'coding',
  'vibe',
  'startups',
  'company',
  'companies',
  'stock',
  'stocks',
  'market',
  'markets',
  'trade',
  'trades',
  'trading',
  'buy',
  'sell',
  'billion',
  'million',
  'trillion',
  'percent',
  'point',
  'points',
  'high',
  'low',
  'close',
  'open',
  'opens',
  'opening',
  'rises',
  'rising',
  'falls',
  'falling',
  'surges',
  'surging',
  'drops',
  'dropping',
  'hits',
  'hitting',
  'reaches',
]);

/* ════════════════════════════════════════════════════════════════════
   Named Entity Dictionaries
   ════════════════════════════════════════════════════════════════════ */

const KNOWN_ENTITIES = new Map([
  /* ── Major tech companies ── */
  ['apple', { canonical: 'apple', type: 'company', topic: 'tech' }],
  ['iphone', { canonical: 'apple', type: 'product', topic: 'tech' }],
  ['ipad', { canonical: 'apple', type: 'product', topic: 'tech' }],
  ['macbook', { canonical: 'apple', type: 'product', topic: 'tech' }],
  ['app store', { canonical: 'apple', type: 'product', topic: 'tech' }],
  ['siri', { canonical: 'apple', type: 'product', topic: 'tech' }],
  ['google', { canonical: 'google', type: 'company', topic: 'tech' }],
  ['alphabet', { canonical: 'google', type: 'company', topic: 'tech' }],
  ['microsoft', { canonical: 'microsoft', type: 'company', topic: 'tech' }],
  ['amazon', { canonical: 'amazon', type: 'company', topic: 'tech' }],
  ['meta', { canonical: 'meta', type: 'company', topic: 'tech' }],
  ['facebook', { canonical: 'meta', type: 'company', topic: 'tech' }],
  ['nvidia', { canonical: 'nvidia', type: 'company', topic: 'tech' }],
  ['tesla', { canonical: 'tesla', type: 'company', topic: 'tech' }],
  ['openai', { canonical: 'openai', type: 'company', topic: 'tech' }],
  ['chatgpt', { canonical: 'openai', type: 'product', topic: 'tech' }],
  ['bytedance', { canonical: 'bytedance', type: 'company', topic: 'tech' }],
  ['tiktok', { canonical: 'bytedance', type: 'product', topic: 'tech' }],
  ['spacex', { canonical: 'spacex', type: 'company', topic: 'tech' }],
  ['samsung', { canonical: 'samsung', type: 'company', topic: 'tech' }],
  ['tsmc', { canonical: 'tsmc', type: 'company', topic: 'tech' }],
  ['intel', { canonical: 'intel', type: 'company', topic: 'tech' }],
  ['amd', { canonical: 'amd', type: 'company', topic: 'tech' }],
  ['broadcom', { canonical: 'broadcom', type: 'company', topic: 'tech' }],
  ['qualcomm', { canonical: 'qualcomm', type: 'company', topic: 'tech' }],
  ['palantir', { canonical: 'palantir', type: 'company', topic: 'tech' }],
  ['anthropic', { canonical: 'anthropic', type: 'company', topic: 'tech' }],
  ['netflix', { canonical: 'netflix', type: 'company', topic: 'tech' }],
  ['uber', { canonical: 'uber', type: 'company', topic: 'tech' }],
  ['airbnb', { canonical: 'airbnb', type: 'company', topic: 'tech' }],
  ['disney', { canonical: 'disney', type: 'company', topic: 'tech' }],
  ['alibaba', { canonical: 'alibaba', type: 'company', topic: 'tech' }],
  ['corning', { canonical: 'corning', type: 'company', topic: 'tech' }],

  /* ── Finance ── */
  ['jpmorgan', { canonical: 'jpmorgan', type: 'company', topic: 'finance' }],
  ['goldman sachs', { canonical: 'goldman sachs', type: 'company', topic: 'finance' }],
  ['morgan stanley', { canonical: 'morgan stanley', type: 'company', topic: 'finance' }],
  ['blackrock', { canonical: 'blackrock', type: 'company', topic: 'finance' }],
  ['citadel', { canonical: 'citadel', type: 'company', topic: 'finance' }],
  ['bridgewater', { canonical: 'bridgewater', type: 'company', topic: 'finance' }],
  ['berkshire', { canonical: 'berkshire', type: 'company', topic: 'finance' }],
  ['coinbase', { canonical: 'coinbase', type: 'company', topic: 'crypto' }],
  ['binance', { canonical: 'binance', type: 'company', topic: 'crypto' }],
  ['robinhood', { canonical: 'robinhood', type: 'company', topic: 'finance' }],
  ['fed', { canonical: 'federal reserve', type: 'org', topic: 'finance' }],
  ['federal reserve', { canonical: 'federal reserve', type: 'org', topic: 'finance' }],

  /* ── Crypto ── */
  ['bitcoin', { canonical: 'bitcoin', type: 'crypto', topic: 'crypto' }],
  ['btc', { canonical: 'bitcoin', type: 'crypto', topic: 'crypto' }],
  ['ethereum', { canonical: 'ethereum', type: 'crypto', topic: 'crypto' }],
  ['eth', { canonical: 'ethereum', type: 'crypto', topic: 'crypto' }],
  ['solana', { canonical: 'solana', type: 'crypto', topic: 'crypto' }],
  ['xrp', { canonical: 'xrp', type: 'crypto', topic: 'crypto' }],
  ['dogecoin', { canonical: 'dogecoin', type: 'crypto', topic: 'crypto' }],
  ['cardano', { canonical: 'cardano', type: 'crypto', topic: 'crypto' }],

  /* ── Geopolitics / Organizations ── */
  ['hezbollah', { canonical: 'hezbollah', type: 'org', topic: 'international-affairs' }],
  ['hamas', { canonical: 'hamas', type: 'org', topic: 'international-affairs' }],
  ['isis', { canonical: 'isis', type: 'org', topic: 'international-affairs' }],
  ['taliban', { canonical: 'taliban', type: 'org', topic: 'international-affairs' }],
  ['al-qaeda', { canonical: 'al-qaeda', type: 'org', topic: 'international-affairs' }],
  ['nato', { canonical: 'nato', type: 'org', topic: 'international-affairs' }],
  ['opec', { canonical: 'opec', type: 'org', topic: 'international-affairs' }],

  /* ── Countries ── */
  ['iran', { canonical: 'iran', type: 'country', topic: 'international-affairs' }],
  ['russia', { canonical: 'russia', type: 'country', topic: 'international-affairs' }],
  ['ukraine', { canonical: 'ukraine', type: 'country', topic: 'international-affairs' }],
  ['china', { canonical: 'china', type: 'country', topic: 'international-affairs' }],
  ['taiwan', { canonical: 'taiwan', type: 'country', topic: 'international-affairs' }],
  ['israel', { canonical: 'israel', type: 'country', topic: 'international-affairs' }],
  ['palestine', { canonical: 'palestine', type: 'country', topic: 'international-affairs' }],
  ['gaza', { canonical: 'gaza', type: 'country', topic: 'international-affairs' }],
  ['syria', { canonical: 'syria', type: 'country', topic: 'international-affairs' }],
  ['lebanon', { canonical: 'lebanon', type: 'country', topic: 'international-affairs' }],
  ['north korea', { canonical: 'north korea', type: 'country', topic: 'international-affairs' }],
  ['saudi arabia', { canonical: 'saudi arabia', type: 'country', topic: 'international-affairs' }],

  /* ── People ── */
  ['trump', { canonical: 'trump', type: 'person', topic: 'politics' }],
  ['biden', { canonical: 'biden', type: 'person', topic: 'politics' }],
  ['putin', { canonical: 'putin', type: 'person', topic: 'international-affairs' }],
  ['zelensky', { canonical: 'zelensky', type: 'person', topic: 'international-affairs' }],
  ['netanyahu', { canonical: 'netanyahu', type: 'person', topic: 'international-affairs' }],
  ['elon musk', { canonical: 'elon musk', type: 'person', topic: 'tech' }],
  ['musk', { canonical: 'elon musk', type: 'person', topic: 'tech' }],
  ['zuckerberg', { canonical: 'zuckerberg', type: 'person', topic: 'tech' }],
  ['sam altman', { canonical: 'sam altman', type: 'person', topic: 'tech' }],
  ['warren buffett', { canonical: 'warren buffett', type: 'person', topic: 'finance' }],
  ['pelosi', { canonical: 'pelosi', type: 'person', topic: 'politics' }],
  ['desantis', { canonical: 'desantis', type: 'person', topic: 'politics' }],
  ['harris', { canonical: 'harris', type: 'person', topic: 'politics' }],
  ['vance', { canonical: 'vance', type: 'person', topic: 'politics' }],
]);

/** Ticker → canonical entity name */
const TICKER_TO_ENTITY = {
  aapl: 'apple',
  nvda: 'nvidia',
  tsla: 'tesla',
  msft: 'microsoft',
  meta: 'meta',
  goog: 'google',
  amzn: 'amazon',
  glw: 'corning',
  nflx: 'netflix',
  dis: 'disney',
  baba: 'alibaba',
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
};

/* ════════════════════════════════════════════════════════════════════
   Entity Extraction (Rule-Based NER)
   ════════════════════════════════════════════════════════════════════ */

/**
 * Extract named entities from an event. Returns:
 * - entities: Map of canonical entity names → metadata
 * - topic: Gamma tag_slug for the dominant topic
 * - searchQueries: terms to send to Gamma (max 3, entity-only)
 */
function extractEntities(event) {
  const headline = String(event?.headline || event?.title || '');
  const summary = String(event?.summary || event?.body || event?.description || '');
  const fullText = `${headline} ${summary}`.toLowerCase();

  const found = new Map();

  /* Check tickers first */
  const symbols = normalizeSymbolsList(event?.impactedSymbols);
  for (const sym of symbols) {
    const mapped = TICKER_TO_ENTITY[sym.toLowerCase()];
    if (mapped && KNOWN_ENTITIES.has(mapped)) {
      found.set(mapped, KNOWN_ENTITIES.get(mapped));
    }
  }

  /* Check impactedKeywords */
  for (const kw of event?.impactedKeywords || []) {
    const lower = String(kw).toLowerCase().trim();
    if (KNOWN_ENTITIES.has(lower)) {
      const info = KNOWN_ENTITIES.get(lower);
      found.set(info.canonical, info);
    }
  }

  /* Scan full text for known entities */
  for (const [key, info] of KNOWN_ENTITIES) {
    if (key.length >= 3 && fullText.includes(key)) {
      found.set(info.canonical, info);
    }
  }

  /* Determine topic from the most common topic among found entities */
  let topic = null;
  if (found.size > 0) {
    const topicCounts = {};
    for (const [, inf] of found) {
      topicCounts[inf.topic] = (topicCounts[inf.topic] || 0) + 1;
    }
    topic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  /* Fallback topic from event.topic field (Gamma tag_slug values) */
  if (!topic && event?.topic) {
    const TOPIC_MAP = {
      Geopolitics: 'international-affairs',
      Conflict: 'international-affairs',
      Economy: 'finance',
      Tech: 'tech',
      Health: 'science',
      Politics: 'politics',
      Crypto: 'crypto',
      Finance: 'finance',
      Sports: 'sports',
      Business: 'finance',
    };
    topic = TOPIC_MAP[event.topic] || null;
  }

  /* Build search queries: canonical entity names only */
  const searchQueries = [...found.keys()].slice(0, 3);

  return { entities: found, topic, searchQueries };
}

/* ════════════════════════════════════════════════════════════════════
   Relevance Gate
   ════════════════════════════════════════════════════════════════════ */

/**
 * Score how relevant a Polymarket market is to the event's entities.
 * Returns 0 if no entity overlap (REJECT) or a positive score (ACCEPT).
 */
function relevanceScore(market, entityMap) {
  if (entityMap.size === 0) return 0;

  const haystack = [market?.question, market?.title, market?.groupItemTitle, market?.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = 0;

  // Entity overlap scoring — weight by entity type.
  for (const [canonical, info] of entityMap) {
    if (canonical.length < 3) continue;
    if (haystack.includes(canonical)) {
      if (info.type === 'company' || info.type === 'person') score += 3;
      else if (info.type === 'country' || info.type === 'org') score += 2;
      else if (info.type === 'crypto' || info.type === 'product') score += 2;
      else score += 1;
    }
  }

  // Hard reject: the Polymarket `crypto` tag (and others) sweeps up
  // sports/MMA/fight markets sponsored by crypto platforms. If the
  // market reads like a sports bet but the article entities aren't
  // sports-tagged, drop the score to 0 so it can't pass the gate.
  const sportsTerms =
    /\b(win by|ko\/tko|round \d|fight|bout|match|seed|playoff|championship|ufc|mma|boxing|nfl|nba|nhl|mlb|o\/u \d|spread|moneyline|over\/under)\b/i;
  if (sportsTerms.test(haystack)) {
    const hasSportsEntity = [...entityMap.values()].some((e) => e.topic === 'sports');
    if (!hasSportsEntity) {
      score = 0;
    }
  }

  return score;
}

/* ════════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════════ */

function normalizeSymbol(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/^\$+/, '').trim().toUpperCase();
}

function normalizeSymbolsList(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map(normalizeSymbol).filter((s) => s.length >= 2))];
}

function normalizeProbability(market) {
  const candidates = [market?.outcomePrices, market?.outcomes, market?.lastTradePrice];
  for (const c of candidates) {
    if (typeof c === 'number' && c > 0 && c < 1) return c;
    if (Array.isArray(c) && c.length > 0) {
      const first = Number(c[0]);
      if (Number.isFinite(first) && first > 0 && first < 1) return first;
    }
    if (typeof c === 'string') {
      try {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const f = Number(parsed[0]);
          if (Number.isFinite(f) && f > 0 && f < 1) return f;
        }
      } catch {
        /* not JSON */
      }
    }
  }
  return 0.5;
}

/** Gamma markets belong to a parent EVENT; the user-facing page is the event.
    The real event slug/title live on `market.events[0]` (the top-level
    groupSlug/eventSlug fields are usually empty on the /markets response). */
function eventOf(market) {
  return Array.isArray(market?.events) && market.events.length ? market.events[0] : null;
}

function eventTitleOf(market) {
  return market?.eventTitle || eventOf(market)?.title || null;
}

/**
 * Build a working Polymarket URL — STRICT.
 *
 * Polymarket's user-facing page is the EVENT: https://polymarket.com/event/{event-slug}.
 * Markets are outcomes *inside* an event; their own `slug` (often a date/hex
 * variant) 404s when placed in an /event/ URL. So we only ever use a verified
 * EVENT slug — from `events[0].slug` (the normal Gamma case) or an explicit
 * event/group slug field — and return null when none exists. We NEVER mint a
 * URL from the market-level slug, conditionId, or id.
 *
 * A null return means "no verified event page" → the caller drops the market
 * rather than rendering a dead/404 link.
 */
function buildMarketUrl(market) {
  const eventSlug =
    market?.eventSlug ||
    eventOf(market)?.slug ||
    market?.event_slug ||
    market?.groupSlug ||
    market?.group_slug ||
    null;
  if (eventSlug) return `https://polymarket.com/event/${eventSlug}`;
  return null;
}

function openActiveMarket(m) {
  return Boolean(m?.active) && !m?.closed;
}

/**
 * Map a Gamma/index market to the panel shape. Returns null when there is no
 * verified event URL so the pipeline can drop it — every rendered market is
 * guaranteed to open a real Polymarket event page.
 */
function formatMarket(m) {
  const url = buildMarketUrl(m);
  if (!url) return null;
  const question = String(m?.groupItemTitle ?? m?.question ?? m?.title ?? 'Market');
  const eventTitle = eventTitleOf(m);
  return {
    marketId: String(m?.id ?? m?.conditionId ?? ''),
    // Primary label is the EVENT title (matches the page you land on); the
    // specific market question is the secondary line only when it differs.
    marketTitle: eventTitle || question,
    marketQuestion: eventTitle && eventTitle !== question ? question : null,
    eventTitle: eventTitle || null,
    description: typeof m?.description === 'string' ? m.description : '',
    url,
    // Every rendered market now carries a verified event URL by construction.
    hasValidUrl: true,
    yesProbability: normalizeProbability(m),
    volume: Number(m?.volume ?? m?.volumeNum ?? 0),
    volume24hr: Number(m?.volume24hr ?? m?.volume24Hr ?? 0),
    liquidity: Number(m?.liquidity ?? 0),
    endDate: m?.endDate || m?.end_date_iso || null,
    icon: m?.icon || m?.image || null,
    category: m?.category || null,
  };
}

async function fetchGammaMarkets(query, fetchLimit = 20, tagSlug = null) {
  const params = new URLSearchParams({
    closed: 'false',
    active: 'true',
    limit: String(fetchLimit),
    order: 'volume',
    ascending: 'false',
  });
  if (query) params.set('q', query);
  if (tagSlug) params.set('tag_slug', tagSlug);

  try {
    const res = await fetch(`${GAMMA_BASE}/markets?${params}`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const payload = await res.json();
    const list = Array.isArray(payload) ? payload : payload?.data;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/* ════════════════════════════════════════════════════════════════════
   Main Matching Functions
   ════════════════════════════════════════════════════════════════════ */

/**
 * Find a single best Polymarket match for an event (used for badge rendering).
 * Returns null if no relevant market found — badge simply doesn't render.
 */
export async function findMatchingMarket(event) {
  try {
    const { entities, searchQueries } = extractEntities(event);

    if (searchQueries.length === 0) return null;

    const allCandidates = [];
    for (const q of searchQueries.slice(0, 2)) {
      const markets = await fetchGammaMarkets(q, 10);
      allCandidates.push(...markets);
    }

    const seen = new Set();
    const deduped = [];
    for (const m of allCandidates) {
      if (!openActiveMarket(m)) continue;
      const id = String(m?.id ?? m?.conditionId ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      deduped.push(m);
    }

    const scored = deduped
      .map((m) => ({ m, score: relevanceScore(m, entities) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || Number(b.m?.volume ?? 0) - Number(a.m?.volume ?? 0));

    // Walk candidates best-first and take the first with a verified event URL.
    // A market without a resolvable event page is dropped, never linked.
    for (const { m: best } of scored) {
      const url = buildMarketUrl(best);
      if (!url) continue;
      const question = String(best.groupItemTitle ?? best.question ?? best.title ?? 'Market');
      const eventTitle = eventTitleOf(best);
      return {
        marketId: String(best.id ?? best.conditionId ?? ''),
        marketTitle: eventTitle || question,
        marketQuestion: eventTitle && eventTitle !== question ? question : null,
        eventTitle: eventTitle || null,
        url,
        yesProbability: normalizeProbability(best),
        volume: Number(best.volume ?? best.volumeNum ?? 0),
      };
    }
    return null;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[polymarket-matcher]', err);
    }
    return null;
  }
}

/* ════════════════════════════════════════════════════════════════════
   Semantic matching (embeddings + pgvector) — the primary path
   ════════════════════════════════════════════════════════════════════ */

const SPORTS_TERMS_RE =
  /\b(win by|ko\/tko|round \d|fight|bout|match|seed|playoff|championship|ufc|mma|boxing|nfl|nba|nhl|mlb|o\/u \d|spread|moneyline|over\/under)\b/i;

/** Sports-junk reject (same rule as the lexical gate), reused semantically. */
function sportsRejected(haystack, entityMap) {
  if (!SPORTS_TERMS_RE.test(haystack)) return false;
  const hasSportsEntity = [...entityMap.values()].some((e) => e.topic === 'sports');
  return !hasSportsEntity;
}

/** Small bonus (capped) when a market shares a named entity with the article —
    a boost, not a gate, so dictionary hits rank up without blocking misses. */
function entityBonus(haystack, entityMap) {
  let bonus = 0;
  for (const [canonical] of entityMap) {
    if (canonical.length < 3) continue;
    if (haystack.includes(canonical)) bonus += 0.04;
  }
  return Math.min(bonus, 0.12);
}

/** polymarket_market_index row → the market shape formatMarket expects. */
function indexRowToMarket(row) {
  return {
    id: row.market_id,
    question: row.question,
    groupItemTitle: row.question,
    description: row.description || '',
    groupSlug: row.group_slug,
    eventSlug: row.event_slug,
    slug: row.slug,
    volume: Number(row.volume) || 0,
    volume24hr: Number(row.volume24hr) || 0,
    liquidity: Number(row.liquidity) || 0,
    endDate: row.end_date,
    icon: row.icon,
    category: row.category,
    lastTradePrice: row.yes_price,
    active: true,
  };
}

function articleText(event) {
  const headline = String(event?.headline || event?.title || '');
  const summary = String(event?.summary || event?.body || event?.description || '');
  return `${headline}\n${summary}`.trim();
}

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function articleCacheKey(event) {
  const id = event?.id ?? event?.articleId ?? event?.eventId ?? null;
  return id ? `pm:emb:id:${id}` : `pm:emb:h:${djb2(articleText(event))}`;
}

/** Is the index populated at all? (cached) — distinguishes "index empty, fall
    back to lexical" from "index live but nothing cleared the bar" (honest empty). */
async function indexPopulated(admin) {
  try {
    return await cacheGetOrSet('pm:index:populated', 300, async () => {
      const { count } = await admin
        .from('polymarket_market_index')
        .select('market_id', { count: 'exact', head: true });
      return (count || 0) > 0;
    });
  } catch {
    return false;
  }
}

/**
 * Semantic match: embed the article, pgvector NN query, then entity boost +
 * sports reject + confidence/volume gate. Returns:
 *   - { markets, noHighConfidence } when the index answered (markets or honest empty)
 *   - null when semantic is unavailable/failed → caller falls back to lexical
 */
async function findMatchingMarketsSemantic(event, TARGET) {
  const text = articleText(event);
  if (!text) return null;

  const vec = await cacheGetOrSet(articleCacheKey(event), 600, () => embedText(text)).catch(
    () => null,
  );
  if (!Array.isArray(vec) || !vec.length) return null; // embedding failed → fall back

  const admin = getAdminClient();
  let rows;
  try {
    const { data, error } = await admin.rpc('match_polymarket_markets', {
      query_embedding: vec,
      match_threshold: SIM_THRESHOLD,
      match_count: Math.max(TARGET * 3, 10),
      min_volume: MIN_VOLUME,
    });
    if (error) return null; // RPC/index problem → fall back
    rows = Array.isArray(data) ? data : [];
  } catch {
    return null;
  }

  if (!rows.length) {
    // nothing cleared the threshold — only honest-empty if the index is actually
    // populated; if it's empty (cron hasn't run), fall back to lexical instead.
    return (await indexPopulated(admin)) ? { markets: [], noHighConfidence: true } : null;
  }

  const { entities } = extractEntities({
    ...event,
    headline: event?.headline ?? event?.title ?? '',
  });

  const seen = new Set();
  const scored = [];
  for (const row of rows) {
    const id = String(row.market_id || '');
    if (!id || seen.has(id)) continue;
    const haystack = `${row.question || ''} ${row.description || ''}`.toLowerCase();
    if (sportsRejected(haystack, entities)) continue;
    seen.add(id);
    const sim = Number(row.similarity) || 0;
    scored.push({
      row,
      rank: sim + entityBonus(haystack, entities),
      volume: Number(row.volume) || 0,
    });
  }
  // rank by similarity(+entity boost), tie-break toward the more liquid market
  scored.sort((a, b) => b.rank - a.rank || b.volume - a.volume);

  const markets = scored
    .slice(0, TARGET)
    .map((s) => formatMarket(indexRowToMarket(s.row)))
    // Drop markets with no verified event URL (formatMarket returned null).
    .filter(Boolean)
    .slice(0, TARGET);

  return { markets, noHighConfidence: markets.length === 0 };
}

/**
 * Find up to 6 relevant Polymarket markets for an event. Semantic-first
 * (embeddings + pgvector); falls back to the entity-based Gamma search when
 * embeddings/index aren't available or the index is empty.
 */
export async function findMatchingMarkets(event, { limit = 6 } = {}) {
  const TARGET = Math.min(limit, 6);
  if (supaConfigured() && hasEmbeddingKey()) {
    try {
      const semantic = await findMatchingMarketsSemantic(event, TARGET);
      // Trust the semantic result whenever the index answered (markets found, or
      // an authoritative honest-empty). null means unavailable → fall back.
      if (semantic) return semantic;
    } catch {
      /* fall through to lexical */
    }
  }
  return findMatchingMarketsLexical(event, { limit });
}

/**
 * Lexical fallback: entity-direct Gamma search with the hard relevance gate.
 * Used when semantic matching is unavailable (no embedding key, empty index, or
 * a transient failure). This is the original matcher, preserved intact.
 */
async function findMatchingMarketsLexical(event, { limit = 6 } = {}) {
  const TARGET = Math.min(limit, 6);

  try {
    const { entities, topic, searchQueries } = extractEntities({
      ...event,
      headline: event?.headline ?? event?.title ?? '',
    });

    if (searchQueries.length === 0 && !topic) {
      return { markets: [], noHighConfidence: true };
    }

    const seenIds = new Set();
    const entityMatches = [];

    for (const q of searchQueries.slice(0, 3)) {
      if (entityMatches.length >= TARGET * 2) break;
      const fetched = await fetchGammaMarkets(q, 20);

      for (const m of fetched) {
        if (!openActiveMarket(m)) continue;
        const id = String(m?.id ?? m?.conditionId ?? '');
        if (!id || seenIds.has(id)) continue;

        const score = relevanceScore(m, entities);
        // Tightened from `=== 0` to `< 2` so that a single short-string
        // hit (e.g. "eth" matching inside "whether") doesn't qualify.
        if (score < 2) continue;

        seenIds.add(id);
        entityMatches.push({
          m,
          score,
          volume24hr: Number(m?.volume24hr ?? m?.volume24Hr ?? 0),
          volume: Number(m?.volume ?? m?.volumeNum ?? 0),
        });
      }
    }

    entityMatches.sort(
      (a, b) => b.score - a.score || b.volume24hr - a.volume24hr || b.volume - a.volume,
    );
    const topEntity = entityMatches.slice(0, TARGET);

    // No topic backfill: the Polymarket `crypto` / `politics` / etc.
    // tags include random high-volume markets (sports bets sponsored
    // by crypto platforms, etc.) that have nothing to do with the
    // article. Showing fewer relevant markets — or none at all — is
    // strictly better than padding with junk that erodes user trust.
    // Rows whose URL would fall back to the homepage are also
    // filtered out so we never present a dead-end link.
    const combined = topEntity
      .map((row) => formatMarket(row.m))
      // Drop markets with no verified event URL (formatMarket returned null).
      .filter(Boolean)
      .slice(0, TARGET);

    return {
      markets: combined,
      noHighConfidence: combined.length === 0,
    };
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[polymarket-multi-matcher]', err);
    }
    return { markets: [], noHighConfidence: false };
  }
}
