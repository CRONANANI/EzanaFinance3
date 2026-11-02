import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { syncKidb } from '@/lib/adb/kidb';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * GET /api/cron/adb-kidb  (ADB Key Indicators, daily check, weekly refresh)
 * ADB allows 20 requests/minute; src/lib/adb/kidb.js paces at 18/minute and checkpoints,
 * so a backfill spreads over several runs. Skips until ADB_KIDB_API_BASE and the work list
 * are configured. Auth: Bearer cron secret, checked by cronRoute.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run() {
  const started = Date.now();
  try {
    const result = await syncKidb(getAdminClient(), { budgetMs: 240000 });
    if (result.rowsWritten) revalidateTag('adb-kidb');
    return NextResponse.json({ ok: !result.errors?.length, ...result, ms: Date.now() - started });
  } catch (e) {
    console.error('[cron/adb-kidb]', e?.message || e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), ms: Date.now() - started },
      { status: 500 },
    );
  }
}

export const GET = cronRoute('adb-kidb', run, { ttlSeconds: 330 });
