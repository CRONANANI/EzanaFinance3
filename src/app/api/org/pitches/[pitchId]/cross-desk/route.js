import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { roleForTier, tierRank } from '@/lib/org-hierarchy';
import { getPitchContext, fetchPitchRaw } from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DECISIONS = ['approve', 'object', 'abstain'];
const MIN_OBJECTION_REASON = 10;

/**
 * The `cross_desk_majority` gate: a pitch at `cross_desk_review` needs a
 * majority of the OTHER desks' senior PMs to approve. The pitching desk's own
 * PM cannot count. A senior PM = a member whose (tier-implied) coarse role is
 * `portfolio_manager`.
 */
function isDeskPm(member) {
  if (!member) return false;
  const coarse = (member.tier ? roleForTier(member.tier) : null) || member.role;
  return coarse === 'portfolio_manager';
}

/** Pick a desk's senior-most PM (lowest tier rank = most senior). */
function deskPmFor(members) {
  const pms = members.filter(isDeskPm);
  if (!pms.length) return null;
  return pms.sort((a, b) => tierRank(a) - tierRank(b))[0];
}

/**
 * Assemble the full cross-desk review payload for one pitch: the summary line
 * ("X of N needed · A approved · O objections"), a row per OTHER desk with that
 * desk's PM and their decision/reason, plus the viewer's eligibility + own
 * ballot. Shared verbatim by GET and by POST's response so they never drift.
 */
async function buildCrossDeskPayload(supabase, orgId, pitch, viewer) {
  const pitchTeamId = pitch.team_id || null;

  const [teamsRes, membersRes, approvalsRes] = await Promise.all([
    supabase.from('org_teams').select('id, name, slug').eq('org_id', orgId),
    supabase
      .from('org_members')
      .select('id, display_name, role, tier, team_id')
      .eq('org_id', orgId),
    supabase.from('org_cross_desk_approval').select('*').eq('pitch_id', pitch.id),
  ]);

  const teams = teamsRes.data || [];
  const members = membersRes.data || [];
  const approvals = approvalsRes.data || [];

  const memberById = new Map(members.map((m) => [m.id, m]));
  const membersByTeam = new Map();
  for (const m of members) {
    if (!m.team_id) continue;
    if (!membersByTeam.has(m.team_id)) membersByTeam.set(m.team_id, []);
    membersByTeam.get(m.team_id).push(m);
  }
  // A desk's decision = the approval row whose reviewer belongs to that desk.
  const approvalByTeam = new Map(approvals.map((a) => [a.reviewer_team_id, a]));

  const otherDesks = teams.filter((t) => t.id !== pitchTeamId);

  const desks = otherDesks.map((team) => {
    const approval = approvalByTeam.get(team.id) || null;
    const pm = approval
      ? memberById.get(approval.reviewer_member_id) || null
      : deskPmFor(membersByTeam.get(team.id) || []);
    return {
      team_id: team.id,
      team_name: team.name,
      team_slug: team.slug,
      pm_id: pm?.id || null,
      pm_name: pm?.display_name || null,
      decision: approval?.decision || null,
      reason: approval?.reason || null,
      decided_at: approval?.created_at || null,
    };
  });

  // Gate math: only decisions from desks other than the pitching desk count.
  const teamCount = teams.length;
  const needed = Math.floor((teamCount - 1) / 2) + 1;
  const scored = approvals.filter((a) => a.reviewer_team_id !== pitchTeamId);
  const approved = scored.filter((a) => a.decision === 'approve').length;
  const objections = scored.filter((a) => a.decision === 'object').length;

  const viewerMember = viewer ? memberById.get(viewer.id) : null;
  const viewerBallot = viewer ? approvals.find((a) => a.reviewer_member_id === viewer.id) : null;
  const eligible = Boolean(
    viewerMember &&
    viewerMember.team_id &&
    viewerMember.team_id !== pitchTeamId &&
    isDeskPm(viewerMember),
  );

  return {
    stage: pitch.stage,
    summary: {
      needed,
      approved,
      objections,
      teamCount,
      otherDeskCount: otherDesks.length,
      met: approved >= needed,
    },
    desks,
    viewer: {
      eligible,
      team_id: viewerMember?.team_id || null,
      is_pitching_desk: Boolean(viewerMember?.team_id && viewerMember.team_id === pitchTeamId),
      decision: viewerBallot?.decision || null,
      reason: viewerBallot?.reason || null,
    },
  };
}

// ── GET: list every OTHER desk + each desk PM's decision for this pitch ───────
export const GET = withApiGuard(
  async (request, user, context) => {
    const { supabase, viewer, member, orgId } = await getPitchContext();
    if (!orgId || !member) {
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    }
    const pitch = await fetchPitchRaw(supabase, orgId, context?.params?.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const payload = await buildCrossDeskPayload(supabase, orgId, pitch, viewer);
    return NextResponse.json(payload);
  },
  { requireAuth: true },
);

// ── POST: cast (or change) this desk PM's approve / object / abstain ──────────
export const POST = withApiGuard(
  async (request, user, context) => {
    const { supabase, viewer, member, orgId } = await getPitchContext();
    if (!orgId || !member) {
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    }
    const pitch = await fetchPitchRaw(supabase, orgId, context?.params?.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const { decision, reason } = await request.json();

    if (!DECISIONS.includes(decision)) {
      return NextResponse.json(
        { error: "decision must be 'approve', 'object', or 'abstain'" },
        { status: 400 },
      );
    }

    // ELIGIBILITY: only a senior PM of a desk OTHER than the pitching desk may
    // vote. The pitching desk's own PM can never count toward the majority.
    if (member.team_id && pitch.team_id && member.team_id === pitch.team_id) {
      return NextResponse.json(
        { error: 'The pitching desk cannot review its own pitch.' },
        { status: 403 },
      );
    }
    if (!member.team_id || !isDeskPm(member)) {
      return NextResponse.json(
        { error: 'Only another desk’s senior PM may record a cross-desk decision.' },
        { status: 403 },
      );
    }

    // An objection needs a written reason. The DB trigger enforces ≥10 chars;
    // we validate in-app too and return a clean 400 instead of a 500.
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    if (decision === 'object' && trimmedReason.length < MIN_OBJECTION_REASON) {
      return NextResponse.json(
        { error: `An objection requires a written reason (min ${MIN_OBJECTION_REASON} chars).` },
        { status: 400 },
      );
    }

    const { error } = await supabase.from('org_cross_desk_approval').upsert(
      {
        pitch_id: pitch.id,
        org_id: orgId,
        reviewer_member_id: member.id,
        reviewer_team_id: member.team_id,
        decision,
        reason: decision === 'abstain' ? null : trimmedReason || null,
      },
      { onConflict: 'pitch_id,reviewer_member_id' },
    );
    if (error) {
      // The trigger raises on a short/absent objection reason — surface as 400.
      const status = /reason/i.test(error.message) ? 400 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const payload = await buildCrossDeskPayload(supabase, orgId, pitch, viewer);
    return NextResponse.json(payload);
  },
  { requireAuth: true },
);
