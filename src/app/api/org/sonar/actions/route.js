import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadMemberOverrides } from '@/lib/org-permissions-server';
import { logOrgAction } from '@/lib/org-audit';
import { authorizeAction, classify, findingMessage } from '@/lib/org-sonar/intelligence/actions';
import { withNoEmDash } from '@/lib/text/no-em-dash-response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/* org_audit_log has no client insert policy by design: the audit row is written with the
   service role, scoped to the verified org (lib/org-audit.js). */
const audit = (entry) =>
  isServerSupabaseConfigured() ? logOrgAction(getAdminClient(), entry) : null;

const REPORT_COLS =
  'id, org_id, author_id, team_id, title, ticker, visibility, shared_with, status, current_version, approved_version';

/**
 * POST /api/org/sonar/actions (Sonar for organizations, Nov 28 2026)
 *   { action: 'send_finding', confirmed: true, reportId, version?, findingId, recipients: [memberId], message? }
 *
 * The confirmed council writes Sonar supports. Governance actions (pitch stages, votes,
 * approvals, positions, trades) are refused here for everyone: they belong to the Pitch
 * Pipeline and the committee. Linking a report to a pitch and moving a report into review
 * keep their existing routes (/api/org/sonar-reports/[id]), which already check the author,
 * the reviewer and the status rules.
 */
const POST_HANDLER = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');
    const member = await getCurrentOrgMember(supabase).catch(() => null);
    if (!member || member.is_active === false)
      return NextResponse.json(
        { error: 'An active council membership is required.' },
        { status: 403 },
      );

    if (classify(action) === 'governance') {
      const res = authorizeAction(action, member, {});
      await audit({
        orgId: member.org_id,
        actorId: member.user_id,
        action: 'sonar_governance_refused',
        targetType: 'sonar',
        detail: { action },
      });
      return NextResponse.json({ error: res.reason }, { status: 403 });
    }
    if (action !== 'send_finding')
      return NextResponse.json(
        { error: 'This action is made from its own page (the report or the pitch).' },
        { status: 400 },
      );

    if (!UUID.test(String(body.reportId || '')))
      return NextResponse.json({ error: 'Unknown report.' }, { status: 400 });
    const { data: report } = await supabase
      .from('org_sonar_reports')
      .select(REPORT_COLS)
      .eq('org_id', member.org_id)
      .eq('id', body.reportId)
      .maybeSingle();
    if (!report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    const version = Number(body.version) || report.approved_version || report.current_version;
    const { data: ver } = await supabase
      .from('org_sonar_report_versions')
      .select('version, snapshot')
      .eq('org_id', member.org_id)
      .eq('report_id', report.id)
      .eq('version', version)
      .maybeSingle();
    const finding = (ver?.snapshot?.report?.keyFindings || []).find((f) => f.id === body.findingId);
    if (!finding)
      return NextResponse.json(
        { error: 'That finding is not in this report version.' },
        { status: 400 },
      );

    const ids = (Array.isArray(body.recipients) ? body.recipients : [])
      .filter((x) => UUID.test(String(x)))
      .slice(0, 25);
    const { data: recips } = ids.length
      ? await supabase
          .from('org_members')
          .select('id, user_id, org_id, role, team_id, is_active')
          .eq('org_id', member.org_id)
          .in('id', ids)
      : { data: [] };
    const overrides = await loadMemberOverrides(supabase, member.id).catch(() => []);
    const auth = authorizeAction('send_finding', member, {
      confirmed: body.confirmed === true,
      report,
      recipients:
        (recips || []).length === ids.length
          ? recips
          : [
              ...(recips || []),
              ...ids
                .filter((i) => !(recips || []).some((r) => r.id === i))
                .map(() => ({ org_id: null })),
            ],
      overrides,
    });
    if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 403 });

    const msg = findingMessage({
      report,
      version,
      finding,
      evidenceIds: finding.evidenceIds || finding.markers || [],
      author: member,
      message: body.message,
    });
    const inserts = (recips || []).map((r) => ({
      org_id: member.org_id,
      sender_member_id: member.id,
      recipient_member_id: r.id,
      ...msg,
    }));
    const { error } = await supabase.from('org_direct_messages').insert(inserts);
    if (error)
      return NextResponse.json({ error: 'The finding could not be sent.' }, { status: 500 });
    await audit({
      orgId: member.org_id,
      actorId: member.user_id,
      action: 'sonar_finding_sent',
      targetType: 'org_sonar_report',
      targetId: report.id,
      detail: { version, finding_id: finding.id || null, recipients: inserts.length },
    });
    return NextResponse.json({ ok: true, sent: inserts.length });
  },
  { requireAuth: true },
);

export const POST = withNoEmDash(POST_HANDLER);
