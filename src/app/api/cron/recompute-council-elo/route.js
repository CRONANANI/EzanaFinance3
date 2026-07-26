import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { recomputeCouncilElo } from '@/lib/council-elo/recompute';

/**
 * Recompute council ELO from all competition results + fund ratios. Idempotent —
 * runs on a schedule and can be triggered on demand after a competition completes.
 * Auth: CRON_SECRET bearer (or ?key=).
 *   GET /api/cron/recompute-council-elo
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  try {
    const admin = getAdminClient();
    const result = await recomputeCouncilElo(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
