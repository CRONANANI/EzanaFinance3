import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { CITY_NEWS_SOURCES } from '@/config/cityNewsSources';
import { hasMarketaux, fetchCityNews, normalizeMarketauxArticle } from '@/lib/marketaux/client';

export const dynamic = 'force-dynamic';

const MAX_Q = 120;
const LIMIT = 5;

/**
 * GET /api/news/city
 *
 * Two modes:
 *   ?city=<key>  the curated source list for a CITY_NEWS_SOURCES city (as
 *                before; articles stay empty).
 *   ?q=<text>    recent news matching free text, newest first, via the
 *                Marketaux client the market-data routes already use. Used by
 *                the Echo globe rail's city news card, whose cities are
 *                arbitrary ("Tehran", "Dangote Refinery, Lagos"). Returns
 *                { articles: [{ title, source, url, publishedAt }] }, at most
 *                5. Fails open: no token or an upstream error is an empty
 *                list with a 200, never a 500.
 */
export const GET = withApiGuard(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().slice(0, MAX_Q);

    if (q) {
      if (!hasMarketaux()) {
        return NextResponse.json({ q, articles: [], degraded: 'news source not configured' });
      }
      try {
        const phrase = /\s/.test(q) ? `"${q.replace(/"/g, '')}"` : q;
        const { articles = [] } = await fetchCityNews({ search: phrase, limit: LIMIT });
        const items = articles
          .map((a) => normalizeMarketauxArticle(a))
          .filter((a) => a.url && a.url !== '#')
          .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
          .slice(0, LIMIT)
          .map((a) => ({
            title: a.title,
            source: a.source,
            url: a.url,
            publishedAt: a.publishedAt,
          }));
        return NextResponse.json(
          { q, articles: items },
          { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } },
        );
      } catch {
        return NextResponse.json({ q, articles: [] });
      }
    }

    const cityKey = searchParams.get('city');
    if (!cityKey || !CITY_NEWS_SOURCES[cityKey]) {
      return NextResponse.json({ error: 'Invalid city' }, { status: 400 });
    }

    const cityData = CITY_NEWS_SOURCES[cityKey];

    return NextResponse.json({
      city: cityData.city,
      region: cityData.region,
      sources: cityData.sources,
      articles: [],
    });
  },
  { requireAuth: false },
);
