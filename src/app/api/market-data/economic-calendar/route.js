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

// Map known FMP `site` domains to their proper publisher names.
// FMP usually returns a clean `publisher` field, but when it doesn't
// (or returns the domain itself), this fallback converts the domain
// to a friendly name.
const PUBLISHER_FALLBACKS = {
  'fool.com': 'The Motley Fool',
  'seekingalpha.com': 'Seeking Alpha',
  'cnbc.com': 'CNBC',
  'reuters.com': 'Reuters',
  'bloomberg.com': 'Bloomberg',
  'wsj.com': 'The Wall Street Journal',
  'marketwatch.com': 'MarketWatch',
  'barrons.com': "Barron's",
  'forbes.com': 'Forbes',
  'businessinsider.com': 'Business Insider',
  'investors.com': "Investor's Business Daily",
  'zacks.com': 'Zacks Investment Research',
  'benzinga.com': 'Benzinga',
  'thestreet.com': 'TheStreet',
  'yahoo.com': 'Yahoo Finance',
  'finance.yahoo.com': 'Yahoo Finance',
  'investing.com': 'Investing.com',
  'fxstreet.com': 'FX Street',
  'coingape.com': 'CoinGape',
  'coindesk.com': 'CoinDesk',
  'cointelegraph.com': 'Cointelegraph',
  'decrypt.co': 'Decrypt',
  'theblock.co': 'The Block',
  'crypto.news': 'Crypto News',
  'bitcoinist.com': 'Bitcoinist',
  'newsbtc.com': 'NewsBTC',
  'cryptoslate.com': 'CryptoSlate',
  'ambcrypto.com': 'AMBCrypto',
  'u.today': 'U.Today',
  'kitco.com': 'Kitco News',
  'dailyfx.com': 'DailyFX',
  'forexlive.com': 'ForexLive',
};

function friendlyPublisher(article) {
  const pub = (article?.publisher || '').trim();
  const site = (article?.site || '').trim().toLowerCase();
  // If the `publisher` field is present and isn't itself a domain
  // (e.g. some FMP entries put "fool.com" in publisher), use it.
  const looksLikeDomain = /\./.test(pub) && !/\s/.test(pub);
  if (pub && !looksLikeDomain) return pub;
  // Otherwise check our friendly-name map.
  if (site && PUBLISHER_FALLBACKS[site]) return PUBLISHER_FALLBACKS[site];
  // Last resort: title-case the bare domain (fool.com → Fool).
  if (site) {
    const bare = site.replace(/^www\./, '').split('.')[0];
    return bare.charAt(0).toUpperCase() + bare.slice(1);
  }
  return 'FMP';
}

// Trim FMP's full article text to a single sentence, 15-25 words.
// Mirrors the visual length of Finnhub's `summary` field so cards
// from both providers look uniform in the chain view.
function summarizeText(text) {
  if (!text) return '';
  const cleaned = String(text).replace(/\s+/g, ' ').trim();

  // Take everything up to the first sentence-ending punctuation.
  const firstSentenceMatch = cleaned.match(/^[^.!?]+[.!?]/);
  let firstSentence = firstSentenceMatch ? firstSentenceMatch[0].trim() : cleaned;

  // If the first sentence is too short (<15 words), append the next one.
  const words = firstSentence.split(' ').filter(Boolean);
  if (words.length < 15) {
    const rest = cleaned.slice(firstSentence.length).trim();
    const nextMatch = rest.match(/^[^.!?]+[.!?]/);
    if (nextMatch) {
      firstSentence = (firstSentence + ' ' + nextMatch[0]).trim();
    }
  }

  // Cap at 25 words with an ellipsis.
  const finalWords = firstSentence.split(' ').filter(Boolean);
  if (finalWords.length > 25) {
    return finalWords.slice(0, 25).join(' ').replace(/[,;:]$/, '') + '…';
  }
  return firstSentence;
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
    // Single-sentence summary, 15-25 words — matches Finnhub item length
    body: summarizeText(article?.text) || article?.title || '',
    // Friendly publisher name (e.g. "The Motley Fool"), not the bare domain
    source: friendlyPublisher(article),
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
