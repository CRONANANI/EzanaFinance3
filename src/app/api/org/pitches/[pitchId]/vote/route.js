import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { hasPitchPermission } from '@/lib/org-pitches';
import {
  getPitchContext,
  fetchPitchRaw,
  fetchPitchDetail,
  castVoteDb,
  computeQuorum,
} from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET: the ballots on a pitch, as this member may see them.
 *
 * Open ballot, or a blind ballot whose meeting has closed: every ballot with
 * its voter, plus the tally. Blind ballot still open: only the member's own
 * ballot and the number of ballots received. No names, no choices, no
 * rationales and no tally leave the server (lib/pitch/ballot-privacy.js).
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ votes: [] });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const detail = await fetchPitchDetail(supabase, orgId, pitch.id, {
      viewerMemberId: viewer?.id,
    });
    const summary = detail.ballot;
    return NextResponse.json({
      votes: detail.votes,
      blind: summary.sealed,
      ballot: summary,
      quorum: computeQuorum(summary.eligible, summary.received, summary.quorum_pct),
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
    if (pitch.stage !== 'ic_vote') {
      return NextResponse.json({ error: 'Voting is not open' }, { status: 400 });
    }
    if (pitch.ic_meeting_id) {
      const { data: mtg } = await supabase
        .from('org_ic_meetings')
        .select('status')
        .eq('id', pitch.ic_meeting_id)
        .eq('org_id', orgId)
        .maybeSingle();
      if (mtg?.status === 'closed') {
        return NextResponse.json({ error: 'Voting is closed' }, { status: 400 });
      }
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

    const detail = await fetchPitchDetail(supabase, orgId, pitch.id, {
      viewerMemberId: viewer?.id,
    });
    return NextResponse.json({ pitch: detail, vote: result.vote });
  },
  { requireAuth: true },
);
