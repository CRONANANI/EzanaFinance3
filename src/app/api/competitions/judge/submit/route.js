import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { resolveJudge, tokenFromRequest, judgeCanAccessTeam } from '@/lib/competitions/judge-token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* POST /api/competitions/judge/submit — lock the judge's scorecard for a team and
   save the overall comment. Re-validates room assignment. Idempotent. */
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
    const teamId = body?.team_id;
    if (!teamId) return NextResponse.json({ error: 'team_id required' }, { status: 400 });
    if (!(await judgeCanAccessTeam(admin, judge.id, teamId))) {
      return NextResponse.json({ error: 'This team is not in your room.' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { error } = await admin.from('pitch_score_summaries').upsert(
      {
        judge_id: judge.id,
        team_id: teamId,
        comment: body?.comment ? String(body.comment) : null,
        attribute_comment: !!body?.attribute_comment,
        submitted: true,
        submitted_at: now,
        updated_at: now,
      },
      { onConflict: 'judge_id,team_id' },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, submitted: true });
  },
  { requireAuth: false },
);
