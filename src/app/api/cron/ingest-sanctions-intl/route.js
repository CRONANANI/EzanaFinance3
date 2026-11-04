import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { LISTS, syncAll } from '@/lib/sanctions-intl';

/**
 * GET /api/cron/ingest-sanctions-intl  (daily; src/lib/sanctions-intl)
 * EU (FSF XML), UK (FCDO CSV) and UN (consolidated XML) lists into
 * public.sanctions_intl_entries. Optional ?lists=eu,un for a manual run.
 * Auth: Bearer cron secret, checked by cronRoute.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

async function handler(request) {
  const started = Date.now();
  const asked = request?.nextUrl?.searchParams?.get('lists');
  const keys = asked
    ? asked
        .split(',')
        .map((s) => s.trim())
        .filter((k) => LISTS[k])
    : Object.keys(LISTS);
  const results = await syncAll(getAdminClient(), keys);
  if (results.some((r) => r.upserted || r.removed)) revalidateTag('sanctions');
  const ok = results.every((r) => r.ok);
  return NextResponse.json({ ok, results, ms: Date.now() - started }, { status: ok ? 200 : 207 });
}

export const GET = cronRoute('sanctions-intl', handler, { ttlSeconds: 360 });
