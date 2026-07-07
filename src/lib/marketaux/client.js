/**
 * Marketaux news client — SERVER ONLY. The `marketaux` token never reaches the
 * client; all calls go through /api/market-data/city-news.
 *
 * Scoping constraint: Marketaux filters by `countries` (the exchange country of
 * identified entities), NOT by city/geo. So the accurate integration is a
 * HYBRID — `countries` hits the national market, and the city's existing keyword
 * list (passed via `search`) narrows within that country (NY vs Boston vs Miami,
 * all `us`, differ only by keyword). No strict city-only geo filter exists.
 */

const BASE = 'https://api.marketaux.com/v1';

export function getMarketauxToken() {
  return process.env.marketaux || process.env.MARKETAUX_TOKEN || '';
}
export function hasMarketaux() {
  return !!getMarketauxToken();
}

/** Marketaux error envelope → a clean code (don't throw raw). */
function errorCode(json, status) {
  const code = json?.error?.code || json?.error || null;
  if (code) return code;
  if (status === 401) return 'invalid_api_token';
  if (status === 402) return 'usage_limit_reached';
  if (status === 429) return 'rate_limit_reached';
  return `http_${status}`;
}

/**
 * GET /news/all — national market news narrowed by the city keyword `search`.
 * @param {{countries?:string, search?:string, limit?:number}} opts
 * @returns {Promise<{articles:Array, error?:string, status?:number}>}
 */
export async function fetchCityNews({ countries, search, limit = 25 } = {}) {
  const token = getMarketauxToken();
  if (!token) return { articles: [], error: 'invalid_api_token' };

  const params = new URLSearchParams({
    api_token: token,
    language: 'en',
    filter_entities: 'true',
    must_have_entities: 'false',
    group_similar: 'true',
    sort: 'published_at',
    limit: String(Math.min(Math.max(Number(limit) || 25, 1), 50)),
  });
  if (countries) params.set('countries', countries);
  if (search) params.set('search', search);

  try {
    const res = await fetch(`${BASE}/news/all?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      // cache the upstream ~10 min — Marketaux plans have finite daily caps
      next: { revalidate: 600 },
    });
    const json = await res.json().catch(() => null);
    if (json && json.error)
      return { articles: [], error: errorCode(json, res.status), status: res.status };
    if (!res.ok) return { articles: [], error: errorCode(json, res.status), status: res.status };
    const data = Array.isArray(json?.data) ? json.data : [];
    return { articles: data };
  } catch (err) {
    return { articles: [], error: err?.message || 'fetch_failed' };
  }
}

/** Quote multi-word phrases and OR-join the city keywords for Marketaux `search`. */
export function buildSearchQuery(keywords, max = 8) {
  return (Array.isArray(keywords) ? keywords : [])
    .map((k) => String(k || '').trim())
    .filter(Boolean)
    .slice(0, max)
    .map((k) => (/\s/.test(k) ? `"${k}"` : k))
    .join(' | ');
}

/**
 * Marketaux article → the shape ISRFeedCard consumes (chain shape: title/summary/
 * time/source/url/image) PLUS the richer Marketaux fields (headline/publishedAt/
 * entities/sentiment/city/country) used by the semantic market match. Keeping
 * both means the panel renders unchanged and Part-3 matching gets entity signal.
 */
export function normalizeMarketauxArticle(a = {}, { city = '', country = '' } = {}) {
  const entities = (Array.isArray(a.entities) ? a.entities : []).map((e) => ({
    symbol: e?.symbol || null,
    name: e?.name || null,
    sentiment: typeof e?.sentiment_score === 'number' ? e.sentiment_score : null,
    matchScore: typeof e?.match_score === 'number' ? e.match_score : null,
  }));
  const sScores = entities.map((e) => e.sentiment).filter((v) => typeof v === 'number');
  const sentiment = sScores.length ? sScores.reduce((s, v) => s + v, 0) / sScores.length : null;
  const publishedAt = a.published_at || null;
  const summary = a.description || a.snippet || '';
  const image = a.image_url || null;
  return {
    // chain-shape fields (ISRFeedCard normalizes these) —
    id: a.uuid || a.url || a.title,
    category: 'MARKETS',
    title: a.title || 'Market Update',
    summary,
    source: a.source || '',
    url: a.url || '#',
    image,
    time: publishedAt
      ? Math.floor(new Date(publishedAt).getTime() / 1000)
      : Math.floor(Date.now() / 1000),
    related: entities
      .map((e) => e.symbol)
      .filter(Boolean)
      .join(','),
    // richer Marketaux fields —
    headline: a.title || 'Market Update',
    imageUrl: image,
    publishedAt,
    entities,
    sentiment,
    city,
    country,
  };
}
