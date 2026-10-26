import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { ingestPortWatch } from '@/lib/eyes/ingest';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * GET /api/cron/eyes-portwatch  (IMF PortWatch ports and chokepoints, daily)
 * Eyes Above ingest; see src/lib/eyes/ingest.js. Auth: Bearer cron secret,
 * checked by cronRoute.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run(request) {
  const started = Date.now();
  try {
    /* Leave a minute of the 300s budget for the last write and the response;
       each step checkpoints, so the next run picks up where this one stops. */
    const result = await ingestPortWatch(getAdminClient(), { budgetMs: 230000 });
    revalidateTag('eyes');
    revalidateTag('api-v1-eyes');
    return NextResponse.json({ ok: true, result, ms: Date.now() - started });
  } catch (e) {
    console.error('[cron/eyes-portwatch]', e?.message || e);
    /* A partial run still wrote rows (chokepoints or ports). */
    if (e?.result) {
      revalidateTag('eyes');
      revalidateTag('api-v1-eyes');
    }
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), result: e?.result, ms: Date.now() - started },
      { status: 500 },
    );
  }
}

export const GET = cronRoute('eyes-portwatch', run, { ttlSeconds: 360 });
