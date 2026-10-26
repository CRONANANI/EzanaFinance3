import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { ingestPatents } from '@/lib/eyes/ingest';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * GET /api/cron/eyes-patents  (USPTO PatentSearch grants, weekly)
 * Eyes Above ingest; see src/lib/eyes/ingest.js. Auth: Bearer cron secret,
 * checked by cronRoute.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run(request) {
  const started = Date.now();
  try {
    const result = await ingestPatents(getAdminClient());
    revalidateTag('eyes');
    revalidateTag('api-v1-eyes');
    return NextResponse.json({ ok: true, result, ms: Date.now() - started });
  } catch (e) {
    console.error('[cron/eyes-patents]', e?.message || e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), ms: Date.now() - started },
      { status: 500 },
    );
  }
}

export const GET = cronRoute('eyes-patents', run, { ttlSeconds: 360 });
