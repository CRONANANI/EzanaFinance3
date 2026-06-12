import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const STATUSES = ['pending', 'in_progress', 'review', 'completed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/* GET /api/org/tasks — org task board (Team Hub home + task views).
   All members read the org's tasks; rows are flagged `mine` for the viewer. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data, error } = await supabase
      .from('org_tasks')
      .select('*')
      .eq('org_id', member.org_id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, display_name, role')
      .eq('org_id', member.org_id);
    const byUser = new Map((members || []).map((m) => [m.user_id, m]));

    const now = Date.now();
    const tasks = (data || []).map((t) => ({
      ...t,
      assignee_name: byUser.get(t.assigned_to)?.display_name || 'Member',
      assigner_name: t.assigned_by ? byUser.get(t.assigned_by)?.display_name || null : null,
      mine: t.assigned_to === member.user_id,
      overdue: Boolean(t.due_date && t.status !== 'completed' && Date.parse(t.due_date) < now),
    }));

    return NextResponse.json({
      tasks,
      openCount: tasks.filter((t) => t.status !== 'completed').length,
      overdueCount: tasks.filter((t) => t.overdue).length,
      viewer: {
        userId: member.user_id,
        canManage: assertOrgRole(member, MANAGER_ROLES),
        statuses: STATUSES,
        priorities: PRIORITIES,
      },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/tasks — create a task (manager only). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const title = (body?.title || '').trim();
    const assignedTo = body?.assigned_to || member.user_id;
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const { data, error } = await supabase
      .from('org_tasks')
      .insert({
        org_id: member.org_id,
        team_id: body?.team_id || null,
        assigned_to: assignedTo,
        assigned_by: member.user_id,
        title,
        description: body?.description || null,
        due_date: body?.due_date || null,
        status: STATUSES.includes(body?.status) ? body.status : 'pending',
        priority: PRIORITIES.includes(body?.priority) ? body.priority : 'medium',
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ task: data }, { status: 201 });
  },
  { requireAuth: true },
);

/* PATCH /api/org/tasks — update status (assignee or manager). */
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
    if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (!STATUSES.includes(body?.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data: task } = await supabase
      .from('org_tasks')
      .select('id, assigned_to, org_id')
      .eq('id', body.id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const isAssignee = task.assigned_to === member.user_id;
    if (!isAssignee && !assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Only the assignee or a manager can update' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('org_tasks')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ task: data });
  },
  { requireAuth: true },
);
