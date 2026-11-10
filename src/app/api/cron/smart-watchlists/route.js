/**
 * @fileoverview
 * Hourly run of every enabled smart watchlist that is due (see
 * src/lib/watchlist/smart-engine.js). Invoked by Vercel Cron (`vercel.json`).
 * Auth and single-flight come from cronRoute (Bearer $CRON_SECRET + lock).
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { runDueRules } from '@/lib/watchlist/smart-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run() {
  try {
    const result = await runDueRules(getAdminClient());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/smart-watchlists] failed:', err?.message || err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = cronRoute('smart-watchlists', run, { ttlSeconds: 330 });
export const POST = cronRoute('smart-watchlists', run, { ttlSeconds: 330 });
