import { NextResponse } from 'next/server';
import { createServerSupabaseClient, isServerSupabaseConfigured } from '@/lib/supabase-service-role';
import { awardELO, DECAY_FLOOR } from '@/lib/elo';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const INACTIVITY_THRESHOLD_DAYS = 90;
const DECAY_PER_MONTH = -25;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const supabase = createServerSupabaseClient();
  const now = Date.now();
  const inactivityCutoff = new Date(now - INACTIVITY_THRESHOLD_DAYS * MS_PER_DAY).toISOString();
  const decayCheckCutoff = new Date(now - 30 * MS_PER_DAY).toISOString();

  const { data: candidates, error } = await supabase
    .from('user_elo')
    .select('user_id, current_rating, last_activity_at, last_decay_check, created_at')
    .gt('current_rating', DECAY_FLOOR)
    .or(`last_activity_at.is.null,last_activity_at.lte.${inactivityCutoff}`)
    .lte('last_decay_check', decayCheckCutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let decayed = 0;
  let skipped = 0;
  let totalDelta = 0;
  const errors = [];

  for (const u of candidates || []) {
    try {
      const lastActivity = u.last_activity_at ? new Date(u.last_activity_at).getTime() : null;
      const created = new Date(u.created_at).getTime();
      const referencePoint = lastActivity ?? created;
      const daysInactive = Math.floor((now - referencePoint) / MS_PER_DAY);

      if (daysInactive < INACTIVITY_THRESHOLD_DAYS) {
        skipped++;
        continue;
      }

      const proposedNewRating = u.current_rating + DECAY_PER_MONTH;
      const flooredNewRating = Math.max(DECAY_FLOOR, proposedNewRating);
      const effectiveDelta = flooredNewRating - u.current_rating;

      if (effectiveDelta === 0) {
        skipped++;
        continue;
      }

      const awardResult = await awardELO(
        u.user_id,
        effectiveDelta,
        `Inactivity decay (${daysInactive} days)`,
        'decay',
        { days_inactive: daysInactive, applied_at: new Date().toISOString() }
      );

      if (!awardResult) {
        skipped++;
        continue;
      }

      await supabase
        .from('user_elo')
        .update({ last_decay_check: new Date().toISOString() })
        .eq('user_id', u.user_id);

      decayed++;
      totalDelta += effectiveDelta;
    } catch (e) {
      errors.push({ userId: u.user_id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({
    success: true,
    candidatesScanned: candidates?.length || 0,
    decayed,
    skipped,
    totalDelta,
    errors: errors.slice(0, 10),
  });
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
