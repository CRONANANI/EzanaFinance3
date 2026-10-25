import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { scoreCompetition } from '@/app/api/admin/competitions/route';
import { cronRoute } from '@/lib/cron/with-cron-lock';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run(request) {
  let supabase;
  try {
    supabase = getAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  const now = new Date().toISOString();

  const { data: activated } = await supabase
    .from('competitions')
    .update({ status: 'active' })
    .eq('status', 'upcoming')
    .lte('starts_at', now)
    .select('id, name');

  const { data: toScore } = await supabase
    .from('competitions')
    .select('*')
    .in('status', ['active', 'ended', 'score_failed'])
    .lte('ends_at', now);

  let scoredCount = 0;
  const scoringErrors = [];

  for (const comp of toScore || []) {
    try {
      /* scoreCompetition claims the row itself (active/ended -> scoring);
         a run that loses the claim to another skips. */
      const res = await scoreCompetition(supabase, comp);
      if (!res.skipped) scoredCount++;
    } catch (e) {
      scoringErrors.push({
        competitionId: comp.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    success: true,
    activated: (activated || []).length,
    scored: scoredCount,
    errors: scoringErrors.slice(0, 5),
  });
}

export const GET = cronRoute('competition-scorer', run, { ttlSeconds: 360 });
export const POST = GET;
