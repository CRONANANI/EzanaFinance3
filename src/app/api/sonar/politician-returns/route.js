import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { cacheGet, cacheSet } from '@/lib/cache';
import { getDailyBars } from '@/lib/prices/daily-bars';
import { getPoliticianReturns } from '@/lib/sonar/politician-returns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/sonar/politician-returns?bioguide=P000197&months=12   (months=0: all time)
 *
 * The best returns on the listed assets one member of Congress disclosed buying in the
 * period, for the portfolio card of Sonar's congressional profile (Nov 21 2026). Public like
 * the Sonar answers it serves (guests read them too), rate limited by the guard, cached six
 * hours per member and period. Price only, from disclosed purchase dates to the latest close.
 *
 * 200 { from, rows: [{ ticker, name, pct, entry, last, lastDate, since, buys, amount }],
 *       priced, considered }
 */
export const GET = withApiGuard(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const bioguide = String(searchParams.get('bioguide') || '')
      .trim()
      .toUpperCase()
      .slice(0, 12);
    const months = Number(searchParams.get('months') || 0);
    if (!/^[A-Z]\d{6}$/.test(bioguide)) {
      return NextResponse.json({ error: 'Unknown member.' }, { status: 400 });
    }
    const body = await getPoliticianReturns(bioguide, months, {
      admin: getAdminClient(),
      getDailyBars,
      cache: { get: (k) => cacheGet(k), set: (k, v, ttl) => cacheSet(k, v, ttl) },
    });
    return NextResponse.json(body, {
      headers: {
        'Cache-Control': body.rows.length
          ? 'public, s-maxage=3600, stale-while-revalidate=21600'
          : 'no-store',
      },
    });
  },
  { requireAuth: false },
);
