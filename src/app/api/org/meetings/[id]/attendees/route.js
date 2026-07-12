import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const RSVP_VALUES = ['pending', 'yes', 'no', 'maybe'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

async function loadMeeting(supabase, orgId, id) {
  const { data } = await supabase
    .from('org_meetings')
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();
  return data;
}

/* POST /api/org/meetings/:id/attendees — managers add attendees from the
   org chart (RSVP seeded to pending). Body: { member_ids: [...] }. */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);
    if (!(await loadMeeting(supabase, member.org_id, id))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const memberIds = Array.isArray(body?.member_ids)
      ? [...new Set(body.member_ids.filter(Boolean))]
      : [];
    if (memberIds.length === 0)
      return NextResponse.json({ error: 'member_ids required' }, { status: 400 });

    // Only accept ids that are real active members of this org.
    const { data: valid } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', member.org_id)
      .eq('is_active', true)
      .in('id', memberIds);
    const validIds = new Set((valid || []).map((m) => m.id));
    const rows = memberIds
      .filter((mid) => validIds.has(mid))
      .map((mid) => ({ meeting_id: id, org_id: member.org_id, member_id: mid, rsvp: 'pending' }));
    if (rows.length === 0) return NextResponse.json({ error: 'No valid members' }, { status: 400 });

    const { error } = await supabase
      .from('org_meeting_attendees')
      .upsert(rows, { onConflict: 'meeting_id,member_id', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, added: rows.length });
  },
  { requireAuth: true },
);

/* PATCH /api/org/meetings/:id/attendees — RSVP write. A member sets their OWN
   rsvp; a manager may set another member's rsvp or mark `attended`.
   Body: { rsvp?, attended?, member_id? }. Upserts on (meeting_id, member_id). */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const canManage = assertOrgRole(member, MANAGER_ROLES);
    const { id } = await resolveParams(context);
    if (!(await loadMeeting(supabase, member.org_id, id))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Non-managers may only act on their own attendee row.
    const targetMemberId = canManage && body?.member_id ? body.member_id : member.id;
    if (!canManage && body?.member_id && body.member_id !== member.id) {
      return NextResponse.json({ error: 'Can only set your own RSVP' }, { status: 403 });
    }

    const row = { meeting_id: id, org_id: member.org_id, member_id: targetMemberId };
    if ('rsvp' in body) {
      if (!RSVP_VALUES.includes(body.rsvp))
        return NextResponse.json({ error: 'Invalid rsvp' }, { status: 400 });
      row.rsvp = body.rsvp;
    }
    // `attended` is a post-hoc roster fact — managers only.
    if ('attended' in body) {
      if (!canManage) return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
      row.attended = !!body.attended;
    }
    if (!('rsvp' in row) && !('attended' in row)) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('org_meeting_attendees')
      .upsert(row, { onConflict: 'meeting_id,member_id' })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ attendee: data });
  },
  { requireAuth: true },
);
