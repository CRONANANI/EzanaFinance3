/**
 * @fileoverview
 * Scheduled entry point that runs the platform-aggregates recomputation
 * job. Invoked daily by Vercel Cron (see `vercel.json`) at 06:00 UTC.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. We reject
 * any request missing that header to keep the endpoint from being hit
 * accidentally from a browser.
 *
 * Dev note: you can also trigger this locally to backfill without
 * waiting 24 hours:
 *     curl -H "Authorization: Bearer $CRON_SECRET" \
 *          https://<host>/api/cron/platform-aggregates
 */

import { NextResponse } from 'next/server';
import { recomputeAggregates } from '@/lib/platform-aggregates/compute';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — aggregation can scan YTD for every user

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await recomputeAggregates();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/platform-aggregates] recompute failed:', err);
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
