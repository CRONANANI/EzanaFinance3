import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  countryKeywords,
  layerKeywords,
  alphaVantageTopicForLayers,
  alphaVantageTickerForCountry,
} from '@/lib/powerMapArticleQueries';

export const dynamic = 'force-dynamic';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

const ALPHA_VANTAGE_KEY =
  process.env.ALPHA_VANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY;
const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

// Per-source latency caps so no single upstream can stall the response. Finnhub
// is fast and primary (2.5s); AlphaVantage is slow/rate-limited and only a
// nice-to-have, so it gets the shorter 2s budget. Because every upstream fetch
// is timeout-bounded, the overall Promise.all can never exceed ~2.5s → THE CHAIN
// returns within 3s on a cold load regardless of AlphaVantage.
const FINNHUB_TIMEOUT_MS = 2500;
const ALPHA_VANTAGE_TIMEOUT_MS = 2000;

function fetchWithTimeout(url, opts = {}, ms = 2500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// Best-effort in-memory cache keyed by country+layers so repeat chain selections
// on a warm instance are instant (complements the CDN s-maxage/SWR headers).
const MEM_TTL_MS = 10 * 60 * 1000;
const memCache = new Map(); // key -> { at: number, payload: object }

/**
 * GET /api/market-data/power-map-news
 *
 * Query params:
 *   country  — country name (e.g. "Russia")
 *   layers   — comma-separated power layer slugs (e.g. "military,economic")
 *
 * Fetches news from TWO sources in parallel:
 *   1. Finnhub (general + forex categories) — broad market coverage
 *   2. AlphaVantage NEWS_SENTIMENT — topic + ticker filtered, sentiment scored
 *
 * Articles are deduplicated by URL, then unified through the same
 * country-required + layer-scoring pipeline.
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const country = (searchParams.get('country') || '').trim();
      const layersParam = (searchParams.get('layers') || '').trim();
      const layers = layersParam
        ? layersParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      // Backward-compat: support old `q=` queries
      if (!country) {
        const q = (searchParams.get('q') || '').trim();
        if (!q) {
          return NextResponse.json({ error: 'country param required' }, { status: 400 });
        }
        if (!FINNHUB_KEY && !ALPHA_VANTAGE_KEY) {
          return NextResponse.json(
            {
              news: [],
              error: 'No news API keys configured (FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY)',
            },
            { status: 503 },
          );
        }
        const tokens = q.split(/\s+/);
        return fetchAndFilter(tokens[0], []);
      }

      if (!FINNHUB_KEY && !ALPHA_VANTAGE_KEY) {
        return NextResponse.json(
          {
            news: [],
            error: 'No news API keys configured (FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY)',
          },
          { status: 503 },
        );
      }

      return fetchAndFilter(country, layers);
    } catch (error) {
      console.error('[power-map-news] unexpected error:', error);
      return NextResponse.json({ error: error.message, news: [] }, { status: 500 });
    }
  },
  { requireAuth: false },
);

// ─── Source 1: Finnhub general + forex ─────────────────────────────────────
async function fetchFinnhubNews() {
  if (!FINNHUB_KEY) return [];
  try {
    // Each call is independently timeout-bounded and falls back to [] on
    // abort/error so one slow/failed category never sinks the other.
    const responses = await Promise.all([
      fetchWithTimeout(
        `${FINNHUB_BASE}/news?category=general&token=${FINNHUB_KEY}`,
        {},
        FINNHUB_TIMEOUT_MS,
      )
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetchWithTimeout(
        `${FINNHUB_BASE}/news?category=forex&token=${FINNHUB_KEY}`,
        {},
        FINNHUB_TIMEOUT_MS,
      )
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]);

    return responses
      .flat()
      .filter(Boolean)
      .map((n) => ({
        _source: 'finnhub',
        id: n.id || n.headline?.slice(0, 24),
        url: n.url || '#',
        headline: n.headline || '',
        summary: n.summary || '',
        related: n.related || '',
        datetime: n.datetime || 0, // Unix seconds
        image: n.image,
        source: n.source || 'Finnhub',
        category: (n.category || 'MARKETS').toUpperCase(),
      }));
  } catch (err) {
    console.error('[power-map-news] finnhub fetch failed:', err);
    return [];
  }
}

// ─── Source 2: AlphaVantage NEWS_SENTIMENT ─────────────────────────────────
async function fetchAlphaVantageNews(country, layers) {
  if (!ALPHA_VANTAGE_KEY) return [];

  const params = new URLSearchParams({
    function: 'NEWS_SENTIMENT',
    apikey: ALPHA_VANTAGE_KEY,
    sort: 'LATEST',
    limit: '50',
  });

  const ticker = alphaVantageTickerForCountry(country);
  if (ticker) params.set('tickers', ticker);

  const topic = alphaVantageTopicForLayers(layers);
  if (topic) params.set('topics', topic);

  // If neither ticker nor topic is available, skip the call to save quota.
  if (!ticker && !topic) {
    return [];
  }

  try {
    const url = `${ALPHA_VANTAGE_BASE}?${params.toString()}`;
    // Shorter budget: if AlphaVantage's slow free tier doesn't beat 2s, we abort
    // and ship Finnhub-only (sentiment is a nice-to-have, not required).
    const res = await fetchWithTimeout(
      url,
      { headers: { 'User-Agent': 'EzanaFinance/1.0' } },
      ALPHA_VANTAGE_TIMEOUT_MS,
    );
    if (!res.ok) {
      console.warn('[power-map-news] alphavantage non-OK status:', res.status);
      return [];
    }
    const data = await res.json();

    if (data?.Information || data?.Note) {
      console.warn(
        '[power-map-news] alphavantage rate-limited or info:',
        data.Information || data.Note,
      );
      return [];
    }

    const feed = Array.isArray(data?.feed) ? data.feed : [];
    return feed.map((a) => ({
      _source: 'alphavantage',
      id: a.url || a.title?.slice(0, 24),
      url: a.url || '#',
      headline: a.title || '',
      summary: a.summary || '',
      related: [
        ...(a.topics || []).map((t) => t.topic),
        ...(a.ticker_sentiment || []).map((t) => t.ticker),
      ].join(' '),
      datetime: avTimeToUnix(a.time_published),
      image: a.banner_image,
      source: a.source || 'AlphaVantage',
      category: 'MARKETS',
      sentimentScore:
        typeof a.overall_sentiment_score === 'number' ? a.overall_sentiment_score : null,
      sentimentLabel: a.overall_sentiment_label || null,
    }));
  } catch (err) {
    console.error('[power-map-news] alphavantage fetch failed:', err);
    return [];
  }
}

/** Convert AlphaVantage YYYYMMDDTHHMMSS string to Unix seconds. */
function avTimeToUnix(avTime) {
  if (!avTime || typeof avTime !== 'string' || avTime.length < 13) return 0;
  const iso = `${avTime.slice(0, 4)}-${avTime.slice(4, 6)}-${avTime.slice(6, 8)}T${avTime.slice(9, 11)}:${avTime.slice(11, 13)}:${avTime.slice(13, 15) || '00'}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

// ─── Main pipeline ─────────────────────────────────────────────────────────
const NEWS_HEADERS = {
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
};

async function fetchAndFilter(country, layers) {
  // Warm-instance cache: repeat chain selections return instantly.
  const cacheKey = `${country}|${[...layers].sort().join(',')}`;
  const cached = memCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MEM_TTL_MS) {
    return NextResponse.json(cached.payload, { headers: NEWS_HEADERS });
  }

  const [finnhubArticles, alphaArticles] = await Promise.all([
    fetchFinnhubNews(),
    fetchAlphaVantageNews(country, layers),
  ]);

  const seen = new Set();
  const merged = [];
  for (const article of [...alphaArticles, ...finnhubArticles]) {
    const key = article.url && article.url !== '#' ? article.url : article.headline;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(article);
  }

  const countryTerms = countryKeywords(country);
  const countryRelevant = merged.filter((article) => {
    const haystack = `${article.headline} ${article.summary} ${article.related}`.toLowerCase();
    return countryTerms.some((term) => haystack.includes(term));
  });

  const lyrTerms = layers.length > 0 ? [...new Set(layerKeywords(layers))] : [];

  const scored = countryRelevant
    .map((article) => {
      const headline = (article.headline || '').toLowerCase();
      const summary = (article.summary || '').toLowerCase();
      const related = (article.related || '').toLowerCase();

      let score = 1;
      const matchedTerms = new Set();

      if (lyrTerms.length > 0) {
        for (const term of lyrTerms) {
          if (headline.includes(term)) {
            score += 4;
            matchedTerms.add(term);
          } else if (summary.includes(term)) {
            score += 2;
            matchedTerms.add(term);
          } else if (related.includes(term)) {
            score += 1;
            matchedTerms.add(term);
          }
        }
        if (matchedTerms.size === 0) return null;
      }

      if (article._source === 'alphavantage') score += 1;

      const ageMs = Date.now() - (article.datetime || 0) * 1000;
      if (ageMs < 86400000) score += 2;
      else if (ageMs < 604800000) score += 1;

      return { ...article, relevanceScore: score };
    })
    .filter(Boolean);

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const formatted = scored.slice(0, 15).map((n) => ({
    id: n.id || n.headline?.slice(0, 24),
    category: n.category,
    title: n.headline || 'Market Update',
    summary: n.summary,
    source: n.source,
    url: n.url,
    image: n.image,
    time: n.datetime,
    related: n.related,
    relevanceScore: n.relevanceScore,
    sentimentScore: n.sentimentScore ?? null,
    sentimentLabel: n.sentimentLabel || null,
    sourceProvider: n._source,
  }));

  const payload = {
    news: formatted,
    country,
    layers,
    sources: {
      finnhub: finnhubArticles.length,
      alphavantage: alphaArticles.length,
    },
    countryRelevant: countryRelevant.length,
    finalMatches: formatted.length,
  };

  // Only cache a useful result so a transient empty upstream fetch isn't pinned
  // for 10 minutes.
  if (formatted.length > 0) {
    memCache.set(cacheKey, { at: Date.now(), payload });
  }

  return NextResponse.json(payload, { headers: NEWS_HEADERS });
}
