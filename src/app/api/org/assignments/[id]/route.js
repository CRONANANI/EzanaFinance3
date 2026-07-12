import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import {
  MANAGER_ROLES,
  TERMINAL_STATUSES,
  deriveOverdue,
  resolveTargetsToMembers,
} from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/assignments/[id] — detail for the review modal: resolved
   assignees, submission version history, threaded comments, attachment
   metadata (upload write-path is intentionally unwired — no bucket). */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await context.params;

    const { data: assignment } = await supabase
      .from('org_assignments')
      .select('*')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [
      { data: roster },
      { data: targets },
      { data: submissions },
      { data: comments },
      { data: attachments },
    ] = await Promise.all([
      supabase
        .from('org_members')
        .select('id, user_id, display_name, role, sub_role, title, team_id, cohort_id')
        .eq('org_id', member.org_id)
        .eq('is_active', true),
      supabase
        .from('org_assignment_assignees')
        .select('target_type, target_id, target_role')
        .eq('org_id', member.org_id)
        .eq('assignment_id', id),
      supabase
        .from('org_assignment_submissions')
        .select('id, submitted_by, version, note, created_at')
        .eq('org_id', member.org_id)
        .eq('assignment_id', id)
        .order('version', { ascending: false }),
      supabase
        .from('org_assignment_comments')
        .select('id, author_id, body, is_return, created_at')
        .eq('org_id', member.org_id)
        .eq('assignment_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('org_assignment_attachments')
        .select('id, file_name, size_bytes, uploaded_by, submission_id, created_at')
        .eq('org_id', member.org_id)
        .eq('assignment_id', id)
        .order('created_at', { ascending: false }),
    ]);

    const rosterList = roster || [];
    const byUser = new Map(rosterList.map((m) => [m.user_id, m]));
    const people = resolveTargetsToMembers(targets || [], rosterList);
    const assignees = (
      people.length ? people : rosterList.filter((m) => m.user_id === assignment.assigned_to)
    ).map((m) => ({
      member_id: m.id,
      user_id: m.user_id,
      name: m.display_name || 'Member',
      role: m.role,
    }));

    const nameOf = (uid) => byUser.get(uid)?.display_name || 'Member';

    return NextResponse.json({
      assignment: {
        ...assignment,
        type: assignment.assignment_type,
        overdue: deriveOverdue(assignment),
        archived: TERMINAL_STATUSES.includes(assignment.status),
        assignees,
        assigner_name: assignment.assigned_by ? nameOf(assignment.assigned_by) : null,
      },
      submissions: (submissions || []).map((s) => ({
        ...s,
        submitter_name: nameOf(s.submitted_by),
      })),
      comments: (comments || []).map((c) => ({ ...c, author_name: nameOf(c.author_id) })),
      attachments: (attachments || []).map((a) => ({ ...a, uploader_name: nameOf(a.uploaded_by) })),
      viewer: {
        userId: member.user_id,
        memberId: member.id,
        canReview: assertOrgRole(member, MANAGER_ROLES),
        isAssignee: assignment.assigned_to === member.user_id,
      },
    });
  },
  { requireAuth: true },
);
