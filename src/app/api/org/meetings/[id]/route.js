import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/meetings/:id — any active member may read. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data, error } = await supabase
      .from('org_meetings')
      .select('*')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      meeting: data,
      viewer: {
        userId: member.user_id,
        memberId: member.id,
        canRun: assertOrgRole(member, MANAGER_ROLES),
      },
    });
  },
  { requireAuth: true },
);

/* PATCH /api/org/meetings/:id — manager actions: start, append agenda,
   record a minutes entry, or close the meeting. */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);

    const { data: meeting } = await supabase
      .from('org_meetings')
      .select('*')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const update = {};
    const action = body?.action;

    if (action === 'start') {
      update.status = 'live';
      update.started_at = new Date().toISOString();
      update.started_by = member.user_id;
    } else if (action === 'close') {
      update.status = 'closed';
      update.closed_at = new Date().toISOString();
    } else if (action === 'append_agenda' && body.item) {
      const agenda = Array.isArray(meeting.agenda) ? meeting.agenda : [];
      update.agenda = [...agenda, { ...body.item, id: crypto.randomUUID() }];
    } else if (action === 'record_minute' && body.entry) {
      const minutes = Array.isArray(meeting.minutes) ? meeting.minutes : [];
      update.minutes = [
        ...minutes,
        {
          ...body.entry,
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          by: member.display_name || null,
        },
      ];
    } else {
      // Generic field updates (title, status guarded by check constraint).
      if ('title' in body) update.title = String(body.title).slice(0, 160);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No recognized action' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('org_meetings')
      .update(update)
      .eq('id', id)
      .eq('org_id', member.org_id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ meeting: data });
  },
  { requireAuth: true },
);
