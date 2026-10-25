import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { ingestFred } from '@/lib/eyes/ingest';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * GET /api/cron/eyes-fred  (FRED commercial real estate and freight series, daily)
 * Eyes Above ingest; see src/lib/eyes/ingest.js. Auth: Bearer cron secret,
 * checked by cronRoute.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run(request) {
  const started = Date.now();
  try {
    const result = await ingestFred(getAdminClient());
    revalidateTag('eyes');
    return NextResponse.json({ ok: true, result, ms: Date.now() - started });
  } catch (e) {
    console.error('[cron/eyes-fred]', e?.message || e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), ms: Date.now() - started },
      { status: 500 },
    );
  }
}

export const GET = cronRoute('eyes-fred', run, { ttlSeconds: 360 });
