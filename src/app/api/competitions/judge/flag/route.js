import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { resolveJudge, tokenFromRequest, judgeCanAccessTeam } from '@/lib/competitions/judge-token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* POST /api/competitions/judge/flag — a judge flags (or unflags) a competitor they'd
   want to talk to, with a note. The flag is PRIVATE to the judge; it is shared with
   the judge's firm only if the student later consented to 'sponsoring_firms' (checked
   at query time by the recruiting helper). Token-gated + scoped to the judge's rooms.
   { action?: 'flag'|'unflag', team_member_id, note? }. */
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
    const memberId = body?.team_member_id;
    if (!memberId) return NextResponse.json({ error: 'team_member_id required' }, { status: 400 });

    // Resolve the member's team and re-validate it's in one of the judge's rooms.
    const { data: tm } = await admin.from('pitch_team_members').select('id, team_id').eq('id', memberId).maybeSingle();
    if (!tm) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!(await judgeCanAccessTeam(admin, judge.id, tm.team_id))) {
      return NextResponse.json({ error: 'That competitor is not in your room.' }, { status: 403 });
    }

    if (body.action === 'unflag') {
      await admin.from('pitch_talent_flags').delete().eq('judge_id', judge.id).eq('pitch_team_member_id', memberId);
      return NextResponse.json({ ok: true, flagged: false });
    }

    const { error } = await admin.from('pitch_talent_flags').upsert(
      { judge_id: judge.id, pitch_team_member_id: memberId, note: body?.note ? String(body.note) : null },
      { onConflict: 'judge_id,pitch_team_member_id' },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, flagged: true });
  },
  { requireAuth: false },
);
