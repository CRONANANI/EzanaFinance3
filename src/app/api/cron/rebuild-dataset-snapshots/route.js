import { NextResponse } from 'next/server';
import { rebuildAll } from '@/lib/datasets/build-snapshots';
import { isCronAuthorized } from '@/lib/ingest/chips/cron-auth';

/**
 * Rebuild every dataset snapshot (or ?key=a,b), bust its tag and warm its
 * page. Scheduled every 15 minutes in vercel.json; ingests can also call it.
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://ezana.world/api/cron/rebuild-dataset-snapshots
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const keys = new URL(request.url).searchParams.get('key');
  const results = await rebuildAll(keys ? keys.split(',') : undefined);
  return NextResponse.json({ ok: !results.some((r) => r.error), results });
}
