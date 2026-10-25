import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { computeResults, teamCriterionBreakdown, teamFeedback } from '@/lib/competitions/results';
import { awardCompetitionBadges } from '@/lib/competitions/badges';
import { recomputeCouncilElo } from '@/lib/council-elo/recompute';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function loadComp(supabase, id) {
  const { data } = await supabase
    .from('pitch_competitions')
    .select('id, host_org_id, results_visible, status')
    .eq('id', id)
    .maybeSingle();
  return data || null;
}

/* GET /api/org/pitch-competitions/:id/results[?team_id=] — host sees all results;
   a participant sees only their own team, and only after reveal. With ?team_id, a
   per-criterion breakdown + anonymized judge feedback. */
export const GET = withApiGuard(
  async (request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const comp = await loadComp(supabase, id);
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isHost = canManageCompetition(member, comp);
    const admin = getAdminClient();
    let teamId = null;
    try {
      teamId = new URL(request.url).searchParams.get('team_id');
    } catch {
      teamId = null;
    }

    // Determine which teams the caller may see results for.
    let visibleTeamIds = null; // null = all (host)
    if (!isHost) {
      if (!comp.results_visible)
        return NextResponse.json({ revealed: false, isHost: false, teams: [] });
      const { data: myTeams } = await supabase
        .from('pitch_teams')
        .select('id')
        .eq('competition_id', comp.id)
        .eq('org_id', member.org_id);
      visibleTeamIds = new Set((myTeams || []).map((t) => t.id));
      if (!visibleTeamIds.size)
        return NextResponse.json({ revealed: true, isHost: false, teams: [] });
    }

    // Detail for one team.
    if (teamId) {
      if (visibleTeamIds && !visibleTeamIds.has(teamId)) {
        return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
      }
      const { data: result } = await admin
        .from('pitch_results')
        .select('rank, weighted_total, judge_count')
        .eq('competition_id', comp.id)
        .eq('team_id', teamId)
        .maybeSingle();
      const [breakdown, feedback, { data: team }] = await Promise.all([
        teamCriterionBreakdown(admin, comp.id, teamId),
        teamFeedback(admin, teamId),
        admin
          .from('pitch_teams')
          .select('id, team_name, ticker, side')
          .eq('id', teamId)
          .maybeSingle(),
      ]);
      return NextResponse.json({
        isHost,
        revealed: comp.results_visible,
        team,
        result: result || null,
        breakdown,
        feedback,
      });
    }

    // Summary list.
    const { data: results } = await admin
      .from('pitch_results')
      .select('team_id, rank, weighted_total, judge_count, pitch_teams!inner(team_name, ticker)')
      .eq('competition_id', comp.id)
      .order('rank', { ascending: true, nullsFirst: false });
    const rows = (results || [])
      .filter((r) => (visibleTeamIds ? visibleTeamIds.has(r.team_id) : true))
      .map((r) => ({
        team_id: r.team_id,
        team_name: r.pitch_teams?.team_name,
        ticker: r.pitch_teams?.ticker,
        rank: r.rank,
        weighted_total: r.weighted_total,
        judge_count: r.judge_count,
      }));
    return NextResponse.json({ isHost, revealed: comp.results_visible, teams: rows });
  },
  { requireAuth: true },
);

/* POST /api/org/pitch-competitions/:id/results — host managers: recompute, publish
   (compute + reveal), or unpublish (re-hide). */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const comp = await loadComp(supabase, id);
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canManageCompetition(member, comp)) {
      return NextResponse.json({ error: 'Host manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const action = body?.action || 'compute';
    const admin = getAdminClient();

    // Every DB step is checked (ORG-16): a failure is a 500, never a silent ok.
    const setVisible = async (visible) => {
      const { data, error } = await supabase
        .from('pitch_competitions')
        .update({ results_visible: visible })
        .eq('id', comp.id)
        .select('id');
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error('Competition was not updated');
    };
    try {
      if (action === 'compute' || action === 'publish') {
        await computeResults(admin, comp.id);
      }
      if (action === 'publish') {
        // Trophies first (idempotent), then reveal: a failed badge write leaves
        // the results hidden rather than revealed without their awards.
        await awardCompetitionBadges(admin, comp.id);
        await setVisible(true);
        try {
          await recomputeCouncilElo(admin);
        } catch {
          /* ELO refresh is best-effort here; the daily cron reconciles it anyway */
        }
      }
      if (action === 'unpublish') {
        await setVisible(false);
      }
    } catch (err) {
      console.error('[pitch-competitions/results]', action, err?.message || err);
      return NextResponse.json(
        { error: `Could not ${action} results. Try again.` },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      action,
      results_visible:
        action === 'publish' ? true : action === 'unpublish' ? false : comp.results_visible,
    });
  },
  { requireAuth: true },
);
