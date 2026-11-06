import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { ADAPTERS, runDue } from '@/lib/macro-sync';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { withTimeout } from '@/lib/with-timeout';

/**
 * GET /api/cron/macro-sync  (hourly; src/lib/macro-sync/rotate.js)
 * Runs every due macro adapter except the four with their own routes, into
 * public.macro_series_values for Sonar. Optional ?only=imf,ecb&force=1 for a manual run
 * (which also ignores the server-error backoff). After a run that wrote rows it refreshes
 * macro_series_latest, the one-row-per-series summary Sonar reads (about 10 s).
 * Auth: Bearer cron secret, checked by cronRoute.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/* Refresh the summary Sonar reads. Bounded at 60 s; a failure is logged, never fatal. */
async function refreshLatest(admin) {
  const r = await withTimeout(admin.rpc('refresh_macro_series_latest'), 60000, 'macro-latest');
  const error = r.ok ? r.value?.error : r.error || (r.timedOut ? { message: 'timed out' } : null);
  if (!error) return 'ok';
  console.warn('[cron/macro-sync] refresh_macro_series_latest:', error.message || error);
  return `failed: ${error.message || error}`;
}

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
    const admin = getAdminClient();
    const results = await runDue(admin, ADAPTERS, { budgetMs: 200000, only, force });
    const wrote = results.filter((r) => r.rowsWritten);
    for (const r of wrote) revalidateTag(`macro-${r.source}`);
    if (wrote.length) revalidateTag('macro-series');
    const latest = wrote.length ? await refreshLatest(admin) : 'skipped (no rows written)';
    const errors = results.flatMap((r) => (r.errors || []).map((e) => `${r.source}: ${e}`));
    return NextResponse.json({
      ok: errors.length === 0,
      ran: results.filter((r) => !r.skipped).map((r) => r.source),
      rowsWritten: wrote.reduce((n, r) => n + r.rowsWritten, 0),
      duplicatesDropped: results.reduce((n, r) => n + (r.duplicatesDropped || 0), 0),
      latestRefresh: latest,
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
