import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { resolveJudge, tokenFromRequest, judgeCanAccessTeam } from '@/lib/competitions/judge-token';
import { clampScore } from '@/lib/competitions/scoring';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* POST /api/competitions/judge/score — upsert one (judge, team, criterion) score.
   Autosave target. Re-validates the team is in the judge's room; clamps the score
   to the criterion's [0, max_score]; refuses once the scorecard is submitted. */
export const POST = withApiGuard(
  async (request) => {
    const admin = getAdminClient();
    const judge = await resolveJudge(admin, tokenFromRequest(request));
    if (!judge) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { team_id: teamId, criterion_id: criterionId } = body || {};
    if (!teamId || !criterionId) return NextResponse.json({ error: 'team_id and criterion_id required' }, { status: 400 });

    if (!(await judgeCanAccessTeam(admin, judge.id, teamId))) {
      return NextResponse.json({ error: 'This team is not in your room.' }, { status: 403 });
    }

    // Locked once submitted.
    const { data: summary } = await admin
      .from('pitch_score_summaries')
      .select('submitted')
      .eq('judge_id', judge.id)
      .eq('team_id', teamId)
      .maybeSingle();
    if (summary?.submitted) return NextResponse.json({ error: 'Scorecard already submitted' }, { status: 409 });

    // The criterion must belong to this judge's competition, and bounds come from
    // its own max_score — never from the client.
    const { data: criterion } = await admin
      .from('pitch_rubric_criteria')
      .select('id, max_score, competition_id')
      .eq('id', criterionId)
      .maybeSingle();
    if (!criterion || criterion.competition_id !== judge.competition_id) {
      return NextResponse.json({ error: 'Unknown criterion' }, { status: 400 });
    }

    const score = clampScore(body.score, criterion.max_score);
    if (score == null) return NextResponse.json({ error: 'score must be a number' }, { status: 400 });

    const { error } = await admin.from('pitch_scores').upsert(
      { judge_id: judge.id, team_id: teamId, criterion_id: criterionId, score, updated_at: new Date().toISOString() },
      { onConflict: 'judge_id,team_id,criterion_id' },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, score });
  },
  { requireAuth: false },
);
