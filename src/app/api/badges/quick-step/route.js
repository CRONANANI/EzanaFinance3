/**
 * GET /api/badges/quick-step  the signed-in reader's own Quick Step progress:
 * trades from their linked brokerage made within 30 days of a federal
 * contract award to the same company, and how they did 30 days later.
 * Session required; the database function reads only the caller's trades.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAuthContext } from '@/lib/supabase';
import { dbErrorResponse, exceptionResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(async (request) => {
  try {
    const { supabase } = await getAuthContext(request);
    const { data, error } = await supabase.rpc('my_quick_step_progress');
    if (error) {
      return dbErrorResponse('quick-step GET', error, {
        fallback: 'Could not load your progress.',
      });
    }
    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      ok: true,
      progress: {
        near_award_trades: row?.near_award_trades ?? 0,
        measured: row?.measured ?? 0,
        avg_ret_pct: row?.avg_ret_pct == null ? null : Number(row.avg_ret_pct),
        hit_rate: row?.hit_rate == null ? null : Number(row.hit_rate),
        earned: row?.earned === true,
      },
    });
  } catch (e) {
    return exceptionResponse('quick-step GET', e);
  }
});
