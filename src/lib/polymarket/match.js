/**
 * Polymarket matcher — server-side.
 *
 * Given an ISR event, finds the best-fitting *active, open* market on Polymarket's
 * public Gamma API and returns enough metadata to render the inline blue badge.
 * Fails softly: any network/parse error just returns null so the UI simply
 * doesn't render a badge (absent > speculative).
 */

const GAMMA_BASE = 'https://gamma-api.polymarket.com';

// Words too generic to help narrow Polymarket market search. We strip these
// before building the search query so the signal-to-noise ratio stays high.
const STOP_WORDS = new Set([
  'the','a','an','and','or','of','to','in','on','for','with','at','by','from','as',
  'is','are','was','were','be','been','being','it','its','this','that','these','those',
  'report','reports','reported','reporting','say','says','said','update','updates',
  'news','live','breaking','latest','amid','over','new','post','posts','see',
  'minutes','minute','signal','signals','steady','cooling','heating','watch','watching',
  'still','just','than','into','out','up','down','but','not','has','have','had',
  'will','can','may','week','month','year','day','days','last','next',
]);

/** Map ISR topic labels → Gamma `tag_slug` (see GET /tags). Omit unmapped topics. */
const TOPIC_TAG_SLUG = {
  Geopolitics: 'international-affairs',
  Conflict: 'international-affairs',
  Economy: 'economy',
  Tech: 'tech',
  Health: 'health',
  Politics: 'politics',
  Crypto: 'crypto',
  Finance: 'finance',
  Sports: 'sports',
  Business: 'business',
};

function extractSearchTerms(event) {
  const pool = new Set();
  for (const kw of event?.impactedKeywords || []) {
    if (typeof kw === 'string' && kw.trim()) pool.add(kw.trim().toLowerCase());
  }
  const headline = typeof event?.headline === 'string' ? event.headline : '';
  const tokens = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  tokens.slice(0, 6).forEach((t) => pool.add(t));
  if (event?.country) pool.add(String(event.country).toLowerCase());
  return Array.from(pool).slice(0, 5);
}

function normalizeProbability(market) {
  const candidates = [
    market?.outcomePrices,
    market?.outcomes,
    market?.lastTradePrice,
  ];
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
      } catch {
        // not JSON — ignore
      }
    }
  }
  return 0.5;
}

function buildMarketUrl(market) {
  const slug = market?.slug || market?.marketSlug || market?.id || market?.conditionId;
  if (!slug) return 'https://polymarket.com/';
  return `https://polymarket.com/event/${slug}`;
}

/**
 * @typedef {Object} PolymarketMatch
 * @property {string} marketId
 * @property {string} marketTitle
 * @property {string} url
 * @property {number} yesProbability  0..1
 * @property {number} volume
 */

/**
 * @param {{ headline?: string, impactedKeywords?: string[], country?: string }} event
 * @returns {Promise<PolymarketMatch|null>}
 */
export async function findMatchingMarket(event) {
  try {
    const terms = extractSearchTerms(event);
    if (terms.length === 0) return null;

    const params = new URLSearchParams({
      closed: 'false',
      active: 'true',
      limit: '5',
      order: 'volume',
      ascending: 'false',
      q: terms.slice(0, 3).join(' '),
    });

    const res = await fetch(`${GAMMA_BASE}/markets?${params.toString()}`, {
      // Cache briefly on the server. Polymarket refresh cycles are fast enough
      // that 60s keeps the UI lively without hammering their API per event.
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;

    const payload = await res.json();
    const list = Array.isArray(payload) ? payload : payload?.data;
    if (!Array.isArray(list) || list.length === 0) return null;

    // Pick the highest-volume match that also contains at least one search term
    // in the market title — avoids returning unrelated high-volume markets.
    const termLower = terms.map((t) => t.toLowerCase());
    const scored = list
      .map((m) => {
        const title = String(m?.question || m?.title || '').toLowerCase();
        const hits = termLower.reduce((acc, t) => acc + (title.includes(t) ? 1 : 0), 0);
        return { m, hits, vol: Number(m?.volume ?? m?.volumeNum ?? 0) };
      })
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits || b.vol - a.vol);

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
 * Map a raw Polymarket market record into the shape the UI renders.
 * Pulls out icon/image, end date, and 24h volume in addition to the existing fields.
 */
function formatMarket(m, eventSlugForUrl = null) {
  const urlMarket = eventSlugForUrl
    ? { ...m, slug: eventSlugForUrl }
    : m;
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

function topicToTagSlug(topic) {
  if (!topic || typeof topic !== 'string') return null;
  return TOPIC_TAG_SLUG[topic] || null;
}

/**
 * Extract the primary subject of an event — the noun/entity the article is ABOUT.
 *
 * Priority:
 * 1. Tickers/symbols (e.g., BTC, NVDA, AAPL) — strongest signal
 * 2. First impactedKeyword (editorial-tagged subject)
 * 3. First significant noun from the headline (>4 chars, not a stop word)
 *
 * Returns: { subject: string, subjectVariants: string[], topic: string|null }
 */
function extractPrimarySubject(event) {
  const headline = String(event?.headline || event?.title || '');
  const symbolsNorm = normalizeSymbolsList(event?.impactedSymbols);
  const keywords = (event?.impactedKeywords || []).filter((k) => typeof k === 'string' && k.trim());

  let subject = '';
  let subjectVariants = [];

  /* 1. Tickers — strongest signal */
  if (symbolsNorm.length > 0) {
    subject = symbolsNorm[0].toLowerCase();
    subjectVariants = symbolsNorm.map((s) => s.toLowerCase());

    /* Add common name mappings for major assets */
    const TICKER_TO_NAME = {
      btc: ['bitcoin'],
      eth: ['ethereum'],
      sol: ['solana'],
      xrp: ['ripple'],
      doge: ['dogecoin'],
      ada: ['cardano'],
      aapl: ['apple'],
      nvda: ['nvidia'],
      tsla: ['tesla'],
      msft: ['microsoft'],
      meta: ['meta', 'facebook'],
      goog: ['google', 'alphabet'],
      amzn: ['amazon'],
      glw: ['corning'],
    };
    for (const sym of symbolsNorm) {
      const names = TICKER_TO_NAME[sym.toLowerCase()];
      if (names) subjectVariants.push(...names);
    }
  }

  /* 2. First impactedKeyword */
  if (!subject && keywords.length > 0) {
    subject = keywords[0].toLowerCase();
    subjectVariants = keywords.slice(0, 3).map((k) => k.toLowerCase());
  }

  /* 3. First significant headline noun */
  if (!subject) {
    const tokens = headline
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 4 && !STOP_WORDS.has(w));
    if (tokens.length > 0) {
      subject = tokens[0];
      subjectVariants = tokens.slice(0, 3);
    }
  }

  /* Deduplicate variants */
  subjectVariants = [...new Set([subject, ...subjectVariants].filter(Boolean))];

  /* Map to Polymarket topic tag */
  const topic = topicToTagSlug(event?.topic) || inferTopicFromSubject(subject);

  return { subject, subjectVariants, topic };
}

/**
 * Infer a Polymarket tag_slug from a subject when the event doesn't have
 * an explicit topic field.
 */
function inferTopicFromSubject(subject) {
  if (!subject) return null;
  const s = subject.toLowerCase();

  const CRYPTO_TERMS = ['ethereum', 'eth', 'bitcoin', 'btc', 'crypto', 'sol', 'solana', 'xrp', 'doge', 'cardano', 'ada', 'defi', 'nft', 'blockchain', 'stablecoin', 'usdt', 'usdc'];
  if (CRYPTO_TERMS.some((t) => s.includes(t))) return 'crypto';

  const POLITICS_TERMS = ['trump', 'biden', 'congress', 'senate', 'election', 'vote', 'democrat', 'republican', 'president', 'governor', 'legislation'];
  if (POLITICS_TERMS.some((t) => s.includes(t))) return 'politics';

  const TECH_TERMS = ['nvidia', 'apple', 'google', 'microsoft', 'openai', 'chatgpt', 'semiconductor', 'chip', 'artificial intelligence'];
  if (TECH_TERMS.some((t) => s.includes(t)) || /\bai\b/.test(s)) return 'tech';

  const FINANCE_TERMS = ['stock', 'market', 'fed', 'interest rate', 'inflation', 'gdp', 'recession', 'earnings', 'ipo', 's&p', 'nasdaq'];
  if (FINANCE_TERMS.some((t) => s.includes(t))) return 'finance';

  const SPORTS_TERMS = ['nba', 'nfl', 'mlb', 'nhl', 'soccer', 'football', 'basketball', 'baseball', 'tennis', 'f1', 'ufc'];
  if (SPORTS_TERMS.some((t) => s.includes(t))) return 'sports';

  const GEO_TERMS = ['war', 'conflict', 'iran', 'china', 'russia', 'ukraine', 'israel', 'nato', 'sanctions', 'tariff'];
  if (GEO_TERMS.some((t) => s.includes(t))) return 'international-affairs';

  return null;
}

function openActiveMarket(m) {
  return Boolean(m?.active) && !m?.closed;
}

async function fetchGammaMarkets(searchQ, fetchLimit) {
  const params = new URLSearchParams({
    closed: 'false',
    active: 'true',
    limit: String(fetchLimit),
    order: 'volume',
    ascending: 'false',
    q: searchQ,
  });
  const res = await fetch(`${GAMMA_BASE}/markets?${params}`, {
    next: { revalidate: 60 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const payload = await res.json();
  const list = Array.isArray(payload) ? payload : payload?.data;
  return Array.isArray(list) ? list : [];
}

/**
 * Find Polymarket markets relevant to an event using subject-first matching.
 *
 * Strategy:
 * 1. Extract the primary subject (ticker/keyword/entity the event is ABOUT)
 * 2. Search Gamma for markets matching the subject — pick up to 6, sorted by volume
 * 3. If fewer than 6, backfill with the most-active markets in the same TOPIC category
 * 4. Deduplicate and cap at 6 total
 *
 * @param {Object} event  — ISR or chain-view event
 * @param {{ limit?: number }} options
 * @returns {Promise<{ markets: PolymarketMatch[], noHighConfidence: boolean }>}
 */
export async function findMatchingMarkets(event, { limit = 6 } = {}) {
  const TARGET = Math.min(limit, 6);

  try {
    const normalizedEvent = {
      ...event,
      headline: event?.headline ?? event?.title ?? '',
    };

    const { subject, subjectVariants, topic } = extractPrimarySubject(normalizedEvent);

    if (!subject) {
      return { markets: [], noHighConfidence: true };
    }

    /* ── Phase 1: Subject-direct markets ────────────────────────── */
    const subjectMarkets = [];
    const seenIds = new Set();

    /* Try each variant as a search query — broadest first */
    for (const variant of subjectVariants.slice(0, 3)) {
      if (subjectMarkets.length >= TARGET) break;

      const fetched = await fetchGammaMarkets(variant, 20);

      /* Score and filter: market title must contain at least one subject variant */
      for (const m of fetched) {
        if (!openActiveMarket(m)) continue;
        const id = String(m?.id ?? m?.conditionId ?? '');
        if (!id || seenIds.has(id)) continue;

        const titleLower = String(m?.question ?? m?.title ?? '').toLowerCase();
        const descLower = String(m?.description ?? '').toLowerCase();
        const haystack = `${titleLower} ${descLower}`;

        /* Must mention the subject in title or description */
        const isAboutSubject = subjectVariants.some((v) => haystack.includes(v));
        if (!isAboutSubject) continue;

        seenIds.add(id);
        subjectMarkets.push({
          m,
          volume: Number(m?.volume ?? m?.volumeNum ?? 0),
          volume24hr: Number(m?.volume24hr ?? m?.volume24Hr ?? 0),
        });
      }
    }

    /* Sort subject markets by 24h volume (most active first) */
    subjectMarkets.sort((a, b) => b.volume24hr - a.volume24hr || b.volume - a.volume);
    const topSubject = subjectMarkets.slice(0, TARGET);

    /* ── Phase 2: Topic backfill (if fewer than TARGET) ─────────── */
    const topicMarkets = [];
    const remaining = TARGET - topSubject.length;

    if (remaining > 0 && topic) {
      /* Fetch most active markets in the topic category */
      const params = new URLSearchParams({
        closed: 'false',
        active: 'true',
        limit: '30',
        order: 'volume',
        ascending: 'false',
        tag_slug: topic,
      });

      try {
        const res = await fetch(`${GAMMA_BASE}/markets?${params}`, {
          next: { revalidate: 60 },
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const payload = await res.json();
          const list = Array.isArray(payload) ? payload : payload?.data;
          if (Array.isArray(list)) {
            for (const m of list) {
              if (topicMarkets.length >= remaining) break;
              if (!openActiveMarket(m)) continue;
              const id = String(m?.id ?? m?.conditionId ?? '');
              if (!id || seenIds.has(id)) continue;
              seenIds.add(id);
              topicMarkets.push({ m });
            }
          }
        }
      } catch {
        /* Topic backfill is best-effort — if it fails, return subject-only results */
      }
    }

    /* ── Combine: subject-direct first, then topic backfill ──── */
    const combined = [
      ...topSubject.map((row) => formatMarket(row.m)),
      ...topicMarkets.map((row) => formatMarket(row.m)),
    ].slice(0, TARGET);

    const noHighConfidence = combined.length === 0 && subject.length > 0;

    return { markets: combined, noHighConfidence };
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[polymarket-multi-matcher]', err);
    }
    return { markets: [], noHighConfidence: false };
  }
}
