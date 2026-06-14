import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { getGovernance } from '@/lib/org-governance';
import { logOrgAction } from '@/lib/org-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EXPORT_SCOPES = ['exec_advisor', 'exec_pm_advisor'];

/* GET /api/org/governance — effective flags (any active member; they govern
   what each member is allowed to see). */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const governance = await getGovernance(supabase, member.org_id);
    return NextResponse.json({
      governance,
      viewer: {
        // Faculty advisors are executives with sub_role 'Faculty Advisor'.
        canManage: member.role === 'executive',
        isAdvisor: member.role === 'executive' && member.sub_role === 'Faculty Advisor',
      },
    });
  },
  { requireAuth: true },
);

/* PATCH /api/org/governance — update flags (executive / faculty advisor). */
export const PATCH = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive / advisor role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const update = { org_id: member.org_id, updated_at: new Date().toISOString() };
    if ('students_see_peer_scorecards' in body)
      update.students_see_peer_scorecards = !!body.students_see_peer_scorecards;
    if ('students_see_class_grade_distribution' in body)
      update.students_see_class_grade_distribution = !!body.students_see_class_grade_distribution;
    if ('grading_visible_to_students' in body)
      update.grading_visible_to_students = !!body.grading_visible_to_students;
    if ('who_can_export_reports' in body) {
      update.who_can_export_reports = EXPORT_SCOPES.includes(body.who_can_export_reports)
        ? body.who_can_export_reports
        : 'exec_pm_advisor';
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }
    const service = createServerSupabaseClient();
    const { data, error } = await service
      .from('org_governance_settings')
      .upsert(update, { onConflict: 'org_id' })
      .select(
        'students_see_peer_scorecards, students_see_class_grade_distribution, who_can_export_reports, grading_visible_to_students',
      )
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logOrgAction(service, {
      orgId: member.org_id,
      actorId: member.user_id,
      action: 'governance_updated',
      targetType: 'org',
      targetId: member.org_id,
      detail: update,
    });

    return NextResponse.json({ governance: data });
  },
  { requireAuth: true },
);
