import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { isCronAuthorized } from '@/lib/ingest/chips/cron-auth';
import { fetchAllChipsAwards, toAwardRow } from '@/lib/ingest/chips/usaspending';
import { bustIndustryCache, finishRun, startRun, upsertAndMatch } from '@/lib/ingest/chips/persist';

/**
 * Weekly: CHIPS Incentives awards (Assistance Listing 11.037) from
 * USAspending into public.chips_awards, matched to the industry registry.
 * Unmatched recipients and facilities wait in industry_review_queue;
 * nothing unreviewed reaches Sonar. Logged in public.ingest_runs.
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://ezana.world/api/cron/chips-usaspending
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = getAdminClient();
  const runId = await startRun(admin, 'chips_usaspending');
  try {
    const rows = (await fetchAllChipsAwards())
      .map(toAwardRow)
      .filter((r) => r.source_record_id && r.recipient_name);
    const ctx = await upsertAndMatch(admin, rows);
    await finishRun(admin, runId, { status: 'ok', ...ctx });
    bustIndustryCache('semiconductors');
    return NextResponse.json({ ok: true, ...ctx });
  } catch (e) {
    await finishRun(admin, runId, {
      status: 'failed',
      error: String(e?.message || e).slice(0, 500),
    });
    console.error('[cron/chips-usaspending] failed:', e?.message);
    return NextResponse.json({ ok: false, error: 'ingest failed' }, { status: 502 });
  }
}
