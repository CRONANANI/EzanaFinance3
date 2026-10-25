import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { fetchNistPages } from '@/lib/ingest/chips/nist';
import { bustIndustryCache, finishRun, startRun, upsertAndMatch } from '@/lib/ingest/chips/persist';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * Monthly: the NIST CHIPS Program Office awards page (final vs proposed).
 * Honours robots.txt (a disallow logs status 'failed', error 'robots'),
 * 2 s between pages, at most 15 pages. A page that stops parsing fails the
 * run loudly and leaves the stored awards untouched.
 *   curl -H "Authorization: Bearer <cron secret>" https://ezana.world/api/cron/chips-nist
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

async function run(request) {
  const admin = getAdminClient();
  const runId = await startRun(admin, 'chips_nist');
  try {
    const { entries, pages, robots } = await fetchNistPages();
    if (robots === 'disallowed') {
      await finishRun(admin, runId, { status: 'failed', error: 'robots' });
      return NextResponse.json({ ok: false, error: 'robots' });
    }
    const ctx = await upsertAndMatch(admin, entries);
    await finishRun(admin, runId, { status: 'ok', ...ctx });
    bustIndustryCache('semiconductors');
    return NextResponse.json({ ok: true, pages, ...ctx });
  } catch (e) {
    await finishRun(admin, runId, {
      status: 'failed',
      error: String(e?.message || e).slice(0, 500),
    });
    console.error('[cron/chips-nist] failed:', e?.message);
    return NextResponse.json({ ok: false, error: 'ingest failed' }, { status: 502 });
  }
}

export const GET = cronRoute('chips-nist', run, { ttlSeconds: 360 });
