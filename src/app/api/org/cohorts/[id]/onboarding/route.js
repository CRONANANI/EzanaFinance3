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

/* GET /api/org/cohorts/:id/onboarding — the onboarding matrix.
   Onboarding tasks ARE org_assignments rows (linked via org_onboarding_tasks —
   no parallel to-do system). Per-member completion is derived from
   org_assignment_submissions (a submission by the member's account = done). The
   gate = onboarding_gate ON AND the member is missing a gate task. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: cohort } = await supabase
      .from('org_cohorts')
      .select('id, onboarding_gate')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });

    // Onboarding members + the senior pool (for mentor pairing).
    const { data: allMembers } = await supabase
      .from('org_members')
      .select('id, user_id, display_name, role, title, lifecycle_status, mentor_member_id')
      .eq('org_id', member.org_id)
      .eq('is_active', true);
    const roster = allMembers || [];
    const cohortMembers = roster.filter((m) => m.lifecycle_status === 'onboarding');

    // Tasks = onboarding-task links joined to their assignment rows.
    const { data: links } = await supabase
      .from('org_onboarding_tasks')
      .select('id, assignment_id, sort_order, is_gate')
      .eq('org_id', member.org_id)
      .eq('cohort_id', id)
      .order('sort_order', { ascending: true });
    const taskLinks = links || [];
    const assignmentIds = taskLinks.map((t) => t.assignment_id);

    let titleById = new Map();
    if (assignmentIds.length > 0) {
      const { data: asg } = await supabase
        .from('org_assignments')
        .select('id, title, assignment_type, due_date')
        .in('id', assignmentIds);
      titleById = new Map((asg || []).map((a) => [a.id, a]));
    }

    // Completion: submissions by each onboarding member's account.
    const memberUserIds = cohortMembers.map((m) => m.user_id).filter(Boolean);
    const doneSet = new Set(); // `${assignment_id}:${user_id}`
    if (assignmentIds.length > 0 && memberUserIds.length > 0) {
      const { data: subs } = await supabase
        .from('org_assignment_submissions')
        .select('assignment_id, submitted_by')
        .in('assignment_id', assignmentIds)
        .in('submitted_by', memberUserIds);
      for (const s of subs || []) doneSet.add(`${s.assignment_id}:${s.submitted_by}`);
    }

    const isDone = (assignmentId, userId) => userId && doneSet.has(`${assignmentId}:${userId}`);

    const tasks = taskLinks.map((t) => {
      const doneCount = cohortMembers.filter((m) => isDone(t.assignment_id, m.user_id)).length;
      const asg = titleById.get(t.assignment_id) || {};
      return {
        id: t.id,
        assignment_id: t.assignment_id,
        title: asg.title || 'Onboarding task',
        assignment_type: asg.assignment_type || null,
        is_gate: !!t.is_gate,
        sort_order: t.sort_order,
        done_count: doneCount,
        total: cohortMembers.length,
        outstanding: cohortMembers
          .filter((m) => !isDone(t.assignment_id, m.user_id))
          .map((m) => ({ member_id: m.id, display_name: m.display_name })),
      };
    });

    const gateAssignmentIds = tasks.filter((t) => t.is_gate).map((t) => t.assignment_id);
    const nameById = new Map(roster.map((m) => [m.id, m.display_name]));

    const members = cohortMembers.map((m) => {
      const completed = taskLinks
        .filter((t) => isDone(t.assignment_id, m.user_id))
        .map((t) => t.assignment_id);
      const missingGate = gateAssignmentIds.filter((aid) => !isDone(aid, m.user_id));
      return {
        id: m.id,
        display_name: m.display_name,
        role: m.role,
        title: m.title || null,
        user_linked: !!m.user_id,
        mentor_member_id: m.mentor_member_id || null,
        mentor_name: m.mentor_member_id ? nameById.get(m.mentor_member_id) || null : null,
        completed_assignment_ids: completed,
        completed_count: completed.length,
        task_total: tasks.length,
        blocked: cohort.onboarding_gate && missingGate.length > 0,
        missing_gate_count: missingGate.length,
      };
    });

    // Mentor load across the whole roster.
    const mentorLoad = {};
    for (const m of roster) {
      if (m.mentor_member_id)
        mentorLoad[m.mentor_member_id] = (mentorLoad[m.mentor_member_id] || 0) + 1;
    }
    const seniors = roster
      .filter((m) => m.lifecycle_status !== 'onboarding')
      .map((m) => ({
        id: m.id,
        display_name: m.display_name,
        role: m.role,
        title: m.title || null,
        mentee_count: mentorLoad[m.id] || 0,
      }));

    const enrolled = members.length;
    const avgCompletion =
      enrolled > 0 && tasks.length > 0
        ? Math.round(
            (members.reduce((s, m) => s + m.completed_count, 0) / (enrolled * tasks.length)) * 100,
          )
        : enrolled > 0
          ? 100
          : null;
    const fullyOnboarded = members.filter(
      (m) => tasks.length > 0 && m.completed_count === tasks.length,
    ).length;
    const blocked = members.filter((m) => m.blocked).length;

    return NextResponse.json({
      gateEnabled: !!cohort.onboarding_gate,
      tasks,
      members,
      seniors,
      stats: {
        enrolled,
        avg_completion_pct: avgCompletion,
        fully_onboarded: fullyOnboarded,
        blocked,
      },
      viewer: { memberId: member.id, canManage: MANAGER_ROLES.includes(member.role) },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/cohorts/:id/onboarding — create a task (manager), or mark a
   task complete/incomplete for a member.
   body.action: 'complete' | 'uncomplete' → { assignment_id, member_id }
   otherwise creates a task → { title, is_gate, assignment_type, sort_order } */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const isManager = assertOrgRole(member, MANAGER_ROLES);

    // ── Mark complete / uncomplete ──────────────────────────────────────────
    if (body?.action === 'complete' || body?.action === 'uncomplete') {
      const assignmentId = body?.assignment_id;
      const memberId = body?.member_id;
      if (!assignmentId || !memberId) {
        return NextResponse.json(
          { error: 'assignment_id and member_id required' },
          { status: 400 },
        );
      }
      const { data: target } = await supabase
        .from('org_members')
        .select('id, user_id')
        .eq('id', memberId)
        .eq('org_id', member.org_id)
        .eq('cohort_id', id)
        .maybeSingle();
      if (!target) return NextResponse.json({ error: 'Member not in cohort' }, { status: 404 });
      // A member may only complete their own; managers may complete anyone's.
      if (!isManager && target.id !== member.id) {
        return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
      }
      if (!target.user_id) {
        return NextResponse.json(
          { error: 'Member has no linked account yet — cannot record completion.' },
          { status: 400 },
        );
      }
      // Confirm the assignment is one of this cohort's onboarding tasks.
      const { data: link } = await supabase
        .from('org_onboarding_tasks')
        .select('id')
        .eq('org_id', member.org_id)
        .eq('cohort_id', id)
        .eq('assignment_id', assignmentId)
        .maybeSingle();
      if (!link) return NextResponse.json({ error: 'Task not in cohort' }, { status: 404 });

      if (body.action === 'uncomplete') {
        const { error } = await supabase
          .from('org_assignment_submissions')
          .delete()
          .eq('assignment_id', assignmentId)
          .eq('submitted_by', target.user_id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, done: false });
      }

      // Idempotent complete.
      const { data: existing } = await supabase
        .from('org_assignment_submissions')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('submitted_by', target.user_id)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase.from('org_assignment_submissions').insert({
          assignment_id: assignmentId,
          org_id: member.org_id,
          submitted_by: target.user_id,
          version: 1,
          note: 'Onboarding task completed',
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, done: true });
    }

    // ── Create a task (manager only) ────────────────────────────────────────
    if (!isManager) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }
    const title = (body?.title || '').trim();
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const { data: cohort } = await supabase
      .from('org_cohorts')
      .select('id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });

    // The task is a real Assignment (assigned_to is the manager as owner of the
    // definition; per-member completion is tracked via submissions).
    const { data: assignment, error: asgErr } = await supabase
      .from('org_assignments')
      .insert({
        org_id: member.org_id,
        cohort_id: id,
        title: title.slice(0, 200),
        assignment_type: 'other',
        status: 'assigned',
        assigned_to: member.user_id,
        assigned_by: member.user_id,
      })
      .select('id, title')
      .single();
    if (asgErr) return NextResponse.json({ error: asgErr.message }, { status: 500 });

    const { data: taskLink, error: linkErr } = await supabase
      .from('org_onboarding_tasks')
      .insert({
        org_id: member.org_id,
        cohort_id: id,
        assignment_id: assignment.id,
        is_gate: !!body?.is_gate,
        sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0,
      })
      .select('*')
      .single();
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });

    return NextResponse.json({ task: { ...taskLink, title: assignment.title } }, { status: 201 });
  },
  { requireAuth: true },
);

/* DELETE /api/org/cohorts/:id/onboarding?task_id= — remove an onboarding task
   link (manager only). Leaves the underlying assignment in place. */
export const DELETE = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    if (!taskId) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

    const { error } = await supabase
      .from('org_onboarding_tasks')
      .delete()
      .eq('id', taskId)
      .eq('org_id', member.org_id)
      .eq('cohort_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
