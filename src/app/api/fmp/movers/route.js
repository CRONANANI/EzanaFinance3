import { NextResponse } from 'next/server';
import { getBiggestGainers, getBiggestLosers } from '@/lib/fmp/movers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/fmp/movers?limit=3
 *
 * Returns { gainers: [...], losers: [...] } with up to N each from FMP.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(10, Math.max(1, Number(searchParams.get('limit') || 3)));

    const [gainers, losers] = await Promise.allSettled([
      getBiggestGainers(limit),
      getBiggestLosers(limit),
    ]);

    return NextResponse.json(
      {
        gainers: gainers.status === 'fulfilled' ? gainers.value : [],
        losers: losers.status === 'fulfilled' ? losers.value : [],
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (e) {
    console.error('[fmp/movers]', e);
    return NextResponse.json({ gainers: [], losers: [] }, { status: 500 });
  }
}
