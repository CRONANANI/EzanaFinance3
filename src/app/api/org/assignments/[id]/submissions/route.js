import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { MANAGER_ROLES } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* POST /api/org/assignments/[id]/submissions — assignee submits (or resubmits a
   returned assignment as a new version). Bumps the version and moves the
   assignment to 'submitted'. Version history powers the review modal. */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const supabase = getUserClient();
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

    /* The version is computed inside the insert under a per-assignment lock
       (submit_org_assignment), with a unique (assignment_id, version), so two
       submits at once cannot both become version N. Until that migration is
       applied, the old max+1 path runs. */
    const note = body?.note ? String(body.note).slice(0, 2000) : null;
    let submission = null;
    let error = null;
    const rpc = await supabase.rpc('submit_org_assignment', {
      p_assignment: id,
      p_org: member.org_id,
      p_note: note,
    });
    if (!rpc.error) {
      submission = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    } else if (rpc.error.code === 'PGRST202' || rpc.error.code === '42883') {
      const { data: last } = await supabase
        .from('org_assignment_submissions')
        .select('version')
        .eq('org_id', member.org_id)
        .eq('assignment_id', id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      const res = await supabase
        .from('org_assignment_submissions')
        .insert({
          assignment_id: id,
          org_id: member.org_id,
          submitted_by: member.user_id,
          version: (last?.version || 0) + 1,
          note,
        })
        .select('id, submitted_by, version, note, created_at')
        .single();
      submission = res.data;
      error = res.error;
    } else {
      error = rpc.error;
    }
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
