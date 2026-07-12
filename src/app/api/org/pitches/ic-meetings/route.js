import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { assertOrgRole } from '@/lib/org-trading-server';
import {
  getPitchContext,
  listIcMeetings,
  createIcMeeting,
  fetchBoardPitches,
  icEligibleVoters,
  MANAGER_ROLES,
} from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async () => {
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ meetings: [], agenda: [] });

    const [meetings, board, eligible] = await Promise.all([
      listIcMeetings(supabase, orgId),
      fetchBoardPitches(supabase, orgId, {}),
      icEligibleVoters(supabase, orgId),
    ]);
    // Agenda auto-assembles from Pitch-Scheduled + open-vote pitches.
    const agenda = board.active.filter((p) =>
      ['committee_scheduled', 'committee_vote'].includes(p.stage),
    );
    return NextResponse.json({ meetings, agenda, eligible_voters: eligible.length });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request) => {
    const { supabase, member, viewer, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Managers only' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const result = await createIcMeeting(
      supabase,
      orgId,
      { ...viewer, user_id: member.user_id },
      {
        meets_at: body.meets_at,
        ballot_type: body.ballot_type,
        threshold: body.threshold,
        quorum_pct: body.quorum_pct,
      },
    );
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ meeting: result.meeting }, { status: 201 });
  },
  { requireAuth: true },
);
