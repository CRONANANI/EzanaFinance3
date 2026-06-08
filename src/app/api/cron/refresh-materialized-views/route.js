import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Vercel cron sends `Authorization: Bearer <CRON_SECRET>`; require it so the
// refresh can't be triggered anonymously.
function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') ?? '') === `Bearer ${secret}`;
}

// Refresh helpers for precomputed read models. Add new RPCs here as more
// aggregations are materialized (each defined as a SECURITY DEFINER function).
const REFRESH_RPCS = ['refresh_leaderboard_mat'];

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

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
