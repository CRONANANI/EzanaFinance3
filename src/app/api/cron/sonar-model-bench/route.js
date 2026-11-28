import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { workerTick } from '@/lib/sonar/engine/eval/model-bench-runner';
import { MODEL_BENCH_SUITES, MODEL_BENCH_LANES } from '@/lib/sonar/engine/eval/model-bench-active';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Sonar model benchmark worker (Nov 28 2026). Scheduled every minute in several lanes
 * (?lane=0..N-1; each lane has its own cron lock and its own shard of a suite plan).
 * Works the first suite in MODEL_BENCH_SUITES that is not complete, expired or at its
 * spend cap: freeze evidence, replay every cell, judge. Production routing is not
 * touched: each replay passes its routing explicitly.
 */
async function run(request) {
  const lane = Math.max(
    0,
    Math.min(MODEL_BENCH_LANES - 1, Number(new URL(request.url).searchParams.get('lane')) || 0),
  );
  const admin = getAdminClient();
  const skipped = [];
  for (const s of MODEL_BENCH_SUITES) {
    if (Date.now() > new Date(s.until).getTime()) {
      skipped.push({ suite: s.suite, idle: 'expired' });
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const out = await workerTick(admin, { ...s, lane, lanes: MODEL_BENCH_LANES, env: process.env });
    if (out.idle === 'suite complete' || out.idle === 'spend cap' || out.idle === 'expired') {
      skipped.push({ suite: s.suite, idle: out.idle });
      continue;
    }
    return NextResponse.json({ ok: true, lane, suite: s.suite, skipped, ...out });
  }
  return NextResponse.json({ ok: true, lane, idle: 'all suites done', skipped });
}

export const GET = cronRoute('sonar-model-bench', run, { ttlSeconds: 300 });
