import { NextResponse } from 'next/server';
import { countryKeywords, layerKeywords } from '@/lib/powerMapArticleQueries';

export const dynamic = 'force-dynamic';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

/**
 * GET /api/market-data/power-map-news
 *
 * Query params:
 *   country  — country name (e.g. "Russia", "United States")
 *   layers   — comma-separated power layer slugs (e.g. "military,economic")
 *
 * Returns articles that:
 *   1. MENTION the selected country (or any of its aliases) — HARD REQUIREMENT
 *   2. RELATE to at least one selected layer (boosts ranking) — SOFT SCORING
 *
 * If no layers are selected, articles must still mention the country
 * but no topical filtering is applied.
 *
 * If no country-relevant articles exist in the news feed, returns an
 * empty array. We do NOT fall back to unrelated news.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = (searchParams.get('country') || '').trim();
    const layersParam = (searchParams.get('layers') || '').trim();
    const layers = layersParam
      ? layersParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    // Backward-compat: support old `q=` queries where the first word was country
    if (!country) {
      const q = (searchParams.get('q') || '').trim();
      if (!q) {
        return NextResponse.json({ error: 'country param required' }, { status: 400 });
      }
      if (!FINNHUB_KEY) {
        return NextResponse.json(
          { news: [], error: 'FINNHUB_API_KEY not configured' },
          { status: 503 }
        );
      }
      const tokens = q.split(/\s+/);
      return fetchAndFilter(tokens[0], []);
    }

    if (!FINNHUB_KEY) {
      return NextResponse.json(
        { news: [], error: 'FINNHUB_API_KEY not configured' },
        { status: 503 }
      );
    }

    return fetchAndFilter(country, layers);
  } catch (error) {
    console.error('[power-map-news] unexpected error:', error);
    return NextResponse.json({ error: error.message, news: [] }, { status: 500 });
  }
}

async function fetchAndFilter(country, layers) {
  // Pull both general news and forex news for broader country coverage
  // (Finnhub `general` is mostly US markets; `forex` has global geopolitics)
  const newsResponses = await Promise.all([
    fetch(`${BASE}/news?category=general&token=${FINNHUB_KEY}`).then((r) =>
      r.ok ? r.json() : []
    ),
    fetch(`${BASE}/news?category=forex&token=${FINNHUB_KEY}`).then((r) =>
      r.ok ? r.json() : []
    ),
  ]);

  const allNews = newsResponses.flat().filter(Boolean);

  // Dedupe by headline
  const seen = new Set();
  const unique = [];
  for (const n of allNews) {
    const key = n.headline || n.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(n);
  }

  // STEP 1: HARD COUNTRY FILTER
  // The article must mention the selected country (by name or any alias).
  const countryTerms = countryKeywords(country);
  const countryRelevant = unique.filter((article) => {
    const haystack = `${article.headline || ''} ${article.summary || ''} ${article.related || ''}`.toLowerCase();
    return countryTerms.some((term) => haystack.includes(term));
  });

  // STEP 2: SOFT LAYER SCORING
  // Articles matching layer keywords get a relevance boost. If no layers
  // are selected, every country-relevant article scores equally.
  const lyrTerms =
    layers.length > 0
      ? [...new Set(layerKeywords(layers))]
      : [];

  const scored = countryRelevant
    .map((article) => {
      const headline = (article.headline || '').toLowerCase();
      const summary = (article.summary || '').toLowerCase();
      const related = (article.related || '').toLowerCase();

      let score = 1; // Baseline for country-relevant articles
      const matchedLayers = new Set();

      if (lyrTerms.length > 0) {
        // Layer scoring: stronger for headline match, weaker for summary, weakest for related
        for (const term of lyrTerms) {
          if (headline.includes(term)) {
            score += 4;
            matchedLayers.add(term);
          } else if (summary.includes(term)) {
            score += 2;
            matchedLayers.add(term);
          } else if (related.includes(term)) {
            score += 1;
            matchedLayers.add(term);
          }
        }

        // If layers were selected but the article matched zero layer terms,
        // it's about the country but off-topic — drop it.
        if (matchedLayers.size === 0) {
          return null;
        }
      }

      // Boost recent articles (within 24h get extra weight)
      const ageMs = Date.now() - (article.datetime || 0) * 1000;
      if (ageMs < 86400000) score += 2;
      else if (ageMs < 604800000) score += 1;

      return { ...article, relevanceScore: score };
    })
    .filter(Boolean);

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const formatted = scored.slice(0, 15).map((n) => ({
    id: n.id || n.headline?.slice(0, 24),
    category: (n.category || 'MARKETS').toUpperCase(),
    title: n.headline || 'Market Update',
    summary: n.summary,
    source: n.source || 'Finnhub',
    url: n.url || '#',
    image: n.image,
    time: n.datetime,
    related: n.related,
    relevanceScore: n.relevanceScore,
  }));

  return NextResponse.json(
    {
      news: formatted,
      country,
      layers,
      totalScanned: unique.length,
      countryRelevant: countryRelevant.length,
      finalMatches: formatted.length,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
