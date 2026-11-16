/**
 * GET /api/org/reports/sample   sample content for Reports
 *
 * { sample: null } for every council member. Master admin and demo accounts
 * (the same check the Community page and the other rebuilt Team Hub pages
 * use, on the verified session) get three sample reports for the sample
 * council from src/lib/org-reports-sample.js. Nothing is read from or
 * written to council records beyond resolving the caller's own membership,
 * which also keeps non-members out.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { buildReportsSample } from '@/lib/org-reports-sample';
import { summarizeReport } from '@/lib/org-reports-model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

export const GET = withApiGuard(
  async (request, user) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!isCommunityDemoViewer(user)) {
      return NextResponse.json({ sample: null }, { headers: PRIVATE });
    }
    const bundle = buildReportsSample({ role: member.role, userId: member.user_id });
    const first = bundle.reports[0];
    return NextResponse.json(
      {
        sample: {
          is_demo: true,
          council: bundle.council,
          reports: bundle.reports.map((r) => ({ ...summarizeReport(r, null), is_demo: true })),
          latest: { ...first, authorName: first.payload.generatedByName },
        },
      },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);
