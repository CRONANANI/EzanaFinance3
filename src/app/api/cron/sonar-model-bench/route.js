import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { workerTick } from '@/lib/sonar/engine/eval/model-bench-runner';
import { ACTIVE_MODEL_BENCH } from '@/lib/sonar/engine/eval/model-bench-active';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Sonar model benchmark worker (Nov 28 2026). Scheduled every minute in several lanes
 * (?lane=0..N-1; each lane has its own cron lock and its own shard of the suite plan).
 * Walks ACTIVE_MODEL_BENCH: freeze evidence, replay every cell, judge. Idles once the
 * suite is complete, expired or at its spend cap. Production routing is not touched:
 * each replay passes its routing explicitly.
 */
async function run(request) {
  const { suite, until, maxUsd, deepTrials, lanes } = ACTIVE_MODEL_BENCH;
  const lane = Math.max(
    0,
    Math.min(lanes - 1, Number(new URL(request.url).searchParams.get('lane')) || 0),
  );
  if (Date.now() > new Date(until).getTime())
    return NextResponse.json({ ok: true, skipped: 'expired' });
  const out = await workerTick(getAdminClient(), {
    suite,
    lane,
    lanes,
    until,
    maxUsd,
    deepTrials,
    env: process.env,
  });
  return NextResponse.json({ ok: true, lane, ...out });
}

export const GET = cronRoute('sonar-model-bench', run, { ttlSeconds: 300 });
