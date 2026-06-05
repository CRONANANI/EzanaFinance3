import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { castVote, getVotesForPitch, getPitchRaw } from '@/lib/org-pitch-store';
import { getPitchById, hasPitchPermission } from '@/lib/org-pitches';
import { getPitchApiContext } from '@/lib/org-pitch-api-helpers';
import { MOCK_MEMBERS } from '@/lib/orgMockData';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const votes = getVotesForPitch(params.pitchId).map((v) => ({
      ...v,
      voter_name: MOCK_MEMBERS.find((m) => m.id === v.voter_member_id)?.name,
    }));
    return NextResponse.json({ votes });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { viewer } = await getPitchApiContext();
    if (!hasPitchPermission(viewer, 'pitch.vote')) {
      return NextResponse.json({ error: 'Cannot vote' }, { status: 403 });
    }

    const pitch = getPitchRaw(params.pitchId);
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

    const result = castVote(pitch.id, {
      voter_member_id: viewer.id,
      vote: body.vote,
      rationale: body.rationale || (body.recused ? 'Recused' : ''),
      conviction_level: body.conviction_level,
      recused: body.recused,
      recusal_reason: body.recusal_reason,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ pitch: getPitchById(pitch.id), vote: result.vote });
  },
  { requireAuth: true },
);
