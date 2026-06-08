import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AV_BASE = 'https://www.alphavantage.co/query';

// This route is a scheduled cron (see vercel.json). Vercel automatically sends
// `Authorization: Bearer <CRON_SECRET>` on cron invocations, so we require that
// token to prevent anonymous callers from triggering polls (API-quota abuse).
function isCronAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') ?? '') === `Bearer ${secret}`;
}

function getAvKey() {
  return process.env.ALPHA_VANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || '';
}

function mapAvTopic(topics) {
  if (!Array.isArray(topics) || !topics.length) return 'Economy';
  const topicMap = {
    blockchain: 'Tech',
    earnings: 'Economy',
    ipo: 'Economy',
    mergers_and_acquisitions: 'Economy',
    financial_markets: 'Economy',
    economy_fiscal: 'Economy',
    economy_monetary: 'Economy',
    economy_macro: 'Economy',
    energy_transportation: 'Energy',
    finance: 'Economy',
    life_sciences: 'Health',
    manufacturing: 'Economy',
    real_estate: 'Economy',
    retail_wholesale: 'Economy',
    technology: 'Tech',
  };
  for (const t of topics) {
    const label = (typeof t === 'string' ? t : t?.topic)?.toLowerCase();
    if (label && topicMap[label]) return topicMap[label];
  }
  return 'Economy';
}

function mapAvSeverity(overallSentiment, relevanceScore) {
  const score = parseFloat(overallSentiment) || 0;
  const absScore = Math.abs(score);
  const relevance = parseFloat(relevanceScore) || 0;

  if (absScore > 0.35 && relevance > 0.8) return 'Critical';
  if (absScore > 0.25 || relevance > 0.7) return 'High';
  if (absScore > 0.15) return 'Medium';
  return 'Low';
}

function inferRegion(tickers) {
  if (!Array.isArray(tickers) || !tickers.length) return { id: 'US', label: 'United States' };

  for (const t of tickers) {
    const ticker = t.ticker || '';
    if (ticker.startsWith('FOREX:')) return { id: 'EU', label: 'Europe' };
    if (ticker.startsWith('CRYPTO:')) return { id: 'US', label: 'United States' };
    if (ticker.includes('.LON')) return { id: 'UK', label: 'United Kingdom' };
    if (ticker.includes('.DEX')) return { id: 'EU', label: 'Europe' };
    if (ticker.includes('.SHH') || ticker.includes('.SHZ')) return { id: 'CN', label: 'China' };
    if (ticker.includes('.BSE')) return { id: 'IN', label: 'India' };
    if (ticker.includes('.TRT')) return { id: 'US', label: 'North America' };
  }
  return { id: 'US', label: 'United States' };
}

function stableAvId(url) {
  if (url && typeof Buffer !== 'undefined') {
    try {
      return `av-${Buffer.from(url, 'utf8').toString('base64url').slice(0, 40)}`;
    } catch {
      /* fall through */
    }
  }
  return `av-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeAvArticle(article) {
  const tickersArr = article.ticker_sentiment || [];
  const region = inferRegion(tickersArr);
  const tickers = tickersArr.map((t) => t.ticker).filter(Boolean);
  const topic = mapAvTopic(article.topics);
  const severity = mapAvSeverity(article.overall_sentiment_score, article.relevance_score);

  const rawId = article.url ? stableAvId(article.url) : stableAvId(null);

  return {
    id: rawId,
    title: article.title || 'Untitled',
    description: article.summary || null,
    article_url: article.url || null,
    image_url: article.banner_image || null,
    author: (article.authors || []).join(', ') || null,
    publisher_name: article.source || null,
    publisher_homepage: article.source_domain ? `https://${article.source_domain}` : null,
    publisher_favicon: article.source_domain
      ? `https://www.google.com/s2/favicons?domain=${article.source_domain}&sz=32`
      : null,
    tickers,
    keywords: (article.topics || [])
      .map((t) => (typeof t === 'string' ? t : t?.topic))
      .filter(Boolean),
    insights: tickersArr.map((t) => ({
      ticker: t.ticker,
      sentiment: t.ticker_sentiment_label,
      score: parseFloat(t.ticker_sentiment_score) || 0,
      relevance: parseFloat(t.relevance_score) || 0,
    })),
    published_utc: article.time_published
      ? `${article.time_published.slice(0, 4)}-${article.time_published.slice(4, 6)}-${article.time_published.slice(6, 8)}T${article.time_published.slice(9, 11)}:${article.time_published.slice(11, 13)}:${article.time_published.slice(13, 15)}Z`
      : new Date().toISOString(),
    region: region.id,
    region_label: region.label,
    topic,
    severity,
    source_api: 'alpha_vantage',
  };
}

/**
 * GET /api/news/alpha-vantage/poll
 *
 * Fetches NEWS_SENTIMENT and upserts into news_articles_cache (alongside Massive).
 */
export const GET = withApiGuard(
  async (request, user) => {
    if (!isCronAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const AV_KEY = getAvKey();
    if (!AV_KEY) {
      return NextResponse.json({ fetched: false, reason: 'no_av_key' });
    }

    try {
      const url = `${AV_BASE}?function=NEWS_SENTIMENT&limit=50&sort=LATEST&apikey=${encodeURIComponent(AV_KEY)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        return NextResponse.json({ fetched: false, reason: `av_http_${res.status}` });
      }
      const data = await res.json();

      if (data['Note'] || data['Information'] || data['Error Message']) {
        return NextResponse.json({ fetched: false, reason: 'av_rate_limit' });
      }

      const feed = data.feed || [];
      if (!feed.length) {
        return NextResponse.json({ fetched: true, inserted: 0, total: 0 });
      }

      const normalized = feed.filter((a) => a.url && a.title).map(normalizeAvArticle);

      if (normalized.length > 0) {
        const { error: upsertErr } = await supabaseAdmin
          .from('news_articles_cache')
          .upsert(normalized, { onConflict: 'id', ignoreDuplicates: true });

        if (upsertErr) {
          console.error('[av-news-poll] upsert error:', upsertErr.message);
          return NextResponse.json({ fetched: true, inserted: 0, error: upsertErr.message });
        }
      }

      return NextResponse.json({
        fetched: true,
        inserted: normalized.length,
        total: feed.length,
      });
    } catch (err) {
      console.error('[av-news-poll] error:', err.message);
      return NextResponse.json({ fetched: false, error: err.message }, { status: 500 });
    }
  },
  { requireAuth: false },
);
