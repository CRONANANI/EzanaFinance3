import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Refresh helpers for precomputed read models. Add new RPCs here as more
// aggregations are materialized (each defined as a SECURITY DEFINER function).
const REFRESH_RPCS = ['refresh_leaderboard_mat'];

async function run(request) {
  const admin = getAdminClient();
  const results = {};
  for (const fn of REFRESH_RPCS) {
    try {
      const { error } = await admin.rpc(fn);
      results[fn] = error ? `error: ${error.message}` : 'ok';
    } catch (err) {
      results[fn] = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const ok = Object.values(results).every((r) => r === 'ok');
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500 });
}

export const GET = cronRoute('refresh-materialized-views', run, { ttlSeconds: 360 });
