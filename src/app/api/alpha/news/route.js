import { NextResponse } from 'next/server';
import { fetchAV, getAlphaVantageApiKey } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mapSentimentFeedItem(article) {
  return {
    title: article.title,
    url: article.url,
    source: article.source,
    time_published: article.time_published,
    summary: article.summary,
    banner_image: article.banner_image,
    overall_sentiment_score: article.overall_sentiment_score,
    overall_sentiment_label: article.overall_sentiment_label,
    ticker_sentiment: article.ticker_sentiment,
  };
}

/**
 * GET /api/alpha/news?tickers=AAPL,MSFT&limit=50
 * Alpha Vantage NEWS_SENTIMENT
 */
export async function GET(request) {
  try {
    if (!getAlphaVantageApiKey()) {
      return NextResponse.json({ error: 'ALPHA_VANTAGE_API_KEY not configured' }, { status: 503 });
    }
    const { searchParams } = new URL(request.url);
    const tickers = (searchParams.get('tickers') || '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 50)
      .join(',');
    if (!tickers) {
      return NextResponse.json(
        { error: 'tickers query required (comma-separated)' },
        { status: 400 },
      );
    }
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)));
    const data = await fetchAV(
      {
        function: 'NEWS_SENTIMENT',
        tickers,
        limit: String(limit),
        sort: 'LATEST',
      },
      300,
    );
    const feed = Array.isArray(data.feed) ? data.feed : [];
    const articles = feed.map(mapSentimentFeedItem);
    return NextResponse.json(
      { news: articles, articles },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (e) {
    console.error('[alpha/news]', e);
    return NextResponse.json(
      { news: [], articles: [], error: e.message || 'Failed to fetch news' },
      { status: 502 },
    );
  }
}
