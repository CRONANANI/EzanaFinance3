import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { recomputeCouncilElo } from '@/lib/council-elo/recompute';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * Recompute council ELO from all competition results + fund ratios. Idempotent —
 * runs on a schedule and can be triggered on demand after a competition completes.
 * Auth: CRON_SECRET bearer only (cronRoute).
 *   GET /api/cron/recompute-council-elo
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

async function run(request) {
  try {
    const admin = getAdminClient();
    const result = await recomputeCouncilElo(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export const GET = cronRoute('recompute-council-elo', run, { ttlSeconds: 360 });
