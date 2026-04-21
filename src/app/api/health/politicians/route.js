/**
 * Quick pipeline health for congressional / politician performance data.
 * Safe to call without auth (read-only counts + last computed timestamp).
 * Use for ops: “is the backfill done?” and “is FMP / cron wired?”
 *
 * Does not expose the FMP key or raw trade rows.
 */

import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json(
      {
        status: 'misconfigured',
        error: 'Supabase service not configured on server',
        code: 'MISSING_SUPABASE_CONFIG',
        congressional_trades_count: null,
        politician_annual_performance_count: null,
        last_computed_at: null,
        fmp_key_configured: !!process.env.FMP_API_KEY,
        cron_secret_configured: !!process.env.CRON_SECRET,
      },
      { status: 503 }
    );
  }

  const supabase = createServerSupabaseClient();

  try {
    const [
      { count: tradesCount, error: tradesErr },
      { count: perfCount, error: perfErr },
      { data: latestRow, error: latestErr },
    ] = await Promise.all([
      supabase
        .from('congressional_trades')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('politician_annual_performance')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('politician_annual_performance')
        .select('computed_at')
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (tradesErr || perfErr) {
      const err = tradesErr || perfErr;
      console.error('[health/politicians] DB error:', err);
      return NextResponse.json(
        {
          status: 'error',
          error: err.message,
          code: err.code,
        },
        { status: 500 }
      );
    }
    if (latestErr) {
      console.error('[health/politicians] latest row error:', latestErr);
    }

    const tc = tradesCount ?? 0;
    const pc = perfCount ?? 0;
    const healthy = tc > 0 && pc > 0;

    return NextResponse.json({
      status: healthy ? 'healthy' : 'missing_data',
      congressional_trades_count: tc,
      politician_annual_performance_count: pc,
      last_computed_at: latestRow?.computed_at ?? null,
      fmp_key_configured: !!process.env.FMP_API_KEY,
      cron_secret_configured: !!process.env.CRON_SECRET,
    });
  } catch (e) {
    console.error('[health/politicians] unexpected:', e);
    return NextResponse.json(
      {
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
