import { NextResponse } from 'next/server';
import { fetchAV, getAlphaVantageApiKey } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

function mapSentimentToGeneric(article) {
  const ts = article.time_published;
  let datetime = null;
  if (ts && ts.length >= 8) {
    const y = ts.slice(0, 4);
    const mo = ts.slice(4, 6);
    const d = ts.slice(6, 8);
    const hh = ts.slice(9, 11) || '00';
    const mm = ts.slice(11, 13) || '00';
    const ss = ts.slice(13, 15) || '00';
    datetime = `${y}-${mo}-${d}T${hh}:${mm}:${ss}Z`;
  }
  return {
    headline: article.title,
    title: article.title,
    url: article.url,
    source: article.source,
    datetime,
    summary: article.summary,
    overall_sentiment_score: article.overall_sentiment_score,
    overall_sentiment_label: article.overall_sentiment_label,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'general';

    const tickersRaw = (searchParams.get('tickers') || '').trim();
    if (tickersRaw && getAlphaVantageApiKey()) {
      const tickers = tickersRaw
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 50)
        .join(',');
      if (tickers) {
        try {
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
          const news = feed.map(mapSentimentToGeneric);
          return NextResponse.json({ news: news.slice(0, 50) });
        } catch (e) {
          console.warn('[market-data/news] Alpha Vantage failed, using Finnhub', e?.message || e);
        }
      }
    }

    const res = await fetch(`${BASE}/news?category=${category}&token=${FINNHUB_KEY}`, {
      next: { revalidate: 300 },
    });
    const data = await res.json();

    return NextResponse.json({ news: (data || []).slice(0, 50) });
  } catch (error) {
    return NextResponse.json({ error: error.message, news: [] }, { status: 500 });
  }
}
