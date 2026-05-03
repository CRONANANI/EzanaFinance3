/**
 * Polymarket matcher — server-side.
 *
 * Two-stage matching: entity extraction → Gamma search → hard relevance gate.
 * A market must share at least one named entity with the article to be shown.
 * If no markets pass the gate, the UI shows "No related markets found" —
 * better than an irrelevant match.
 */

const GAMMA_BASE = 'https://gamma-api.polymarket.com';

/* ════════════════════════════════════════════════════════════════════
   Stop words — filtered from search queries and entity extraction.
   ════════════════════════════════════════════════════════════════════ */
const STOP_WORDS = new Set([
  'the','a','an','and','or','of','to','in','on','for','with','at','by','from','as',
  'is','are','was','were','be','been','being','it','its','this','that','these','those',
  'report','reports','reported','reporting','say','says','said','update','updates',
  'news','live','breaking','latest','amid','over','new','post','posts','see',
  'minutes','minute','signal','signals','steady','cooling','heating','watch','watching',
  'still','just','than','into','out','up','down','but','not','has','have','had',
  'will','can','may','week','month','year','day','days','last','next',
  'after','before','about','between','during','through','while','since',
  'could','would','should','also','more','most','much','many','some','other',
  'what','when','where','which','who','how','why','been','does','did','doing',
  'steep','price','battle','reverse','fortunes','pays','sources','according',
  'despite','faces','facing','warns','shows','showing',
  'opens','opening','rises','rising','falls','falling','surges','surging',
  'drops','dropping','hits','hitting','reaches','reaching',
]);

/* ════════════════════════════════════════════════════════════════════
   Named entity dictionaries — proper nouns the system recognizes.
   ════════════════════════════════════════════════════════════════════ */

/** Organizations, political groups, militant groups, international bodies */
const KNOWN_ORGS = new Set([
  'hezbollah','hamas','isis','taliban','al-qaeda','nato','opec','un','eu',
  'who','imf','worldbank','fed','federal reserve','ecb','boj','pboc',
  'sec','cftc','doj','fbi','cia','nsa','pentagon',
  'openai','nvidia','apple','google','alphabet','microsoft','amazon','meta',
  'tesla','spacex','twitter','tiktok','bytedance','samsung','tsmc','intel',
  'amd','broadcom','qualcomm','palantir','coinbase','binance','robinhood',
  'jpmorgan','goldman sachs','morgan stanley','blackrock','citadel','bridgewater',
  'berkshire hathaway','softbank',
]);

/** Countries and major regions */
const KNOWN_COUNTRIES = new Set([
  'us','usa','united states','america','china','russia','ukraine','iran','iraq',
  'israel','palestine','gaza','syria','lebanon','turkey','india','pakistan',
  'north korea','south korea','japan','taiwan','saudi arabia','uae',
  'uk','united kingdom','britain','france','germany','italy','spain',
  'brazil','mexico','argentina','canada','australia','egypt','nigeria','south africa',
]);

/** People — political figures, business leaders */
const KNOWN_PEOPLE = new Set([
  'trump','biden','obama','putin','xi jinping','zelensky','netanyahu',
  'elon musk','jeff bezos','zuckerberg','tim cook','satya nadella','sam altman',
  'warren buffett','jamie dimon','jerome powell','janet yellen','lagarde',
  'pelosi','mcconnell','desantis','newsom','rfk','vance','harris',
]);

/** Crypto assets — map to full names for Polymarket search */
const CRYPTO_MAP = {
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum',
  sol: 'solana', solana: 'solana',
  xrp: 'xrp', ripple: 'xrp',
  doge: 'dogecoin', dogecoin: 'dogecoin',
  ada: 'cardano', cardano: 'cardano',
  bnb: 'bnb', avax: 'avalanche',
  dot: 'polkadot', matic: 'polygon',
  link: 'chainlink',
};

/** Ticker → company name for search */
const TICKER_MAP = {
  aapl: 'apple', nvda: 'nvidia', tsla: 'tesla', msft: 'microsoft',
  meta: 'meta', goog: 'google', amzn: 'amazon', glw: 'corning',
  nflx: 'netflix', dis: 'disney', baba: 'alibaba', tsl: 'tesla',
};

/** Topic classification keywords → Gamma tag_slug */
const TOPIC_RULES = [
  { tag: 'crypto', terms: ['bitcoin','btc','ethereum','eth','crypto','blockchain','defi','nft','stablecoin','token','mining','halving','solana','dogecoin','coinbase','binance','altcoin'] },
  { tag: 'politics', terms: ['trump','biden','election','vote','congress','senate','democrat','republican','president','governor','legislation','impeach','primary','poll','ballot','gop','dnc'] },
  { tag: 'international-affairs', terms: ['war','conflict','iran','russia','ukraine','china','taiwan','hezbollah','hamas','nato','sanctions','tariff','missile','nuclear','ceasefire','invasion','troops','military','gaza','israel','syria','lebanon','strike','bomb','attack','defense','pentagon','army'] },
  { tag: 'tech', terms: ['ai','artificial intelligence','openai','chatgpt','nvidia','apple','google','microsoft','semiconductor','chip','software','startup','ipo','tech'] },
  { tag: 'finance', terms: ['stock','market','fed','interest rate','inflation','gdp','recession','earnings','s&p','nasdaq','dow','bond','yield','banking','wall street'] },
  { tag: 'sports', terms: ['nba','nfl','mlb','nhl','soccer','football','basketball','baseball','tennis','f1','ufc','championship','playoff','finals','super bowl'] },
  { tag: 'science', terms: ['nasa','space','mars','climate','vaccine','pandemic','virus','fda','drug','pharma','biotech','crispr','gene'] },
];

/* ════════════════════════════════════════════════════════════════════
   Entity Extraction
   ════════════════════════════════════════════════════════════════════ */

/**
 * Extract named entities from event text. Returns:
 * {
 *   entities: string[] — recognized proper nouns (orgs, countries, people, tickers)
 *   topic: string|null — Gamma tag_slug
 *   searchQueries: string[] — search terms to send to Gamma (max 3)
 * }
 */
function extractEntities(event) {
  const headline = String(event?.headline || event?.title || '');
  const summary = String(event?.summary || event?.description || '');
  const fullText = `${headline} ${summary}`.toLowerCase();

  const entities = new Set();

  /* Check symbols/tickers */
  const symbols = normalizeSymbolsList(event?.impactedSymbols);
  for (const sym of symbols) {
    const lower = sym.toLowerCase();
    entities.add(lower);
    if (TICKER_MAP[lower]) {
      entities.add(TICKER_MAP[lower]);
    }
    if (CRYPTO_MAP[lower]) {
      entities.add(CRYPTO_MAP[lower]);
    }
  }

  /* Check keywords */
  for (const kw of (event?.impactedKeywords || [])) {
    if (typeof kw === 'string' && kw.trim()) {
      entities.add(kw.trim().toLowerCase());
    }
  }

  /* Scan text for known entities */
  for (const org of KNOWN_ORGS) {
    if (fullText.includes(org)) {
      entities.add(org);
    }
  }
  for (const country of KNOWN_COUNTRIES) {
    if (fullText.includes(country)) {
      entities.add(country);
    }
  }
  for (const person of KNOWN_PEOPLE) {
    if (fullText.includes(person)) {
      entities.add(person);
    }
  }
  for (const [key, name] of Object.entries(CRYPTO_MAP)) {
    if (fullText.includes(key)) {
      entities.add(name);
    }
  }

  /* Classify topic */
  let topic = null;
  let topicScore = 0;
  for (const rule of TOPIC_RULES) {
    const score = rule.terms.reduce((acc, t) => acc + (fullText.includes(t) ? 1 : 0), 0);
    if (score > topicScore) {
      topicScore = score;
      topic = rule.tag;
    }
  }

  /* Also use explicit event.topic if available */
  if (!topic && event?.topic) {
    const TOPIC_TAG_MAP = {
      Geopolitics: 'international-affairs', Conflict: 'international-affairs',
      Economy: 'finance', Tech: 'tech', Health: 'science',
      Politics: 'politics', Crypto: 'crypto', Finance: 'finance',
      Sports: 'sports', Business: 'finance',
    };
    topic = TOPIC_TAG_MAP[event.topic] || null;
  }

  /* Build search queries — entities first, then significant headline nouns */
  const searchQueries = [];
  const entityArr = [...entities];

  /* Prioritize non-generic entities (orgs > countries > tickers) */
  const prioritized = entityArr
    .filter((e) => e.length > 2 && !STOP_WORDS.has(e))
    .sort((a, b) => {
      const aOrg = KNOWN_ORGS.has(a) || KNOWN_PEOPLE.has(a) ? 2 : 0;
      const bOrg = KNOWN_ORGS.has(b) || KNOWN_PEOPLE.has(b) ? 2 : 0;
      return bOrg - aOrg;
    });

  for (const e of prioritized.slice(0, 3)) {
    searchQueries.push(e);
  }

  /* If we have fewer than 2 search queries, add headline nouns */
  if (searchQueries.length < 2) {
    const tokens = headline
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 4 && !STOP_WORDS.has(w) && !entities.has(w));
    for (const t of tokens.slice(0, 3)) {
      if (searchQueries.length >= 3) break;
      searchQueries.push(t);
    }
  }

  return {
    entities: entityArr,
    topic,
    searchQueries,
  };
}

/* ════════════════════════════════════════════════════════════════════
   Hard Relevance Gate
   ════════════════════════════════════════════════════════════════════ */

/**
 * Check if a Polymarket market is relevant to the event's entities.
 * The market title/description must contain at least one of the event's
 * named entities. Generic keyword overlap (like "price" or "market") does
 * NOT count.
 *
 * @returns {number} relevance score (0 = reject, higher = more relevant)
 */
function relevanceScore(market, entities) {
  if (entities.length === 0) return 0;

  const marketText = [
    market?.question,
    market?.title,
    market?.description,
  ].filter(Boolean).join(' ').toLowerCase();

  let score = 0;
  for (const entity of entities) {
    if (entity.length < 3) continue;
    if (marketText.includes(entity)) {
      /* Weight by entity specificity */
      if (KNOWN_ORGS.has(entity) || KNOWN_PEOPLE.has(entity)) score += 3;
      else if (KNOWN_COUNTRIES.has(entity)) score += 2;
      else score += 1;
    }
  }

  return score;
}

/* ════════════════════════════════════════════════════════════════════
   Helpers (preserved from original)
   ════════════════════════════════════════════════════════════════════ */

function normalizeSymbol(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/^\$+/, '').trim().toUpperCase();
}

function normalizeSymbolsList(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const s of list) {
    const n = normalizeSymbol(s);
    if (n.length >= 2) out.push(n);
  }
  return Array.from(new Set(out));
}

function normalizeProbability(market) {
  const candidates = [market?.outcomePrices, market?.outcomes, market?.lastTradePrice];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && candidate > 0 && candidate < 1) return candidate;
    if (Array.isArray(candidate) && candidate.length > 0) {
      const first = Number(candidate[0]);
      if (Number.isFinite(first) && first > 0 && first < 1) return first;
    }
    if (typeof candidate === 'string') {
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = Number(parsed[0]);
          if (Number.isFinite(first) && first > 0 && first < 1) return first;
        }
      } catch { /* ignore */ }
    }
  }
  return 0.5;
}

function buildMarketUrl(market) {
  const slug = market?.slug || market?.marketSlug || market?.id || market?.conditionId;
  if (!slug) return 'https://polymarket.com/';
  return `https://polymarket.com/event/${slug}`;
}

function formatMarket(m, eventSlugForUrl = null) {
  const urlMarket = eventSlugForUrl ? { ...m, slug: eventSlugForUrl } : m;
  return {
    marketId: String(m?.id ?? m?.conditionId ?? ''),
    marketTitle: String(m?.question ?? m?.title ?? 'Market'),
    description: typeof m?.description === 'string' ? m.description : '',
    url: buildMarketUrl(urlMarket),
    yesProbability: normalizeProbability(m),
    volume: Number(m?.volume ?? m?.volumeNum ?? 0),
    volume24hr: Number(m?.volume24hr ?? m?.volume24Hr ?? 0),
    liquidity: Number(m?.liquidity ?? 0),
    endDate: m?.endDate || m?.end_date_iso || null,
    icon: m?.icon || m?.image || null,
    category: m?.category || null,
  };
}

function openActiveMarket(m) {
  return Boolean(m?.active) && !m?.closed;
}

async function fetchGammaMarkets(query, fetchLimit = 20, tagSlug = null) {
  const params = new URLSearchParams({
    closed: 'false',
    active: 'true',
    limit: String(fetchLimit),
    order: 'volume',
    ascending: 'false',
    q: query,
  });
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
   Main matching functions
   ════════════════════════════════════════════════════════════════════ */

/**
 * Find a single best Polymarket match for an event (used for badge rendering).
 * Returns null if no relevant market found — the badge simply doesn't render.
 */
export async function findMatchingMarket(event) {
  try {
    const { entities, searchQueries } = extractEntities(event);

    if (searchQueries.length === 0) return null;

    /* Search Gamma with entity-based queries */
    const allCandidates = [];
    for (const q of searchQueries.slice(0, 2)) {
      const markets = await fetchGammaMarkets(q, 10);
      allCandidates.push(...markets);
    }

    /* Deduplicate */
    const seen = new Set();
    const deduped = [];
    for (const m of allCandidates) {
      if (!openActiveMarket(m)) continue;
      const id = String(m?.id ?? m?.conditionId ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      deduped.push(m);
    }

    /* Hard relevance gate — must share at least one entity */
    const scored = deduped
      .map((m) => ({ m, score: relevanceScore(m, entities) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return Number(b.m?.volume ?? 0) - Number(a.m?.volume ?? 0);
      });

    const best = scored[0]?.m;
    if (!best) return null;

    return {
      marketId: String(best.id ?? best.conditionId ?? ''),
      marketTitle: String(best.question ?? best.title ?? 'Market'),
      url: buildMarketUrl(best),
      yesProbability: normalizeProbability(best),
      volume: Number(best.volume ?? best.volumeNum ?? 0),
    };
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[polymarket-matcher]', err);
    }
    return null;
  }
}

/**
 * Find multiple relevant Polymarket markets for an event.
 *
 * Two-stage approach:
 * 1. Entity-direct: search for markets that mention the event's named entities
 * 2. Topic backfill: if fewer than TARGET, add top-volume markets from the same topic
 *
 * Hard gate: every returned market must share at least one named entity with the event
 * OR be from the topic backfill (which is categorically relevant by tag_slug).
 *
 * @param {Object} event
 * @param {{ limit?: number }} options
 * @returns {Promise<{ markets: any[], noHighConfidence: boolean }>}
 */
export async function findMatchingMarkets(event, { limit = 6 } = {}) {
  const TARGET = Math.min(limit, 6);

  try {
    const { entities, topic, searchQueries } = extractEntities({
      ...event,
      headline: event?.headline ?? event?.title ?? '',
    });

    if (searchQueries.length === 0 && !topic) {
      return { markets: [], noHighConfidence: true };
    }

    /* ── Phase 1: Entity-direct search ──────────────────────────── */
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
        if (score === 0) continue; /* Hard gate: must share an entity */

        seenIds.add(id);
        entityMatches.push({
          m,
          score,
          volume24hr: Number(m?.volume24hr ?? m?.volume24Hr ?? 0),
          volume: Number(m?.volume ?? m?.volumeNum ?? 0),
        });
      }
    }

    /* Sort: relevance score first, then volume */
    entityMatches.sort((a, b) => b.score - a.score || b.volume24hr - a.volume24hr || b.volume - a.volume);
    const topEntity = entityMatches.slice(0, TARGET);

    /* ── Phase 2: Topic backfill ────────────────────────────────── */
    const topicMarkets = [];
    const remaining = TARGET - topEntity.length;

    if (remaining > 0 && topic) {
      const fetched = await fetchGammaMarkets('', 30, topic);
      for (const m of fetched) {
        if (topicMarkets.length >= remaining) break;
        if (!openActiveMarket(m)) continue;
        const id = String(m?.id ?? m?.conditionId ?? '');
        if (!id || seenIds.has(id)) continue;

        /* Topic backfill has a softer gate: must be from the right category
           (ensured by tag_slug), but doesn't need entity overlap since it's
           explicitly "more from this topic" not "about this specific event" */
        seenIds.add(id);
        topicMarkets.push({ m });
      }
    }

    /* ── Combine ─────────────────────────────────────────────────── */
    const combined = [
      ...topEntity.map((row) => formatMarket(row.m)),
      ...topicMarkets.map((row) => formatMarket(row.m)),
    ].slice(0, TARGET);

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
