/**
 * GET /api/prediction-markets/leaderboard
 *   ?venue=polymarket&window=day|week|month|all&by=pnl|vol&category=<page slug>
 *   ?venue=kalshi&by=pnl|vol
 *
 * Top 10 traders as each venue publishes them. Polymarket maps the page
 * category onto its leaderboard categories and falls back to the overall
 * board when none maps. Kalshi publishes a 30-day board of opted-in traders;
 * its values are returned raw because their unit is not documented.
 * Public, CDN-cached for ten minutes.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { LEADERBOARD_CATEGORY } from '@/lib/prediction-markets/page-model';
import {
  PM_WINDOWS,
  kalshiLeaderboard,
  polymarketLeaderboard,
} from '@/lib/prediction-markets/providers';

export const dynamic = 'force-dynamic';

const CACHE = 'public, max-age=120, s-maxage=600, stale-while-revalidate=1200';

export const GET = withApiGuard(
  async (request) => {
    const sp = new URL(request.url).searchParams;
    const venue = sp.get('venue') === 'kalshi' ? 'kalshi' : 'polymarket';
    const by = sp.get('by') === 'vol' ? 'vol' : 'pnl';

    if (venue === 'kalshi') {
      const rows = await kalshiLeaderboard({ by });
      if (rows == null) {
        return NextResponse.json(
          { error: 'Leaderboard unavailable' },
          { status: 502, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      return NextResponse.json(
        { venue, by, window: '30d', category: null, rows },
        { headers: { 'Cache-Control': CACHE } },
      );
    }

    const window = PM_WINDOWS[sp.get('window')] ? sp.get('window') : 'week';
    const category = LEADERBOARD_CATEGORY[sp.get('category')] || null;
    const rows = await polymarketLeaderboard({ window, by, category });
    if (rows == null) {
      return NextResponse.json(
        { error: 'Leaderboard unavailable' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json(
      { venue, by, window, category, rows },
      { headers: { 'Cache-Control': CACHE } },
    );
  },
  { requireAuth: false },
);
