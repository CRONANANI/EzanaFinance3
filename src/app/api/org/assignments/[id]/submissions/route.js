import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { submitAssignment } from '@/lib/org-assignment-submit';
import { MANAGER_ROLES } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* POST /api/org/assignments/[id]/submissions — assignee submits (or resubmits a
   returned assignment as a new version). Bumps the version and moves the
   assignment to 'submitted'. Version history powers the review modal. Every
   targeted assignee (member/team/cohort/role/org, or the legacy assigned_to)
   may submit (ORG-4). */
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

    const result = await submitAssignment({
      userClient: supabase,
      adminClient: getAdminClient(),
      member,
      isManager: assertOrgRole(member, MANAGER_ROLES),
      assignmentId: id,
      note: body?.note,
    });
    return NextResponse.json(result.body, { status: result.status });
  },
  { requireAuth: true },
);
