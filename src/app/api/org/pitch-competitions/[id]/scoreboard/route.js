import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { weightedTotal, teamAggregate } from '@/lib/competitions/scoring';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/pitch-competitions/:id/scoreboard — live aggregate for host
   managers: per-team weighted mean across judges, submit counts, and the reveal
   state. Reads through the host-managers RLS policies on the score tables. */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data: comp } = await supabase
      .from('pitch_competitions')
      .select('id, host_org_id, results_visible, status')
      .eq('id', id)
      .maybeSingle();
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canManageCompetition(member, comp)) {
      return NextResponse.json({ error: 'Host manager role required' }, { status: 403 });
    }

    const [{ data: teams }, { data: criteria }, { data: scores }, { data: summaries }] = await Promise.all([
      supabase.from('pitch_teams').select('id, team_name, ticker, side, status').eq('competition_id', comp.id),
      supabase.from('pitch_rubric_criteria').select('id, weight, max_score').eq('competition_id', comp.id),
      supabase.from('pitch_scores').select('team_id, judge_id, criterion_id, score'),
      supabase.from('pitch_score_summaries').select('team_id, judge_id, submitted'),
    ]);

    // Group scores: team -> judge -> { criterionId: score }.
    const byTeamJudge = new Map();
    for (const s of scores || []) {
      const key = `${s.team_id}`;
      if (!byTeamJudge.has(key)) byTeamJudge.set(key, new Map());
      const judges = byTeamJudge.get(key);
      if (!judges.has(s.judge_id)) judges.set(s.judge_id, {});
      judges.get(s.judge_id)[s.criterion_id] = s.score;
    }
    const submittedByTeam = new Map();
    for (const s of summaries || []) {
      if (!s.submitted) continue;
      submittedByTeam.set(s.team_id, (submittedByTeam.get(s.team_id) || 0) + 1);
    }

    const rows = (teams || []).map((t) => {
      const judges = byTeamJudge.get(`${t.id}`) || new Map();
      const perJudge = [...judges.values()].map((sc) => weightedTotal(criteria || [], sc).total);
      const { mean, count } = teamAggregate(perJudge);
      return {
        id: t.id,
        team_name: t.team_name,
        ticker: t.ticker,
        side: t.side,
        status: t.status,
        mean,
        judgeCount: count,
        submittedCount: submittedByTeam.get(t.id) || 0,
      };
    });
    rows.sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1));

    return NextResponse.json({ results_visible: comp.results_visible, status: comp.status, teams: rows });
  },
  { requireAuth: true },
);
