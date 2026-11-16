import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { computeReport, listReports, reportViewer } from '@/lib/org-reports-server';
import { summarizeReport } from '@/lib/org-reports-model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

/* Who may generate, open and delete: executives (faculty advisors are
   executives) and, unless the advisor's "Who can export stakeholder reports"
   setting says executives and advisors only, portfolio managers. Analysts and
   restricted managers get their access reason and no reports. */

/* GET /api/org/reports: saved reports, summarised, plus the newest in full. */
export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const viewer = await reportViewer(supabase, member);
    const base = {
      access: viewer.access,
      exportScope: viewer.exportScope,
      canGenerate: viewer.canExport,
      canDelete: viewer.canExport,
    };
    if (!viewer.canExport) {
      return NextResponse.json({ reports: [], latest: null, viewer: base }, { headers: PRIVATE });
    }
    const out = await listReports(supabase, member.org_id);
    if (out.error) {
      return NextResponse.json({ error: 'Could not load reports' }, { status: 500 });
    }
    return NextResponse.json(
      { reports: out.reports, latest: out.latest, viewer: base },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);

/* POST /api/org/reports: work out a stakeholder report and save it.
   Body: { period_label, include_roster, include_analyst_names, dry_run }.
   With dry_run the report is worked out and returned, and nothing is saved. */
export const POST = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const viewer = await reportViewer(supabase, member);
    if (!viewer.canExport) {
      return NextResponse.json(
        {
          error:
            viewer.access === 'export_restricted'
              ? 'Your council limits stakeholder reports to executives and faculty advisors.'
              : 'Manager / advisor role required',
        },
        { status: 403 },
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      /* defaults */
    }
    const { payload, title, cohortId } = await computeReport(supabase, member, body);

    if (body?.dry_run) {
      return NextResponse.json(
        {
          preview: summarizeReport(
            { title, period_label: payload.periodLabel, created_at: payload.generatedAt, payload },
            null,
          ),
        },
        { headers: PRIVATE },
      );
    }

    const { data, error } = await supabase
      .from('org_reports')
      .insert({
        org_id: member.org_id,
        cohort_id: cohortId,
        title,
        period_label: payload.periodLabel,
        generated_by: member.user_id,
        payload,
      })
      .select('id, title, period_label, created_at, generated_by, payload')
      .single();
    if (error) return NextResponse.json({ error: 'Could not save the report' }, { status: 500 });

    return NextResponse.json({ report: data, summary: summarizeReport(data, null) });
  },
  { requireAuth: true },
);
