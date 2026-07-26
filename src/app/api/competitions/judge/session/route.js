import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { resolveJudge, tokenFromRequest, judgeRoomIds } from '@/lib/competitions/judge-token';
import { weightedTotal } from '@/lib/competitions/scoring';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/competitions/judge/session?token=… — the judge's competition, their
   assigned rooms (with times), and ONLY the teams in those rooms, each with the
   judge's own progress. Token is the sole credential; everything is scoped to it.
   Rate-limited via withApiGuard (per IP); auth is the token, not a session. */
export const GET = withApiGuard(
  async (request) => {
    const admin = getAdminClient();
    const judge = await resolveJudge(admin, tokenFromRequest(request));
    if (!judge) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 });

    // Touch last_seen_at so an abused token is visible to the host.
    await admin.from('pitch_judges').update({ last_seen_at: new Date().toISOString() }).eq('id', judge.id);

    const { data: competition } = await admin
      .from('pitch_competitions')
      .select('id, name, theme, status')
      .eq('id', judge.competition_id)
      .maybeSingle();

    const roomIds = await judgeRoomIds(admin, judge.id);
    if (!roomIds.length) {
      return NextResponse.json({ judge: pubJudge(judge), competition, rooms: [], teams: [] });
    }

    const [{ data: rooms }, { data: teams }, { data: criteria }] = await Promise.all([
      admin
        .from('pitch_rooms')
        .select('id, round_id, name, location, starts_at, ends_at, pitch_rounds!inner(name, sort_order)')
        .in('id', roomIds),
      admin
        .from('pitch_teams')
        .select('id, team_name, ticker, side, room_id')
        .in('room_id', roomIds)
        .order('team_name', { ascending: true }),
      admin
        .from('pitch_rubric_criteria')
        .select('id, weight, max_score')
        .eq('competition_id', judge.competition_id),
    ]);

    // The judge's own scores + submit state, to show per-team progress.
    const teamIds = (teams || []).map((t) => t.id);
    const [{ data: scores }, { data: summaries }] = await Promise.all([
      teamIds.length
        ? admin.from('pitch_scores').select('team_id, criterion_id, score').eq('judge_id', judge.id).in('team_id', teamIds)
        : Promise.resolve({ data: [] }),
      teamIds.length
        ? admin.from('pitch_score_summaries').select('team_id, submitted').eq('judge_id', judge.id).in('team_id', teamIds)
        : Promise.resolve({ data: [] }),
    ]);

    const scoresByTeam = new Map();
    for (const s of scores || []) {
      if (!scoresByTeam.has(s.team_id)) scoresByTeam.set(s.team_id, {});
      scoresByTeam.get(s.team_id)[s.criterion_id] = s.score;
    }
    const submittedSet = new Set((summaries || []).filter((s) => s.submitted).map((s) => s.team_id));

    const teamsOut = (teams || []).map((t) => {
      const my = scoresByTeam.get(t.id) || {};
      const { total } = weightedTotal(criteria || [], my);
      const status = submittedSet.has(t.id) ? 'submitted' : Object.keys(my).length ? 'in_progress' : 'not_started';
      return { ...t, myTotal: total, status };
    });

    return NextResponse.json({ judge: pubJudge(judge), competition, rooms: rooms || [], teams: teamsOut });
  },
  { requireAuth: false },
);

function pubJudge(j) {
  return { id: j.id, full_name: j.full_name, firm: j.firm, title: j.title };
}
