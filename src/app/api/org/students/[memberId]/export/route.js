import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { logOrgAction } from '@/lib/org-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/students/:memberId/export — assemble a student's record
   (grades, pitches, assignments) for advisor/executive export. Audit-logged. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive / advisor role required' }, { status: 403 });
    }
    const { memberId } = await resolveParams(context);

    const { data: target } = await supabase
      .from('org_members')
      .select('id, user_id, display_name, role, sub_role, team_id')
      .eq('id', memberId)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const [{ data: grades }, { data: pitches }, { data: assignments }] = await Promise.all([
      supabase
        .from('org_grades')
        .select('*')
        .eq('org_id', member.org_id)
        .eq('student_id', target.user_id),
      supabase
        .from('org_pitches')
        .select('id, ticker, company_name, stage, status, decision, created_at')
        .eq('org_id', member.org_id)
        .eq('analyst_member_id', target.id),
      supabase
        .from('org_assignments')
        .select('id, title, assignment_type, status, due_date, created_at')
        .eq('org_id', member.org_id)
        .eq('assigned_to', target.user_id),
    ]);

    const record = {
      exported_at: new Date().toISOString(),
      exported_by: member.display_name || member.user_id,
      student: {
        member_id: target.id,
        name: target.display_name,
        role: target.role,
        sub_role: target.sub_role,
      },
      grades: grades || [],
      pitches: pitches || [],
      assignments: assignments || [],
    };

    // Audit the export (best-effort; never blocks the download).
    if (isServerSupabaseConfigured()) {
      await logOrgAction(createServerSupabaseClient(), {
        orgId: member.org_id,
        actorId: member.user_id,
        action: 'student_data_exported',
        targetType: 'member',
        targetId: target.id,
        detail: { name: target.display_name },
      });
    }

    return new NextResponse(JSON.stringify(record, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="student-${target.id}.json"`,
      },
    });
  },
  { requireAuth: true },
);
