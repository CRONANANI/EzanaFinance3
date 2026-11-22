import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { PERIODS } from '@/lib/politicians/tracker-model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/politicians/realized-returns?period=1y
 *
 * The Politician Tracker's "Realized return" column (Nov 21 2026): per member, for one Tracker
 * period, the midpoint-weighted realized return of the purchases made in the period that the
 * member has since sold, close to close (src/lib/politicians/realized-returns.js). Built by
 * the hourly job; public, rate limited, cached at the edge for 15 minutes.
 *
 * 200 { period, computedAt, members: { [bioguide]: { pct, trades, wins } } }
 *     members is {} until the job has run (or the table is not there yet).
 */
export const GET = withApiGuard(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const raw = String(searchParams.get('period') || '1y');
    const period = PERIODS.some((p) => p.value === raw) ? raw : '1y';
    const admin = getAdminClient();
    const members = {};
    let computedAt = null;
    if (admin) {
      for (let from = 0; from < 10000; from += 1000) {
        const { data, error } = await admin
          .from('politician_realized_returns')
          .select('bioguide_id, pct, trades, wins, computed_at')
          .eq('period', period)
          .order('bioguide_id', { ascending: true })
          .range(from, from + 999);
        if (error || !data) break;
        for (const r of data) {
          members[r.bioguide_id] = {
            pct: r.pct == null ? null : Number(r.pct),
            trades: r.trades,
            wins: r.wins,
          };
          if (!computedAt || r.computed_at > computedAt) computedAt = r.computed_at;
        }
        if (data.length < 1000) break;
      }
    }
    const has = Object.keys(members).length > 0;
    return NextResponse.json(
      { period, computedAt, members },
      {
        headers: {
          'Cache-Control': has ? 'public, s-maxage=900, stale-while-revalidate=3600' : 'no-store',
        },
      },
    );
  },
  { requireAuth: false },
);
