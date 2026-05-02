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
 * Extract noun-like keywords from longer text (descriptions, summaries).
 * Drops short tokens, stop words, and pure numbers. Used in addition to
 * headline extraction so descriptions contribute relevant terms.
 */
function extractKeywordsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
    .slice(0, 8);
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

/** @param {string} haystackLower */
function tickerHits(haystackLower, symbolsNorm) {
  for (const u of symbolsNorm) {
    const base = u.includes('=') ? u.split('=')[0].toUpperCase() : u;
    const variants = [u.toLowerCase(), base.toLowerCase(), `$${base.toLowerCase()}`];
    for (const p of variants) {
      if (p && haystackLower.includes(p)) return true;
    }
  }
  return false;
}

function topicToTagSlug(topic) {
  if (!topic || typeof topic !== 'string') return null;
  return TOPIC_TAG_SLUG[topic] || null;
}

/**
 * Priority terms for Gamma search `q`, then scoring. Keywords & symbols first (ISR), then text.
 */
function buildMatcherTerms(event) {
  const headline = typeof event?.headline === 'string' ? event.headline : String(event?.title || '');
  const symbolsNorm = normalizeSymbolsList(event?.impactedSymbols);

  const keywordStrings = [];
  for (const kw of event?.impactedKeywords || []) {
    if (typeof kw === 'string' && kw.trim()) keywordStrings.push(kw.trim().toLowerCase());
  }

  const descKeywords = extractKeywordsFromText(
    [event?.summary, event?.description].filter(Boolean).join(' ')
  );

  const headlineTokens = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const termOrder = [];
  const seen = new Set();
  const push = (t) => {
    const x = String(t).toLowerCase().trim();
    if (x.length < 2 || seen.has(x)) return;
    seen.add(x);
    termOrder.push(x);
  };

  for (const k of keywordStrings) push(k);
  for (const s of symbolsNorm) push(s);
  for (const t of headlineTokens.slice(0, 8)) push(t);
  for (const t of descKeywords) push(t);
  if (event?.country) push(String(event.country).toLowerCase());

  const qTokens = [];
  for (const k of keywordStrings.slice(0, 4)) qTokens.push(k);
  for (const s of symbolsNorm.slice(0, 2)) qTokens.push(s);
  for (const t of headlineTokens.slice(0, 4)) {
    if (qTokens.length >= 4) break;
    qTokens.push(t);
  }
  for (const t of descKeywords) {
    if (qTokens.length >= 4) break;
    qTokens.push(t);
  }
  const q = qTokens.slice(0, 3).join(' ').trim();

  const scoreTerms = termOrder.filter(
    (t) => !symbolsNorm.some((sym) => sym.toLowerCase() === t || sym.split('=')[0].toLowerCase() === t)
  );

  return { q, scoreTerms, symbolsNorm, keywordStrings };
}

function openActiveMarket(m) {
  return Boolean(m?.active) && !m?.closed;
}

async function fetchGammaEvents(searchQ, tagSlug) {
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    limit: '25',
    q: searchQ,
  });
  if (tagSlug) params.set('tag_slug', tagSlug);
  const res = await fetch(`${GAMMA_BASE}/events?${params}`, {
    next: { revalidate: 60 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const payload = await res.json();
  return Array.isArray(payload) ? payload : [];
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

function flattenEventMarkets(events, { fromEvent: fromEventFlag }) {
  /** @type {Map<string, { m: any, fromEvent: boolean, eventSlug: string|null }>} */
  const byId = new Map();
  const sorted = [...events].sort(
    (a, b) => Number(b?.volume24hr ?? 0) - Number(a?.volume24hr ?? 0)
  );
  const top = sorted.slice(0, 3);
  for (const ev of top) {
    const eventSlug = ev?.slug || null;
    const markets = Array.isArray(ev?.markets) ? ev.markets : [];
    for (const m of markets) {
      if (!openActiveMarket(m)) continue;
      const id = String(m?.id ?? m?.conditionId ?? '');
      if (!id || byId.has(id)) continue;
      byId.set(id, { m, fromEvent: fromEventFlag, eventSlug });
    }
  }
  return byId;
}

/**
 * Find multiple Polymarket markets relevant to an event (ISR keywords, tickers, topic).
 * Events-first on Gamma (`GET /events`), then `GET /markets` fallback; open markets only.
 *
 * @param {{ headline?: string, title?: string, topic?: string, summary?: string, description?: string, impactedKeywords?: string[], impactedSymbols?: string[], country?: string }} event
 * @param {{ limit?: number }} options
 * @returns {Promise<{ markets: PolymarketMatch[], noHighConfidence: boolean }>}
 */
export async function findMatchingMarkets(event, { limit = 8 } = {}) {
  try {
    const normalizedEvent = {
      ...event,
      headline: event?.headline ?? event?.title ?? '',
    };

    const { q, scoreTerms, symbolsNorm, keywordStrings } = buildMatcherTerms(normalizedEvent);

    const hadPayloadSignal =
      keywordStrings.length > 0 ||
      symbolsNorm.length > 0 ||
      String(normalizedEvent.headline || '').trim().length > 0 ||
      String(event?.summary || '').trim().length > 0 ||
      String(event?.description || '').trim().length > 0;

    const searchQ =
      q.trim() ||
      (symbolsNorm.length ? symbolsNorm.slice(0, 3).join(' ') : '');

    if (!searchQ) {
      return { markets: [], noHighConfidence: Boolean(hadPayloadSignal) };
    }

    const tagSlug = topicToTagSlug(event?.topic);
    let events = await fetchGammaEvents(searchQ, tagSlug);
    if (!events.length && tagSlug) {
      events = await fetchGammaEvents(searchQ, null);
    }

    const byId = flattenEventMarkets(events, { fromEvent: true });

    if (byId.size < Math.max(8, limit * 2)) {
      const fallback = await fetchGammaMarkets(searchQ, Math.max(24, limit * 5));
      for (const m of fallback) {
        if (!openActiveMarket(m)) continue;
        const id = String(m?.id ?? m?.conditionId ?? '');
        if (!id || byId.has(id)) continue;
        byId.set(id, { m, fromEvent: false, eventSlug: null });
      }
    }

    const ranked = [];
    for (const { m, fromEvent, eventSlug } of byId.values()) {
      const haystack = [m?.question, m?.title, m?.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const hits = scoreTerms.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
      const tHit = tickerHits(haystack, symbolsNorm);
      const passesFloor = hits >= 2 || fromEvent || tHit;
      if (!passesFloor) continue;

      const vol24 = Number(m?.volume24hr ?? m?.volume24Hr ?? 0);
      const vol = Number(m?.volume ?? m?.volumeNum ?? 0);
      const rankScore =
        hits * 100 +
        (tHit ? 40 : 0) +
        (fromEvent ? 35 : 0) +
        Math.min(25, Math.log10(vol24 + 10) * 8);

      ranked.push({ m, eventSlug, hits, vol24, vol, rankScore });
    }

    ranked.sort(
      (a, b) => b.rankScore - a.rankScore || b.vol24 - a.vol24 || b.vol - a.vol
    );

    const markets = ranked.slice(0, limit).map((row) => formatMarket(row.m, row.eventSlug));
    const noHighConfidence = Boolean(hadPayloadSignal && markets.length === 0);

    return { markets, noHighConfidence };
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[polymarket-multi-matcher]', err);
    }
    return { markets: [], noHighConfidence: false };
  }
}
