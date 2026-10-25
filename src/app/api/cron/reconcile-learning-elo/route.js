/**
 * Nightly: credit learning ELO for passed courses that missed it (the
 * award failed, or the course predates the award). Replaces the reconcile
 * that used to run on every GET of /api/elo/*. Each award is keyed
 * learning:<course_id>, so re-runs never double-credit.
 *
 * Scope: users with a course passed in the last 8 days (the nightly window
 * plus slack), at most 2,000 users per run, 5 at a time.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { reconcileLearningElo } from '@/lib/elo';
import { cronRoute } from '@/lib/cron/with-cron-lock';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run() {
  const admin = getAdminClient();
  const since = new Date(Date.now() - 8 * 86_400_000).toISOString();
  const { data, error } = await admin
    .from('user_course_progress')
    .select('user_id')
    .eq('quiz_passed', true)
    .gte('completed_at', since)
    .limit(20_000);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const users = [...new Set((data || []).map((r) => r.user_id))].slice(0, 2000);
  let credited = 0;
  const errors = [];
  for (let i = 0; i < users.length; i += 5) {
    // eslint-disable-next-line no-await-in-loop
    const res = await Promise.allSettled(users.slice(i, i + 5).map((u) => reconcileLearningElo(u)));
    for (const r of res) {
      if (r.status === 'fulfilled') credited += r.value.credited;
      else errors.push(String(r.reason?.message || r.reason));
    }
  }
  return NextResponse.json({
    ok: errors.length === 0,
    users: users.length,
    credited,
    errors: errors.slice(0, 5),
  });
}

export const GET = cronRoute('reconcile-learning-elo', run, { ttlSeconds: 600 });
