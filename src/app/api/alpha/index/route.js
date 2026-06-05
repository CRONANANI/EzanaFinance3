import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAlphaVantageApiKey, fetchSingleGlobalQuote } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/alpha/index?symbols=SPX,DJI,VIX
 * GET /api/alpha/index?symbol=SPX
 * One GLOBAL_QUOTE per symbol (parallel).
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      if (!getAlphaVantageApiKey()) {
        return NextResponse.json(
          { error: 'ALPHA_VANTAGE_API_KEY not configured' },
          { status: 503 },
        );
      }
      const { searchParams } = new URL(request.url);
      const one = (searchParams.get('symbol') || '').trim().toUpperCase();
      const many = (searchParams.get('symbols') || '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const symbols = one ? [one, ...many.filter((s) => s !== one)] : many;
      const uniq = [...new Set(symbols)];
      if (!uniq.length) {
        return NextResponse.json({ error: 'symbol or symbols required' }, { status: 400 });
      }
      const results = await Promise.all(uniq.map((sym) => fetchSingleGlobalQuote(sym)));
      const quotes = {};
      results.forEach((q) => {
        if (q?.symbol) quotes[q.symbol] = q;
      });
      return NextResponse.json(
        { quotes },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
      );
    } catch (e) {
      console.error('[alpha/index]', e);
      return NextResponse.json(
        { error: e.message || 'Failed to fetch index quotes' },
        { status: 502 },
      );
    }
  },
  { requireAuth: false },
);
