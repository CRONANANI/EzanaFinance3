import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAlphaVantageApiKey, fetchAlphaTopMovers } from '@/lib/alpha-vantage';
import { getBiggestGainers, getBiggestLosers } from '@/lib/fmp/movers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/fmp/movers?limit=3
 *
 * Returns { gainers: [...], losers: [...] }. Prefers Alpha Vantage TOP_GAINERS_LOSERS when configured;
 * falls back to FMP biggest-gainers / biggest-losers.
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const limit = Math.min(10, Math.max(1, Number(searchParams.get('limit') || 3)));

      if (getAlphaVantageApiKey()) {
        try {
          const { gainers, losers } = await fetchAlphaTopMovers(limit);
          if (gainers.length > 0 || losers.length > 0) {
            return NextResponse.json(
              { gainers, losers },
              { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
            );
          }
        } catch (e) {
          console.warn('[fmp/movers] Alpha Vantage failed, using FMP', e?.message || e);
        }
      }

      const [gainers, losers] = await Promise.allSettled([
        getBiggestGainers(limit),
        getBiggestLosers(limit),
      ]);

      return NextResponse.json(
        {
          gainers: gainers.status === 'fulfilled' ? gainers.value : [],
          losers: losers.status === 'fulfilled' ? losers.value : [],
        },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
      );
    } catch (e) {
      console.error('[fmp/movers]', e);
      return NextResponse.json({ gainers: [], losers: [] }, { status: 500 });
    }
  },
  { requireAuth: false },
);
