import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

const FMP_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY || process.env.FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';

async function safeJson(res) {
  try {
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

function mapFmpArticle(article, category, idx) {
  // FMP publishedDate is "YYYY-MM-DD HH:MM:SS" in UTC
  const iso = article?.publishedDate
    ? new Date(article.publishedDate.replace(' ', 'T') + 'Z').toISOString()
    : new Date().toISOString();
  return {
    id: `fmp-${category}-${idx}-${(article?.title || '').slice(0, 24)}`,
    type: 'news',
    category,
    title: article?.title || '(untitled)',
    country: 'Global',
    time: iso,
    impact: 'MODERATE',
    body: article?.text || article?.title || '',
    source: article?.site || article?.publisher || 'FMP',
    url: article?.url || null,
    image: article?.image || null,
    symbol: article?.symbol || null,
  };
}

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    if (!FMP_KEY) {
      console.warn('[economic-calendar] FMP_API_KEY not set — FMP news aggregation skipped, Finnhub still active.');
    }

    // FMP news: 4 endpoints in parallel, each capped at 50 articles.
    // If no FMP key, substitute resolved nulls so Promise.all still completes.
    const fmpRequests = FMP_KEY
      ? [
          fetch(`${FMP_BASE}/news/general-latest?page=0&limit=50&apikey=${FMP_KEY}`, { cache: 'no-store' }),
          fetch(`${FMP_BASE}/news/stock-latest?page=0&limit=50&apikey=${FMP_KEY}`, { cache: 'no-store' }),
          fetch(`${FMP_BASE}/news/crypto-latest?page=0&limit=50&apikey=${FMP_KEY}`, { cache: 'no-store' }),
          fetch(`${FMP_BASE}/news/forex-latest?page=0&limit=50&apikey=${FMP_KEY}`, { cache: 'no-store' }),
        ]
      : [Promise.resolve(null), Promise.resolve(null), Promise.resolve(null), Promise.resolve(null)];

    // EXISTING Finnhub calls — kept unchanged. New FMP calls added alongside.
    const [econRes, newsRes, fmpGeneralRes, fmpStockRes, fmpCryptoRes, fmpForexRes] = await Promise.all([
      fetch(`${BASE}/calendar/economic?from=${weekAgo}&to=${today}&token=${FINNHUB_KEY}`),
      fetch(`${BASE}/news?category=general&token=${FINNHUB_KEY}`),
      ...fmpRequests,
    ]);

    // EXISTING Finnhub parses — unchanged
    const econData = await econRes.json();
    const newsData = await newsRes.json();

    // NEW FMP parses — defensive so any one source failing doesn't break the route
    const fmpGeneral = fmpGeneralRes ? await safeJson(fmpGeneralRes) : [];
    const fmpStock = fmpStockRes ? await safeJson(fmpStockRes) : [];
    const fmpCrypto = fmpCryptoRes ? await safeJson(fmpCryptoRes) : [];
    const fmpForex = fmpForexRes ? await safeJson(fmpForexRes) : [];

    // ── Economic events (EXISTING — unchanged) ─────────────────────────────
    const econEvents = (econData?.economicCalendar || []).slice(0, 20).map((e, i) => ({
      id: `econ-${i}`,
      type: 'economic',
      title: e.event || 'Economic Event',
      country: e.country || 'Global',
      time: e.time || today,
      impact: e.impact === 3 ? 'CRITICAL' : e.impact === 2 ? 'ELEVATED' : 'MODERATE',
      actual: e.actual,
      estimate: e.estimate,
      previous: e.prev,
      body: [
        e.event,
        e.actual != null ? `Actual: ${e.actual}` : null,
        e.estimate != null ? `Estimate: ${e.estimate}` : null,
        e.prev != null ? `Previous: ${e.prev}` : null,
      ]
        .filter(Boolean)
        .join('. '),
    }));

    // ── Finnhub general news (EXISTING — unchanged) ────────────────────────
    const newsEvents = (Array.isArray(newsData) ? newsData : []).slice(0, 30).map((n) => ({
      id: `news-${n.id || n.headline?.slice(0, 10)}`,
      type: 'news',
      title: n.headline,
      country: 'Global',
      time: n.datetime ? new Date(n.datetime * 1000).toISOString() : new Date().toISOString(),
      impact: 'MODERATE',
      body: n.summary || n.headline,
      source: n.source,
      url: n.url,
    }));

    // ── FMP news from 4 sources (NEW — added alongside Finnhub news) ───────
    const fmpNewsEvents = [
      ...(Array.isArray(fmpGeneral) ? fmpGeneral.map((a, i) => mapFmpArticle(a, 'general', i)) : []),
      ...(Array.isArray(fmpStock) ? fmpStock.map((a, i) => mapFmpArticle(a, 'stock', i)) : []),
      ...(Array.isArray(fmpCrypto) ? fmpCrypto.map((a, i) => mapFmpArticle(a, 'crypto', i)) : []),
      ...(Array.isArray(fmpForex) ? fmpForex.map((a, i) => mapFmpArticle(a, 'forex', i)) : []),
    ];

    // Merge BOTH news sources, dedupe by URL (some stories syndicate across providers)
    const allNews = [...newsEvents, ...fmpNewsEvents];
    const seenUrls = new Set();
    const dedupedNews = allNews.filter((item) => {
      if (!item.url) return true;
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    // ── Merge econ + all news, sort by time desc, raise cap to 250 ─────────
    const combined = [...econEvents, ...dedupedNews].sort((a, b) => {
      const tA = new Date(a.time).getTime() || 0;
      const tB = new Date(b.time).getTime() || 0;
      return tB - tA;
    });

    return NextResponse.json(
      { events: combined.slice(0, 250) },
      {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      }
    );
  } catch (error) {
    console.error('[economic-calendar]', error);
    return NextResponse.json({ error: error.message, events: [] }, { status: 500 });
  }
}
