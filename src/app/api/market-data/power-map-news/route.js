import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

/** GET ?q=country+layer+keywords — scores Finnhub general news by query tokens */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q) {
      return NextResponse.json({ error: 'q param required' }, { status: 400 });
    }
    if (!FINNHUB_KEY) {
      return NextResponse.json({ news: [], error: 'FINNHUB_API_KEY not configured' }, { status: 503 });
    }

    const keywords = q
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const res = await fetch(`${BASE}/news?category=general&token=${FINNHUB_KEY}`);
    const generalNews = await res.json();
    const allNews = Array.isArray(generalNews) ? generalNews : [];

    const unique = [];
    const seen = new Set();
    for (const n of allNews) {
      const key = n.headline || n.id;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(n);
    }
    unique.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));

    const scored = unique
      .map((article) => {
        const headline = (article.headline || '').toLowerCase();
        const summary = (article.summary || '').toLowerCase();
        const related = (article.related || '').toLowerCase();
        const fullText = `${headline} ${summary} ${related}`;
        let score = 0;
        keywords.forEach((kw) => {
          if (headline.includes(kw)) score += 3;
          else if (summary.includes(kw)) score += 1;
          else if (related.includes(kw)) score += 1;
        });
        return { ...article, relevanceScore: score };
      })
      .filter((a) => a.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const finalNews = scored.length > 0 ? scored : unique.slice(0, 12).map((a) => ({ ...a, relevanceScore: 1 }));

    const formatted = finalNews.slice(0, 15).map((n) => ({
      id: n.id || n.headline?.slice(0, 24),
      category: (n.category || 'MARKETS').toUpperCase(),
      title: n.headline || 'Market Update',
      summary: n.summary,
      source: n.source || 'Finnhub',
      url: n.url || '#',
      image: n.image,
      time: n.datetime,
      related: n.related,
    }));

    return NextResponse.json(
      { news: formatted },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message, news: [] }, { status: 500 });
  }
}
