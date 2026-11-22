/**
 * Hourly: prices realized congressional trades not priced yet and rebuilds the realized
 * return per member for every Politician Tracker period (Nov 21 2026). Incremental, so the
 * first runs work through the backlog. Requires `Authorization: Bearer $CRON_SECRET`.
 * See src/lib/politicians/realized-returns-job.js.
 */
import { NextResponse } from 'next/server';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { runRealizedReturnsJob } from '@/lib/politicians/realized-returns-job';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const GET = cronRoute(
  'politician-realized-returns',
  async () => {
    try {
      const result = await runRealizedReturnsJob();
      console.log('[cron/politician-realized-returns]', result);
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      console.error('[cron/politician-realized-returns] failed', err);
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
  },
  { ttlSeconds: 330 },
);
