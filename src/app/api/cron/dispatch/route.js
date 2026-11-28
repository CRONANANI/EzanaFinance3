import { NextResponse } from 'next/server';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { DISPATCH_JOBS } from '@/lib/cron/dispatch-registry';
import { dueJobs, dispatchDue, summarize, validateRegistry } from '@/lib/cron/dispatch';

/**
 * GET /api/cron/dispatch: the ingestion dispatcher (Sonar 6.4 hardening). One Vercel cron,
 * every minute; runs the jobs in dispatch-registry.js that are due this UTC minute. Each job
 * route keeps its own CRON_SECRET check, lock, run log and checkpoint. CRON_SECRET only.
 *   ?only=<job id>  dispatch one registered job now, whatever its schedule (manual run)
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function originOf(request) {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === 'production' && prod) return `https://${prod}`;
  return new URL(request.url).origin;
}

async function run(request) {
  const problems = validateRegistry(DISPATCH_JOBS);
  if (problems.length) {
    return NextResponse.json({ ok: false, error: problems.join('; ') }, { status: 500 });
  }
  const now = new Date();
  const only = new URL(request.url).searchParams.get('only');
  const jobs = only
    ? DISPATCH_JOBS.filter((j) => j.id === only)
    : dueJobs(DISPATCH_JOBS, now, process.env);
  if (only && !jobs.length) {
    return NextResponse.json({ ok: false, error: `unknown job ${only}` }, { status: 400 });
  }
  const minute = now.toISOString().slice(0, 16);
  if (!jobs.length) return NextResponse.json({ ok: true, minute, dispatched: 0 });
  const results = await dispatchDue(jobs, {
    origin: originOf(request),
    secret: process.env.CRON_SECRET,
    fetchImpl: fetch,
    ackMs: 6000,
    maxParallel: 8,
  });
  const s = summarize(results);
  return NextResponse.json({
    ok: s.errors.length === 0,
    minute,
    rowsRead: s.dispatched,
    rowsWritten: (s.completed || 0) + (s.started || 0),
    ...s,
    results,
  });
}

export const GET = cronRoute('dispatch', run, { ttlSeconds: 55 });
