import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const KINDS = ['model', 'memo', 'report', 'deck', 'sheet', 'primer', 'news', 'earnings_call'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/meetings/:id/deliverables — deliverables discussed (any member). */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);
    const { data, error } = await supabase
      .from('org_meeting_deliverables')
      .select('*')
      .eq('meeting_id', id)
      .eq('org_id', member.org_id)
      .order('created_at');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deliverables: data || [] });
  },
  { requireAuth: true },
);

/* POST /api/org/meetings/:id/deliverables — managers record a deliverable
   discussed. Body: { kind, label, note_id? }. */
export const POST = withApiGuard(
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
      .select('id')
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
    const kind = KINDS.includes(body?.kind) ? body.kind : null;
    const label = (body?.label || '').trim();
    if (!kind) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 });

    const { data, error } = await supabase
      .from('org_meeting_deliverables')
      .insert({
        meeting_id: id,
        org_id: member.org_id,
        kind,
        label: label.slice(0, 200),
        note_id: body?.note_id || null,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deliverable: data });
  },
  { requireAuth: true },
);

/* DELETE /api/org/meetings/:id/deliverables?deliverable_id=… — managers remove. */
export const DELETE = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);
    const delId = new URL(request.url).searchParams.get('deliverable_id');
    if (!delId) return NextResponse.json({ error: 'deliverable_id required' }, { status: 400 });

    const { error } = await supabase
      .from('org_meeting_deliverables')
      .delete()
      .eq('id', delId)
      .eq('meeting_id', id)
      .eq('org_id', member.org_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
