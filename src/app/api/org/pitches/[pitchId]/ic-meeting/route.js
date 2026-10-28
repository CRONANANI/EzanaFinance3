import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { assertOrgRole } from '@/lib/org-trading-server';
import {
  getPitchContext,
  fetchPitchRaw,
  fetchPitchDetail,
  MANAGER_ROLES,
} from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ASSIGNABLE_STAGES = ['cross_desk_review', 'pitch_scheduled', 'ic_vote'];

/**
 * POST /api/org/pitches/[pitchId]/ic-meeting  { ic_meeting_id: uuid | null }
 * Managers attach a pitch to an IC meeting in their org (or detach it before
 * voting starts). The meeting time is mirrored to ic_meeting_at for the board.
 */
export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, member, viewer, orgId } = await getPitchContext();
    if (!orgId || !viewer)
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Managers only' }, { status: 403 });
    }

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    if (pitch.status !== 'active' || !ASSIGNABLE_STAGES.includes(pitch.stage)) {
      return NextResponse.json(
        { error: 'A pitch can be scheduled from Cross-Desk Review, Pitch Scheduled or IC Vote' },
        { status: 400 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const meetingId = body?.ic_meeting_id || null;

    const admin = getAdminClient();
    let meetsAt = null;
    if (meetingId) {
      const { data: meeting } = await admin
        .from('org_ic_meetings')
        .select('id, org_id, meets_at, status')
        .eq('id', meetingId)
        .eq('org_id', orgId)
        .maybeSingle();
      if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      if (meeting.status === 'closed') {
        return NextResponse.json({ error: 'That meeting is closed' }, { status: 400 });
      }
      meetsAt = meeting.meets_at || null;
    } else if (pitch.stage === 'ic_vote') {
      return NextResponse.json(
        { error: 'Cannot detach a pitch while its vote is open' },
        { status: 400 },
      );
    }

    const { error } = await admin
      .from('org_pitches')
      .update({
        ic_meeting_id: meetingId,
        ic_meeting_at: meetsAt,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', orgId)
      .eq('id', pitch.id);
    if (error) return NextResponse.json({ error: 'Could not update the pitch' }, { status: 500 });

    const detail = await fetchPitchDetail(supabase, orgId, pitch.id);
    return NextResponse.json({ pitch: detail });
  },
  { requireAuth: true },
);
