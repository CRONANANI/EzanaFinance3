/**
 * @fileoverview
 * Daily rebuild of public.user_activity_stats, the distribution the home
 * activity card and the profile Activity section read their percentiles
 * from. Invoked by Vercel Cron (see `vercel.json`).
 *
 * Auth and single-flight come from cronRoute (Bearer $CRON_SECRET + lock).
 *
 * Manual backfill:
 *     curl -H "Authorization: Bearer $CRON_SECRET" \
 *          https://<host>/api/cron/activity-percentiles
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { refreshActivityStats } from '@/lib/activity-summary';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run() {
  try {
    const members = await refreshActivityStats(getAdminClient());
    return NextResponse.json({ ok: true, members });
  } catch (err) {
    console.error('[cron/activity-percentiles] refresh failed:', err?.message || err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = cronRoute('activity-percentiles', run, { ttlSeconds: 360 });
export const POST = cronRoute('activity-percentiles', run, { ttlSeconds: 360 });
