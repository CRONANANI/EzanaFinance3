import { NextResponse } from 'next/server';

import { DISPLAY_TO_CANONICAL, resolveSectorQuery, CANONICAL_SECTORS } from '@/lib/fmp/sector-performance';

export const dynamic = 'force-dynamic';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FMP_KEY = process.env.FMP_API_KEY;
const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FMP_BASE = 'https://financialmodelingprep.com/stable';

const VALID_RANGES = new Set(['1D', '1W', '1M', 'YTD']);

const SECTOR_KEYWORDS = {
  Technology: ['technology', 'tech', 'software', 'semiconductor', 'cloud', 'ai', 'apple', 'microsoft', 'nvidia', 'meta', 'alphabet', 'google'],
  'Financial Services': ['bank', 'banking', 'financial', 'jpmorgan', 'wells fargo', 'citigroup', 'goldman', 'morgan stanley', 'visa', 'mastercard', 'fintech'],
  Healthcare: ['healthcare', 'pharma', 'pharmaceutical', 'biotech', 'medical', 'drug', 'fda', 'pfizer', 'merck', 'johnson', 'unitedhealth'],
  'Consumer Cyclical': ['retail', 'consumer cyclical', 'consumer', 'amazon', 'tesla', 'home depot', 'mcdonalds', 'starbucks', 'nike', 'auto'],
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

/** Merge keyword lists for news (canonical + display + raw param). */
function keywordsForNews(rawParam, canonicalSector) {
  const { display } = resolveSectorQuery(rawParam);
  const sets = [
    getSectorKeywords(canonicalSector),
    rawParam !== canonicalSector ? getSectorKeywords(rawParam) : [],
    display && display !== rawParam && display !== canonicalSector ? getSectorKeywords(display) : [],
  ];
  const out = [];
  const seen = new Set();
  for (const list of sets) {
    for (const k of list) {
      const low = k.toLowerCase();
      if (!seen.has(low)) {
        seen.add(low);
        out.push(low);
      }
    }
  }
  return out;
}

function tradingDaysFor(range) {
  switch (range) {
    case '1W':
      return 5;
    case '1M':
      return 21;
    case 'YTD': {
      const now = new Date();
      const jan1 = new Date(now.getFullYear(), 0, 1);
      const calendarDays = Math.floor((now - jan1) / (1000 * 60 * 60 * 24));
      return Math.max(5, Math.floor((calendarDays * 252) / 365));
    }
    default:
      return 0;
  }
}

function toCanonicalSector(sectorParam) {
  if (CANONICAL_SECTORS.includes(sectorParam)) return sectorParam;
  return DISPLAY_TO_CANONICAL[sectorParam] || sectorParam;
}

function barClose(bar) {
  if (!bar || typeof bar !== 'object') return null;
  const n = Number(bar.adjClose ?? bar.close ?? bar.price);
  return Number.isFinite(n) ? n : null;
}

/** Newest-first array of OHLC rows (by date string). */
function normalizeSeriesDesc(series) {
  if (!Array.isArray(series) || series.length === 0) return [];
  const withDate = series.filter((r) => r && r.date);
  return [...withDate].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

async function fetchSectorCandidates(canonicalSector) {
  if (!FMP_KEY) {
    console.warn('[sector-detail] FMP_API_KEY missing — screener skipped');
    return [];
  }
  try {
    const params = new URLSearchParams({
      sector: canonicalSector,
      isActivelyTrading: 'true',
      isEtf: 'false',
      isFund: 'false',
      limit: '200',
      apikey: FMP_KEY,
    });
    const url = `${FMP_BASE}/company-screener?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) {
      console.warn(`[sector-detail] screener HTTP ${res.status} for sector="${canonicalSector}"`);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`[sector-detail] screener returned 0 rows for sector="${canonicalSector}"`);
      return [];
    }
    console.log(`[sector-detail] screener ${data.length} rows for sector="${canonicalSector}"`);
    return data
      .map((c) => ({
        symbol: c.symbol,
        name: c.companyName || c.name,
        marketCap: Number(c.marketCap) || 0,
      }))
      .filter((c) => c.symbol)
      .sort((a, b) => b.marketCap - a.marketCap);
  } catch (err) {
    console.error('[sector-detail] screener fetch failed:', err);
    return [];
  }
}

async function fetch1DPerformance(candidates) {
  if (candidates.length === 0 || !FMP_KEY) return [];
  const top60 = candidates.slice(0, 60);
  const symbolList = top60.map((c) => c.symbol).join(',');
  const url = `${FMP_BASE}/quote?symbol=${encodeURIComponent(symbolList)}&apikey=${encodeURIComponent(FMP_KEY)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.warn(`[sector-detail] quote HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((q) => Number.isFinite(Number(q.changesPercentage)))
      .map((q) => ({
        symbol: q.symbol,
        name: q.name || top60.find((c) => c.symbol === q.symbol)?.name || q.symbol,
        price: Number(q.price),
        changePct: Number(q.changesPercentage),
        marketCap: top60.find((c) => c.symbol === q.symbol)?.marketCap ?? null,
      }));
  } catch (err) {
    console.error('[sector-detail] 1D quote fetch failed:', err);
    return [];
  }
}

async function fetchHistoricalPerformance(candidates, range) {
  if (candidates.length === 0 || !FMP_KEY) return [];
  const days = tradingDaysFor(range);
  if (days < 1) return [];
  const top60 = candidates.slice(0, 60);

  const results = await Promise.all(
    top60.map(async (c) => {
      try {
        const url = `${FMP_BASE}/historical-price-eod/light?symbol=${encodeURIComponent(c.symbol)}&apikey=${encodeURIComponent(FMP_KEY)}`;
        const res = await fetch(url, { next: { revalidate: 600 } });
        if (!res.ok) return null;
        const data = await res.json();
        const seriesRaw = Array.isArray(data) ? data : data?.historical;
        const desc = normalizeSeriesDesc(seriesRaw);
        if (desc.length < days + 1) return null;
        const latest = desc[0];
        const earlier = desc[Math.min(days, desc.length - 1)];
        const pLatest = barClose(latest);
        const pEarlier = barClose(earlier);
        if (pLatest == null || pEarlier == null || pEarlier === 0) return null;
        const changePct = ((pLatest - pEarlier) / pEarlier) * 100;
        return {
          symbol: c.symbol,
          name: c.name,
          price: pLatest,
          changePct,
          marketCap: c.marketCap,
        };
      } catch {
        return null;
      }
    }),
  );

  return results.filter(Boolean);
}

async function fetchTopPerformers(canonicalSector, range) {
  const candidates = await fetchSectorCandidates(canonicalSector);
  if (candidates.length === 0) return [];

  const performance =
    range === '1D' ? await fetch1DPerformance(candidates) : await fetchHistoricalPerformance(candidates, range);

  return performance
    .filter((p) => Number.isFinite(p.changePct))
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 50);
}

async function fetchSectorNews(rawSectorParam, canonicalSector) {
  if (!FINNHUB_KEY) {
    console.warn('[sector-detail] FINNHUB_API_KEY missing — news skipped');
    return [];
  }
  try {
    const keywords = keywordsForNews(rawSectorParam, canonicalSector);
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
    const sectorParam = (searchParams.get('sector') || '').trim();
    const rangeParam = (searchParams.get('range') || '1D').trim().toUpperCase();

    if (!sectorParam) {
      return NextResponse.json({ error: 'sector param required' }, { status: 400 });
    }

    const range = VALID_RANGES.has(rangeParam) ? rangeParam : '1D';
    const canonicalSector = toCanonicalSector(sectorParam);
    const { display: sectorDisplay } = resolveSectorQuery(sectorParam);

    console.log(
      `[sector-detail] sector="${sectorParam}" → canonical="${canonicalSector}" range="${range}"`,
    );

    const [topPerformers, news] = await Promise.all([
      fetchTopPerformers(canonicalSector, range),
      fetchSectorNews(sectorParam, canonicalSector),
    ]);

    return NextResponse.json(
      {
        sector: sectorParam,
        canonicalSector,
        sectorDisplay: sectorDisplay || sectorParam,
        range,
        topPerformers,
        news,
        diagnostics: {
          topPerformersCount: topPerformers.length,
          newsCount: news.length,
          fmpAvailable: Boolean(FMP_KEY),
          finnhubAvailable: Boolean(FINNHUB_KEY),
          sectorMappedFrom: sectorParam !== canonicalSector ? sectorParam : null,
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
