import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import {
  VOTE_VALUES,
  confirmsQuorum,
  isVoterRole,
  meetingBallotView,
  voteBlocker,
} from '@/lib/org-meetings-model';
import { countMeetingBallots, loadRoster } from '../../_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/**
 * The committee vote on one meeting as the caller may see it. Until the
 * meeting is completed: ballots received, quorum and the caller's own vote,
 * never the running count or another member's ballot (org-meetings-model.js).
 */
async function voteState(supabase, member, meeting) {
  const completed = meeting.status === 'closed';
  const [roster, attendeesRes, votesRes, counts] = await Promise.all([
    loadRoster(supabase, member.org_id),
    supabase
      .from('org_meeting_attendees')
      .select('member_id, rsvp, attended')
      .eq('meeting_id', meeting.id)
      .eq('org_id', member.org_id),
    supabase
      .from('org_meeting_votes')
      .select('voter_member_id, vote')
      .eq('meeting_id', meeting.id)
      .eq('org_id', member.org_id),
    completed ? null : countMeetingBallots(supabase, member.org_id, [meeting.id]),
  ]);
  const roleOf = new Map(roster.map((r) => [r.id, r.role]));
  const confirmed = (attendeesRes.data || [])
    .map((a) => ({ ...a, role: roleOf.get(a.member_id) || null }))
    .filter(confirmsQuorum).length;
  return meetingBallotView({
    votes: votesRes.data || [],
    completed,
    viewerMemberId: member.id,
    eligible: roster.filter((r) => isVoterRole(r.role)).length,
    confirmed,
    quorumPct: meeting.quorum_pct,
    received: counts ? counts[meeting.id] : null,
  });
}

async function loadMeeting(supabase, orgId, id) {
  const { data } = await supabase
    .from('org_meetings')
    .select('id, category, status, quorum_pct')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();
  return data || null;
}

/* GET /api/org/meetings/:id/votes: the vote as the caller may see it. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);
    const meeting = await loadMeeting(supabase, member.org_id, id);
    if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(await voteState(supabase, member, meeting));
  },
  { requireAuth: true },
);

/* POST /api/org/meetings/:id/votes: cast or change the caller's vote.
   IC meetings only, executives and portfolio managers only, one vote per
   member (upsert), and only while the meeting is open and quorum is met. */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const meeting = await loadMeeting(supabase, member.org_id, id);
    if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!VOTE_VALUES.includes(body?.vote)) {
      return NextResponse.json({ error: 'vote must be buy | pass | abstain' }, { status: 400 });
    }

    const before = await voteState(supabase, member, meeting);
    const blocked = voteBlocker({ meeting, role: member.role, quorumMet: before.quorum_met });
    if (blocked) {
      const status = meeting.category !== 'ic' || !isVoterRole(member.role) ? 403 : 409;
      return NextResponse.json({ error: blocked }, { status });
    }

    const { error } = await supabase
      .from('org_meeting_votes')
      .upsert(
        { meeting_id: id, org_id: member.org_id, voter_member_id: member.id, vote: body.vote },
        { onConflict: 'meeting_id,voter_member_id' },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(await voteState(supabase, member, meeting));
  },
  { requireAuth: true },
);
