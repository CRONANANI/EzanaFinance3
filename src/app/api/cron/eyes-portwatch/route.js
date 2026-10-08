import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { ingestPortWatch } from '@/lib/eyes/ingest';

/**
 * GET /api/cron/eyes-portwatch  (IMF PortWatch ports and chokepoints, daily)
 * Eyes Above ingest; see src/lib/eyes/ingest.js. Auth: CRON_SECRET as a
 * Bearer header or ?key=.
 */
export const dynamic = 'force-dynamic';
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
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const started = Date.now();
  try {
    const result = await ingestPortWatch(getAdminClient());
    revalidateTag('eyes');
    return NextResponse.json({ ok: true, result, ms: Date.now() - started });
  } catch (e) {
    console.error('[cron/eyes-portwatch]', e?.message || e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), ms: Date.now() - started },
      { status: 500 },
    );
  }
}
