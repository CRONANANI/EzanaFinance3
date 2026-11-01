import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getCommoditySeries } from '@/lib/sonar/commodity-series';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/sonar/commodity-series?c=oil&from=2026-02-28
 *
 * The daily price series behind a commodity figure in a Sonar brief (Nov 1):
 * clicking "oil 40 to 55%" charts crude oil from the brief's own start date.
 * Public like the landing Sonar it serves (guests read briefs too), rate
 * limited by the guard, cached at the edge for 30 minutes.
 *
 * 200 { id, label, symbol, proxy, from, to, points: [{ d, v }], first, last,
 *       changePct }   points is [] when no feed had the series
 * 400 for an unknown commodity id.
 */
export const GET = withApiGuard(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('c') || '').slice(0, 32);
    const from = String(searchParams.get('from') || '').slice(0, 10);
    const series = await getCommoditySeries(id, from);
    if (!series) {
      return NextResponse.json({ error: 'Unknown commodity.' }, { status: 400 });
    }
    const { feed, ...body } = series;
    if (!body.points.length) console.warn('[sonar/commodity-series] no series', { id, from });
    else console.log('[sonar/commodity-series]', { id, feed, points: body.points.length });
    return NextResponse.json(body, {
      headers: {
        'Cache-Control': body.points.length
          ? 'public, s-maxage=1800, stale-while-revalidate=3600'
          : 'no-store',
      },
    });
  },
  { requireAuth: false },
);
