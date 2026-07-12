import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { MANAGER_ROLES } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* POST /api/org/assignments/[id]/submissions — assignee submits (or resubmits a
   returned assignment as a new version). Bumps the version and moves the
   assignment to 'submitted'. Version history powers the review modal. */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await context.params;

    let body = {};
    try {
      body = (await request.json()) || {};
    } catch {
      body = {};
    }

    const { data: assignment } = await supabase
      .from('org_assignments')
      .select('id, assigned_to, status')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isManager = assertOrgRole(member, MANAGER_ROLES);
    const isAssignee = assignment.assigned_to === member.user_id;
    if (!isAssignee && !isManager) {
      return NextResponse.json({ error: 'Only the assignee can submit' }, { status: 403 });
    }

    // Next version = current max + 1.
    const { data: last } = await supabase
      .from('org_assignment_submissions')
      .select('version')
      .eq('org_id', member.org_id)
      .eq('assignment_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (last?.version || 0) + 1;

    const { data: submission, error } = await supabase
      .from('org_assignment_submissions')
      .insert({
        assignment_id: id,
        org_id: member.org_id,
        submitted_by: member.user_id,
        version: nextVersion,
        note: body?.note ? String(body.note).slice(0, 2000) : null,
      })
      .select('id, submitted_by, version, note, created_at')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Advance the assignment to 'submitted'.
    await supabase
      .from('org_assignments')
      .update({ status: 'submitted' })
      .eq('id', id)
      .eq('org_id', member.org_id);

    return NextResponse.json(
      { submission: { ...submission, submitter_name: member.display_name || 'Member' } },
      { status: 201 },
    );
  },
  { requireAuth: true },
);
