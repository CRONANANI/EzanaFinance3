import { NextResponse } from 'next/server';

import { resolveSectorQuery } from '@/lib/fmp/sector-performance';

export const dynamic = 'force-dynamic';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FMP_KEY = process.env.FMP_API_KEY;
const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FMP_BASE = 'https://financialmodelingprep.com/stable';

/**
 * Sector → keyword list for news filtering.
 */
const SECTOR_KEYWORDS = {
  Technology: ['technology', 'tech', 'software', 'semiconductor', 'cloud', 'ai', 'apple', 'microsoft', 'nvidia', 'meta', 'alphabet', 'google'],
  'Financial Services': ['bank', 'banking', 'financial', 'jpmorgan', 'wells fargo', 'citigroup', 'goldman', 'morgan stanley', 'visa', 'mastercard', 'fintech'],
  Healthcare: ['healthcare', 'pharma', 'pharmaceutical', 'biotech', 'medical', 'drug', 'fda', 'pfizer', 'merck', 'johnson', 'unitedhealth'],
  'Consumer Cyclical': ['retail', 'consumer', 'amazon', 'tesla', 'home depot', 'mcdonalds', 'starbucks', 'nike', 'auto'],
  'Consumer Defensive': ['walmart', 'costco', 'procter', 'pepsico', 'coca-cola', 'consumer staples', 'grocery'],
  Energy: ['oil', 'gas', 'energy', 'opec', 'exxon', 'chevron', 'petroleum', 'crude', 'lng', 'renewable'],
  Industrials: ['manufacturing', 'industrial', 'boeing', 'caterpillar', 'general electric', 'ge ', 'lockheed', 'logistics'],
  'Communication Services': ['communication', 'telecom', 'verizon', 'at&t', 'netflix', 'disney', 'comcast', 'media'],
  'Basic Materials': ['materials', 'mining', 'chemical', 'steel', 'gold', 'copper', 'aluminum', 'commodities'],
  Materials: ['materials', 'mining', 'chemical', 'steel', 'gold', 'copper', 'aluminum', 'commodities'],
  Utilities: ['utility', 'utilities', 'electric', 'power grid', 'natural gas utility', 'water utility'],
  'Real Estate': ['real estate', 'reit', 'property', 'realty', 'housing', 'commercial real estate'],
};

function getSectorKeywords(sectorName) {
  return SECTOR_KEYWORDS[sectorName] || [sectorName.toLowerCase()];
}

async function fetchTopPerformers(sectorName) {
  if (!FMP_KEY) return [];
  try {
    const params = new URLSearchParams({
      sector: sectorName,
      isActivelyTrading: 'true',
      isEtf: 'false',
      isFund: 'false',
      limit: '100',
      apikey: FMP_KEY,
    });
    const url = `${FMP_BASE}/company-screener?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      console.warn('[sector-detail] FMP screener non-OK:', res.status);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const sorted = [...data].sort((a, b) => (Number(b.marketCap) || 0) - (Number(a.marketCap) || 0));
    const symbols = sorted
      .slice(0, 20)
      .map((c) => c.symbol)
      .filter(Boolean);
    if (symbols.length === 0) return [];

    const quotesUrl = `${FMP_BASE}/quote?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${encodeURIComponent(FMP_KEY)}`;
    const quotesRes = await fetch(quotesUrl, { next: { revalidate: 60 } });
    if (!quotesRes.ok) return [];
    const quotes = await quotesRes.json();
    if (!Array.isArray(quotes)) return [];

    const nameBySymbol = new Map(sorted.slice(0, 20).map((c) => [c.symbol, c.companyName || c.name || c.symbol]));

    return quotes
      .filter((q) => Number.isFinite(Number(q.changesPercentage)))
      .map((q) => ({
        symbol: q.symbol,
        name: q.name || nameBySymbol.get(q.symbol) || q.symbol,
        price: Number(q.price),
        change: Number(q.change),
        changePct: Number(q.changesPercentage),
        marketCap: q.marketCap != null ? Number(q.marketCap) : null,
      }))
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 5);
  } catch (err) {
    console.error('[sector-detail] top performers fetch failed:', err);
    return [];
  }
}

async function fetchSectorNews(sectorName) {
  if (!FINNHUB_KEY) return [];
  try {
    const keywords = getSectorKeywords(sectorName).map((k) => k.toLowerCase());
    const responses = await Promise.all([
      fetch(`${FINNHUB_BASE}/news?category=general&token=${encodeURIComponent(FINNHUB_KEY)}`, {
        next: { revalidate: 300 },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${FINNHUB_BASE}/news?category=forex&token=${encodeURIComponent(FINNHUB_KEY)}`, {
        next: { revalidate: 300 },
      }).then((r) => (r.ok ? r.json() : [])),
    ]);

    const all = responses.flat().filter(Boolean);
    const seen = new Set();
    const unique = [];
    for (const article of all) {
      const key = article.url || article.headline;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(article);
    }

    const filtered = unique.filter((article) => {
      const haystack = `${article.headline || ''} ${article.summary || ''} ${article.related || ''}`.toLowerCase();
      return keywords.some((kw) => haystack.includes(kw));
    });

    filtered.sort((a, b) => (Number(b.datetime) || 0) - (Number(a.datetime) || 0));

    return filtered.slice(0, 10).map((n) => ({
      id: n.id != null ? String(n.id) : n.url || n.headline,
      title: n.headline || 'Market Update',
      summary: n.summary || '',
      source: n.source || 'Finnhub',
      url: n.url || '#',
      image: n.image,
      time: n.datetime,
    }));
  } catch (err) {
    console.error('[sector-detail] news fetch failed:', err);
    return [];
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = (searchParams.get('sector') || '').trim();
    if (!raw) {
      return NextResponse.json({ error: 'sector param required' }, { status: 400 });
    }

    const { canonical, display } = resolveSectorQuery(raw);
    const sector = canonical || raw;

    const [topPerformers, news] = await Promise.all([fetchTopPerformers(sector), fetchSectorNews(sector)]);

    return NextResponse.json(
      {
        sector,
        sectorDisplay: display || sector,
        topPerformers,
        news,
        diagnostics: {
          topPerformersCount: topPerformers.length,
          newsCount: news.length,
          fmpAvailable: Boolean(FMP_KEY),
          finnhubAvailable: Boolean(FINNHUB_KEY),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('[sector-detail] unexpected error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message, topPerformers: [], news: [] }, { status: 500 });
  }
}
