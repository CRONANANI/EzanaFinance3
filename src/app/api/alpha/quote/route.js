import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAlphaVantageApiKey, fetchSingleGlobalQuote } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/alpha/quote?symbol=IBM */
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
      const symbol = (searchParams.get('symbol') || '').trim().toUpperCase();
      if (!symbol) {
        return NextResponse.json({ error: 'symbol required' }, { status: 400 });
      }
      const quote = await fetchSingleGlobalQuote(symbol);
      if (!quote) {
        return NextResponse.json({ error: 'No quote returned' }, { status: 404 });
      }
      return NextResponse.json(
        { quote },
        { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
      );
    } catch (e) {
      console.error('[alpha/quote]', e);
      return NextResponse.json({ error: e.message || 'Failed to fetch quote' }, { status: 502 });
    }
  },
  { requireAuth: false },
);
