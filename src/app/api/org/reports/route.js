import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import {
  computeFundPerformance,
  attributionByAnalyst,
  attributionBySector,
  attributionByPitch,
} from '@/lib/org-attribution';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/* GET /api/org/reports — list previously generated reports. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data, error } = await supabase
      .from('org_reports')
      .select('id, title, period_label, created_at, generated_by')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      reports: data || [],
      viewer: { canGenerate: assertOrgRole(member, MANAGER_ROLES) },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/reports — assemble + store a stakeholder report (manager/advisor). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager / advisor role required' }, { status: 403 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      /* defaults below */
    }
    const orgId = member.org_id;
    const periodLabel = (body?.period_label || '').trim() || 'Current Term';

    const [performance, byAnalyst, bySector, byPitch, { data: org }, { data: roster }, { data: cohort }] =
      await Promise.all([
        computeFundPerformance(supabase, orgId),
        attributionByAnalyst(supabase, orgId),
        attributionBySector(supabase, orgId),
        attributionByPitch(supabase, orgId),
        supabase.from('organizations').select('university_name, name').eq('id', orgId).maybeSingle(),
        supabase
          .from('org_members')
          .select('display_name, role, sub_role, title')
          .eq('org_id', orgId)
          .eq('is_active', true),
        supabase
          .from('org_cohorts')
          .select('id, name')
          .eq('org_id', orgId)
          .eq('is_current', true)
          .maybeSingle(),
      ]);

    const universityName = org?.university_name || org?.name || 'Student Investment Fund';
    const topPitches = (byPitch || []).filter((p) => p.has_outcome).slice(0, 10);

    const payload = {
      universityName,
      periodLabel,
      generatedAt: new Date().toISOString(),
      performance,
      attribution: { byAnalyst, bySector },
      topPitches,
      roster: (roster || []).map((m) => ({
        name: m.display_name,
        role: m.role,
        title: m.title || null,
        sub_role: m.sub_role || null,
      })),
      cohort: cohort?.name || null,
    };

    const title = `${universityName} — Fund Report (${periodLabel})`;

    const { data, error } = await supabase
      .from('org_reports')
      .insert({
        org_id: orgId,
        cohort_id: cohort?.id || null,
        title,
        period_label: periodLabel,
        generated_by: member.user_id,
        payload,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ report: data });
  },
  { requireAuth: true },
);
