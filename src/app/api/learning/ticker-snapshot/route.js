import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

const FMP_BASE = 'https://financialmodelingprep.com/stable';

function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

/**
 * GET /api/learning/ticker-snapshot?symbol=AAPL
 *
 * Returns minimal metadata for a ticker popup card:
 *   { symbol, name, price, ytdChangePct, sector, industry, marketCap }
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      const url = new URL(request.url);
      const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
      if (!symbol) {
        return NextResponse.json({ error: 'symbol required' }, { status: 400 });
      }

      const apiKey = getFmpKey();
      if (!apiKey) {
        return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 503 });
      }

      const [quoteRes, profileRes] = await Promise.all([
        fetch(`${FMP_BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`, { cache: 'no-store' }),
        fetch(`${FMP_BASE}/profile?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`, { cache: 'no-store' }),
      ]);

      const [quoteArr, profileArr] = await Promise.all([
        quoteRes.ok ? quoteRes.json() : null,
        profileRes.ok ? profileRes.json() : null,
      ]);

      const quote = Array.isArray(quoteArr) ? quoteArr[0] : null;
      const profile = Array.isArray(profileArr) ? profileArr[0] : null;

      if (!quote && !profile) {
        return NextResponse.json({ symbol, name: symbol }, { status: 200 });
      }

      const ytdChangePct = quote?.changesPercentage ?? null;

      let marketCap = null;
      if (profile?.mktCap) {
        const cap = Number(profile.mktCap);
        if (cap > 1e12) marketCap = `$${(cap / 1e12).toFixed(2)}T`;
        else if (cap > 1e9) marketCap = `$${(cap / 1e9).toFixed(2)}B`;
        else if (cap > 1e6) marketCap = `$${(cap / 1e6).toFixed(0)}M`;
      }

      return NextResponse.json({
        symbol,
        name: profile?.companyName || quote?.name || symbol,
        price: quote?.price ?? null,
        ytdChangePct,
        sector: profile?.sector || null,
        industry: profile?.industry || null,
        marketCap,
      });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  },
  { requireAuth: false },
);
