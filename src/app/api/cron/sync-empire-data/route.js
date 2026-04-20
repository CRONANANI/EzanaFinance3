/**
 * @fileoverview
 * Scheduled entry point that runs the Empire Rankings multi-source sync.
 * Invoked weekly by Vercel Cron (see `vercel.json`) at 06:00 UTC on Monday
 * — economic indicators update monthly-to-annually, so daily polling would
 * waste API budget without changing results.
 *
 * Auth: requires `Authorization: Bearer $CRON_SECRET`. The same header is
 * used for ad-hoc backfill via curl.
 *
 * Backfill example:
 *     curl -H "Authorization: Bearer $CRON_SECRET" \
 *          https://<host>/api/cron/sync-empire-data?yearStart=2000
 */

import { NextResponse } from 'next/server';
import { syncAllSources } from '@/lib/empire/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — WB fetch for 60 countries × 25 metrics

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

function parseYear(value) {
  if (value == null) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const yearStart = parseYear(sp.get('yearStart'));
  const yearEnd = parseYear(sp.get('yearEnd'));

  try {
    const result = await syncAllSources({ yearStart, yearEnd });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/sync-empire-data] failed:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
