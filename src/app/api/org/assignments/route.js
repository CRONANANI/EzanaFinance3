import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const TYPES = ['pitch', 'research', 'coverage', 'reading', 'other'];

/* GET /api/org/assignments — RLS returns own for analysts, all for managers. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const canAssign = assertOrgRole(member, MANAGER_ROLES);

    const { data, error } = await supabase
      .from('org_assignments')
      .select('*')
      .eq('org_id', member.org_id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, display_name, role')
      .eq('org_id', member.org_id)
      .eq('is_active', true);
    const byUser = new Map((members || []).map((m) => [m.user_id, m]));

    const assignments = (data || []).map((a) => ({
      ...a,
      assignee_name: byUser.get(a.assigned_to)?.display_name || 'Member',
      assigner_name: a.assigned_by ? byUser.get(a.assigned_by)?.display_name || null : null,
      mine: a.assigned_to === member.user_id,
    }));

    return NextResponse.json({
      assignments,
      roster: canAssign
        ? (members || [])
            .filter((m) => m.role === 'analyst' || m.role === 'portfolio_manager')
            .map((m) => ({ user_id: m.user_id, display_name: m.display_name, role: m.role }))
        : [],
      viewer: { userId: member.user_id, canAssign, types: TYPES },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/assignments — assign work (manager / advisor only). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager / advisor role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const title = (body?.title || '').trim();
    const assignedTo = body?.assigned_to;
    if (!title || !assignedTo) {
      return NextResponse.json({ error: 'title and assigned_to required' }, { status: 400 });
    }

    const { data: target } = await supabase
      .from('org_members')
      .select('user_id, cohort_id')
      .eq('org_id', member.org_id)
      .eq('user_id', assignedTo)
      .eq('is_active', true)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: 'Assignee not in org' }, { status: 404 });

    const { data, error } = await supabase
      .from('org_assignments')
      .insert({
        org_id: member.org_id,
        cohort_id: target.cohort_id || null,
        assigned_to: assignedTo,
        assigned_by: member.user_id,
        title: title.slice(0, 200),
        description: body?.description ? String(body.description).slice(0, 4000) : null,
        assignment_type: TYPES.includes(body?.assignment_type) ? body.assignment_type : 'pitch',
        due_date: body?.due_date || null,
        status: 'assigned',
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ assignment: data });
  },
  { requireAuth: true },
);

/* PATCH /api/org/assignments — status transitions.
   Assignee may mark 'submitted'; managers may set 'graded'. */
export const PATCH = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { id, status } = body || {};
    if (!id || !['assigned', 'submitted', 'graded'].includes(status)) {
      return NextResponse.json({ error: 'id and a valid status required' }, { status: 400 });
    }

    const { data: assignment } = await supabase
      .from('org_assignments')
      .select('id, assigned_to')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isManager = assertOrgRole(member, MANAGER_ROLES);
    const isAssignee = assignment.assigned_to === member.user_id;

    // Assignees may only move their own work to 'submitted'.
    if (status === 'submitted' && !isAssignee && !isManager) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }
    if (status !== 'submitted' && !isManager) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('org_assignments')
      .update({ status })
      .eq('id', id)
      .eq('org_id', member.org_id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ assignment: data });
  },
  { requireAuth: true },
);
