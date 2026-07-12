import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
// IC voters come from org-chart roles — never a hardcoded list.
const IC_VOTER_ROLES = ['executive', 'portfolio_manager'];
const VOTE_VALUES = ['buy', 'pass', 'abstain'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

async function computeTally(supabase, orgId, meetingId, myMemberId) {
  const { data: votes } = await supabase
    .from('org_meeting_votes')
    .select('vote, voter_member_id')
    .eq('meeting_id', meetingId)
    .eq('org_id', orgId);
  const tally = { buy: 0, pass: 0, abstain: 0 };
  let myVote = null;
  for (const v of votes || []) {
    if (tally[v.vote] !== undefined) tally[v.vote] += 1;
    if (v.voter_member_id === myMemberId) myVote = v.vote;
  }
  return { tally, total: tally.buy + tally.pass + tally.abstain, myVote };
}

/* GET /api/org/meetings/:id/votes — live tally + the caller's own vote. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);
    const result = await computeTally(supabase, member.org_id, id, member.id);
    return NextResponse.json(result);
  },
  { requireAuth: true },
);

/* POST /api/org/meetings/:id/votes — cast/update the caller's IC vote.
   Quorum-gated & IC-only: the meeting must be category 'ic' and the caller
   must hold an IC voter role (org-chart derived). One vote per member (upsert). */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: meeting } = await supabase
      .from('org_meetings')
      .select('id, category, quorum_pct')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (meeting.category !== 'ic') {
      return NextResponse.json({ error: 'Voting is Investment Committee only' }, { status: 403 });
    }
    if (!IC_VOTER_ROLES.includes(member.role)) {
      return NextResponse.json({ error: 'Not an eligible IC voter' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!VOTE_VALUES.includes(body?.vote)) {
      return NextResponse.json({ error: 'vote must be buy | pass | abstain' }, { status: 400 });
    }

    const { error } = await supabase
      .from('org_meeting_votes')
      .upsert(
        { meeting_id: id, org_id: member.org_id, voter_member_id: member.id, vote: body.vote },
        { onConflict: 'meeting_id,voter_member_id' },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const result = await computeTally(supabase, member.org_id, id, member.id);
    return NextResponse.json(result);
  },
  { requireAuth: true },
);
