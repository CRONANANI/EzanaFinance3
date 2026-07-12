import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { hasPitchPermission } from '@/lib/org-pitches';
import {
  getPitchContext,
  fetchPitchRaw,
  fetchPitchDetail,
  castVoteDb,
  icEligibleVoters,
  computeQuorum,
} from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ votes: [] });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const { data: members } = await supabase
      .from('org_members')
      .select('id, display_name, role')
      .eq('org_id', orgId);
    const nameMap = new Map((members || []).map((m) => [m.id, m]));

    const { data: rawVotes } = await supabase
      .from('org_pitch_votes')
      .select('*')
      .eq('pitch_id', pitch.id)
      .order('created_at');

    // Blind ballot: if a blind IC meeting is attached and voting is still open,
    // hide individual choices/rationale until the vote closes.
    let blind = false;
    if (pitch.ic_meeting_id && pitch.stage === 'committee_vote') {
      const { data: mtg } = await supabase
        .from('org_ic_meetings')
        .select('ballot_type, status')
        .eq('id', pitch.ic_meeting_id)
        .maybeSingle();
      blind = mtg?.ballot_type === 'blind' && mtg?.status !== 'closed';
    }

    const votes = (rawVotes || []).map((v) => ({
      id: v.id,
      voter_name: nameMap.get(v.voter_member_id)?.display_name || 'Member',
      voter_role: nameMap.get(v.voter_member_id)?.role || null,
      recused: v.recused,
      created_at: v.created_at,
      vote: blind ? null : v.vote,
      rationale: blind ? null : v.rationale,
      conviction_level: blind ? null : v.conviction_level,
    }));

    const eligible = await icEligibleVoters(supabase, orgId);
    const cast = votes.filter((v) => !v.recused).length;
    return NextResponse.json({
      votes,
      blind,
      quorum: computeQuorum(eligible.length, cast, 50),
    });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    // Eligibility derives from org-chart roles, not a hardcoded list.
    if (!hasPitchPermission(viewer, 'pitch.vote')) {
      return NextResponse.json({ error: 'Not eligible to vote on the IC' }, { status: 403 });
    }

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    if (pitch.stage !== 'committee_vote') {
      return NextResponse.json({ error: 'Voting not open' }, { status: 400 });
    }

    const body = await request.json();
    if (!['yes', 'no', 'abstain'].includes(body.vote)) {
      return NextResponse.json({ error: 'vote must be yes, no, or abstain' }, { status: 400 });
    }
    if (!body.recused && !body.rationale?.trim()) {
      return NextResponse.json({ error: 'rationale required' }, { status: 400 });
    }

    const result = await castVoteDb(supabase, orgId, pitch, {
      voter_member_id: viewer.id,
      vote: body.vote,
      rationale: body.rationale || (body.recused ? 'Recused' : ''),
      conviction_level: body.conviction_level,
      recused: body.recused,
      recusal_reason: body.recusal_reason,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    const detail = await fetchPitchDetail(supabase, orgId, pitch.id);
    return NextResponse.json({ pitch: detail, vote: result.vote });
  },
  { requireAuth: true },
);
