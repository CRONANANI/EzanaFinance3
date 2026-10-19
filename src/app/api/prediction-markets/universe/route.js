/**
 * GET /api/prediction-markets/universe
 *
 * Every open, fresh market for /datasets/prediction-markets, compact and
 * columnar: { cols, rows, updatedAt, windows, stale }. The page filters and
 * ranks client-side (page-model.js), so one cached call drives Pulse, Movers,
 * the Category Map, Closing Soon, Conviction and the table.
 * Public, rate limited by withApiGuard, CDN-cached for two minutes.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUniverse } from '@/lib/prediction-markets/page-store';

export const dynamic = 'force-dynamic';

const CACHE = 'public, max-age=60, s-maxage=120, stale-while-revalidate=300';

export const GET = withApiGuard(
  async () => {
    const out = await getUniverse(new Date());
    const status = out.error ? 503 : 200;
    return NextResponse.json(out, {
      status,
      headers: { 'Cache-Control': out.error ? 'no-store' : CACHE },
    });
  },
  { requireAuth: false },
);
