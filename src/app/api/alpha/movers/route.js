import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAlphaVantageApiKey, fetchAlphaTopMovers } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/alpha/movers?limit=3 — TOP_GAINERS_LOSERS */
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
      const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit') || 5)));
      const { gainers, losers } = await fetchAlphaTopMovers(limit);
      return NextResponse.json(
        { gainers, losers },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
      );
    } catch (e) {
      console.error('[alpha/movers]', e);
      return NextResponse.json(
        { gainers: [], losers: [], error: e.message || 'Failed to fetch movers' },
        { status: 502 },
      );
    }
  },
  { requireAuth: false },
);
