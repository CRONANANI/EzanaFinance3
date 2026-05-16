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
 */

const GAMMA_BASE = 'https://gamma-api.polymarket.com';

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

/**
 * Build a working Polymarket URL.
 *
 * Polymarket URL structure:
 *   - Event page: https://polymarket.com/event/{event-slug}
 *   - There is NO ?tid= parameter — conditionId is a blockchain
 *     address (CTF contract), not a URL param. Appending it 404s.
 *
 * Gamma API returns:
 *   - groupSlug: the EVENT-level slug (what we want)
 *   - slug: the MARKET-level slug — usually an individual outcome,
 *     not a valid URL on its own (often a hex hash)
 *   - conditionId: CTF contract address (never goes in URL)
 *   - id: internal DB ID (never goes in URL)
 *
 * ONLY groupSlug reliably produces a working URL. If we don't have
 * one, fall back to the polymarket.com homepage rather than minting
 * a 404. The accompanying hasValidUrl flag (see formatMarket) lets
 * the UI hide the external-link affordance for those rows.
 */
function buildMarketUrl(market) {
  const eventSlug =
    market?.groupSlug || market?.group_slug || market?.eventSlug || market?.event_slug;
  if (eventSlug) {
    return `https://polymarket.com/event/${eventSlug}`;
  }

  // If we only have a market-level slug, accept it ONLY when it
  // looks like a real event slug (kebab-case words, not a hex hash).
  const slug = market?.slug || market?.marketSlug;
  if (slug && slug.includes('-') && !slug.match(/^0x[a-f0-9]+$/i) && slug.length > 10) {
    return `https://polymarket.com/event/${slug}`;
  }

  // Never construct a URL from conditionId or numeric id — both 404.
  return 'https://polymarket.com';
}

function openActiveMarket(m) {
  return Boolean(m?.active) && !m?.closed;
}

function formatMarket(m) {
  const url = buildMarketUrl(m);
  return {
    marketId: String(m?.id ?? m?.conditionId ?? ''),
    marketTitle: String(m?.groupItemTitle ?? m?.question ?? m?.title ?? 'Market'),
    description: typeof m?.description === 'string' ? m.description : '',
    url,
    // Hint for the UI — false when the URL fell back to polymarket.com
    // homepage so the external-link arrow can be suppressed.
    hasValidUrl: url !== 'https://polymarket.com',
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

    const best = scored[0]?.m;
    if (!best) return null;

    return {
      marketId: String(best.id ?? best.conditionId ?? ''),
      marketTitle: String(best.groupItemTitle ?? best.question ?? best.title ?? 'Market'),
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
 * Find up to 6 relevant Polymarket markets for an event.
 *
 * Phase 1: entity-direct search (hard relevance gate)
 * Phase 2: topic backfill if < 6 results
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
      .filter((m) => m.hasValidUrl)
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
