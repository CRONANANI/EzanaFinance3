import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { getPitchContext } from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NEXT = {
  scheduled: ['in_session', 'closed'],
  in_session: ['closed'],
  closed: [],
};

/** PATCH /api/org/pitches/ic-meetings/[meetingId]  { status } (executives only) */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { member, orgId } = await getPitchContext();
    if (!orgId || !member)
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (member.role !== 'executive') {
      return NextResponse.json({ error: 'Executives only' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const status = body?.status;

    const admin = getAdminClient();
    const { data: meeting } = await admin
      .from('org_ic_meetings')
      .select('id, status')
      .eq('id', params.meetingId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    if (!(NEXT[meeting.status] || []).includes(status)) {
      return NextResponse.json(
        { error: `Cannot move a ${meeting.status} meeting to ${status}` },
        { status: 400 },
      );
    }

    const { data, error } = await admin
      .from('org_ic_meetings')
      .update({ status })
      .eq('id', meeting.id)
      .eq('org_id', orgId)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: 'Could not update the meeting' }, { status: 500 });
    return NextResponse.json({ meeting: data });
  },
  { requireAuth: true },
);
