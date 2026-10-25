import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { runSenateEfdIngest } from '@/lib/politicians/senate-efd';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * Senate PTRs from eFD (efdsearch.senate.gov) into senate_disclosure_filings
 * and senate_trades (lib/politicians/senate-efd.js has the flow). Hourly and
 * bounded, like parse-house-ptrs: each run lists new filings and parses up to
 * ?max electronic PTRs, so a backlog drains over a few runs. The daily
 * /api/cron/ingest-congress-trades then lands the rows in congress_trades.
 *
 * Auth: CRON_SECRET bearer only (cronRoute).
 *   GET /api/cron/ingest-senate-ptrs                      new filings, max 40
 *   GET /api/cron/ingest-senate-ptrs?since=2020-01-01     backfill the listing
 *   GET /api/cron/ingest-senate-ptrs?max=120              parse more this run
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

async function run(request) {
  const { searchParams } = new URL(request.url);
  const max = Math.min(Math.max(Number(searchParams.get('max')) || 40, 1), 150);
  const since = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('since') || '')
    ? searchParams.get('since')
    : null;
  try {
    const summary = await runSenateEfdIngest({ db: getAdminClient(), sinceIso: since, max });
    return NextResponse.json({ ok: summary.errors.length === 0, summary });
  } catch (e) {
    console.error('[ingest-senate-ptrs]', e);
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}

export const GET = cronRoute('ingest-senate-ptrs', run, { ttlSeconds: 360 });
