import { NextResponse } from 'next/server';
import { rebuildAll } from '@/lib/datasets/build-snapshots';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * Rebuild every dataset snapshot (or ?key=a,b), bust its tag and warm its
 * page. Scheduled hourly (:37) in vercel.json; ingests can also call it. Rebuilds the
 * stalest rows first within a 240 s budget; the rest wait for the next run.
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://ezana.world/api/cron/rebuild-dataset-snapshots
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

async function run(request) {
  const keys = new URL(request.url).searchParams.get('key');
  const results = await rebuildAll(keys ? keys.split(',') : undefined);
  return NextResponse.json({ ok: !results.some((r) => r.error), results });
}

export const GET = cronRoute('rebuild-dataset-snapshots', run, { ttlSeconds: 360 });
