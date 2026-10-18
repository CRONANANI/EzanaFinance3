/**
 * GET /api/prediction-markets/trending?venue=all|polymarket|kalshi&limit=12&category=Politics
 *
 * Trending open prediction markets, scored by the index crons every two hours.
 * Public (no auth), rate limited by withApiGuard, CDN-cached for five minutes.
 * Response: { venue, markets: [...], updatedAt, stale }. An empty list with
 * stale=true means the feed is behind; the UI should say so, not show old odds.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getTrendingMarkets } from '@/lib/prediction-markets/trending-store';

export const dynamic = 'force-dynamic';

const VENUES = new Set(['all', 'polymarket', 'kalshi']);
const CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=120';

export const GET = withApiGuard(
  async (request) => {
    const sp = new URL(request.url).searchParams;
    const venueParam = String(sp.get('venue') || 'all').toLowerCase();
    const venue = VENUES.has(venueParam) ? venueParam : 'all';
    const limit = Math.min(Math.max(Number(sp.get('limit')) || 12, 1), 50);
    const category = sp.get('category');
    const out = await getTrendingMarkets({ venue, limit, category });
    return NextResponse.json(out, { headers: { 'Cache-Control': CACHE } });
  },
  { requireAuth: false },
);
