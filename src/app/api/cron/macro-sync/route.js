import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { ADAPTERS, runDue } from '@/lib/macro-sync';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * GET /api/cron/macro-sync  (hourly; src/lib/macro-sync/rotate.js)
 * Runs every due macro adapter except the four with their own routes, into
 * public.macro_series_values for Sonar. Optional ?only=imf,ecb&force=1 for a manual run.
 * Auth: Bearer cron secret, checked by cronRoute.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

async function run(request) {
  const started = Date.now();
  const params = request?.nextUrl?.searchParams;
  const only = params?.get('only')
    ? params
        .get('only')
        .split(',')
        .map((s) => s.trim())
    : null;
  const force = params?.get('force') === '1';
  try {
    const results = await runDue(getAdminClient(), ADAPTERS, { budgetMs: 250000, only, force });
    const wrote = results.filter((r) => r.rowsWritten);
    for (const r of wrote) revalidateTag(`macro-${r.source}`);
    if (wrote.length) revalidateTag('macro-series');
    const errors = results.flatMap((r) => (r.errors || []).map((e) => `${r.source}: ${e}`));
    return NextResponse.json({
      ok: errors.length === 0,
      ran: results.filter((r) => !r.skipped).map((r) => r.source),
      rowsWritten: wrote.reduce((n, r) => n + r.rowsWritten, 0),
      results,
      errors: errors.slice(0, 20),
      ms: Date.now() - started,
    });
  } catch (e) {
    console.error('[cron/macro-sync]', e?.message || e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), ms: Date.now() - started },
      { status: 500 },
    );
  }
}

export const GET = cronRoute('macro-sync', run, { ttlSeconds: 330 });
