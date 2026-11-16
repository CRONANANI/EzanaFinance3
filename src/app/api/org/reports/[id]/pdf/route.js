import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { reportViewer } from '@/lib/org-reports-server';
import { renderPrintableHtml } from '@/lib/org-reports-document';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { sampleReportById } from '@/lib/org-reports-sample';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* An analyst or a restricted manager who follows a link gets a short page,
   not raw error text. */
function refusal(text, status) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Report not available</title></head><body style="font-family:system-ui,sans-serif;margin:48px;color:#0f172a"><p>${text}</p></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/* GET /api/org/reports/:id/pdf: the printable stakeholder report, a
   self-contained HTML document built from the saved copy (so it reprints
   with the same frozen figures). Only members who may export reports (role
   and the advisor's export setting); another council's report is not found.
   The print dialog opens from the button, never by itself. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return refusal('This report is for council members only.', 403);
    const viewer = await reportViewer(supabase, member);
    if (!viewer.canExport) {
      return refusal(
        viewer.access === 'export_restricted'
          ? 'Your council limits stakeholder reports to executives and faculty advisors.'
          : 'Stakeholder reports are for executives, portfolio managers and faculty advisors.',
        403,
      );
    }
    const { id } = await resolveParams(context);

    let report = null;
    let sample = false;
    if (String(id || '').startsWith('sample-report-')) {
      if (isCommunityDemoViewer(user)) {
        report = sampleReportById(id, { role: member.role, userId: member.user_id });
        sample = Boolean(report);
      }
    } else {
      const { data } = await supabase
        .from('org_reports')
        .select('id, title, period_label, created_at, generated_by, payload')
        .eq('id', id)
        .eq('org_id', member.org_id)
        .maybeSingle();
      report = data || null;
    }
    if (!report) return refusal('Report not found.', 404);

    /* Reports saved before the author's name was stored: resolve it. */
    let authorName = null;
    if (!sample && !report.payload?.generatedByName && report.generated_by) {
      const { data: m } = await supabase
        .from('org_members')
        .select('display_name')
        .eq('org_id', member.org_id)
        .eq('user_id', report.generated_by)
        .maybeSingle();
      authorName = m?.display_name || null;
    }

    const origin = (() => {
      try {
        return new URL(request.url).origin;
      } catch {
        return '';
      }
    })();
    /* The page CSP allows inline scripts only with the per-request nonce,
       forwarded as x-nonce (ORG-18); the generator drops anything else. */
    const html = renderPrintableHtml(report, {
      origin,
      nonce: request.headers.get('x-nonce') || '',
      screen: true,
      sample,
      authorName,
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store',
      },
    });
  },
  { requireAuth: true },
);
