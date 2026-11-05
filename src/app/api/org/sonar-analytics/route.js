import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { WINDOWS, computeAnalytics, ownView } from '@/lib/org-sonar/analytics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/org/sonar-analytics?days=30|90|365|all
 * Sonar Analytics for the caller's org (lib/org-sonar/analytics.js).
 * Executives and portfolio managers see every member; anyone else sees
 * their own line and the fund's coverage. Counts only: no report content
 * is returned, so a private draft is never exposed by this route.
 */
export const GET = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!isServerSupabaseConfigured())
      return NextResponse.json({ error: 'Not available.' }, { status: 503 });
    const admin = getAdminClient();
    const raw = new URL(request.url).searchParams.get('days');
    const days = raw === 'all' ? null : WINDOWS.includes(Number(raw)) ? Number(raw) : 90;
    const orgId = member.org_id;

    const [members, reports, runs, pitches, positions] = await Promise.all([
      admin
        .from('org_members')
        .select('user_id, display_name, role, team_id, is_active')
        .eq('org_id', orgId)
        .eq('is_active', true),
      admin
        .from('org_sonar_reports')
        .select(
          'id, author_id, kind, status, ticker, sector, pitch_id, challenge_of, current_version, approved_version, submitted_at, approved_at, summary, created_at',
        )
        .eq('org_id', orgId)
        .limit(5000),
      admin
        .from('sonar_research_runs')
        .select('user_id, depth, status, created_at')
        .eq('org_id', orgId)
        .limit(20000),
      admin.from('org_pitches').select('id, stage, sector, ticker').eq('org_id', orgId),
      admin.from('org_positions').select('ticker, sector').eq('org_id', orgId).limit(500),
    ]);
    if (reports.error)
      return NextResponse.json({ error: 'Sonar Analytics is not set up yet.' }, { status: 503 });
    const ids = (reports.data || []).map((r) => r.id);
    const comments = ids.length
      ? await admin
          .from('org_sonar_report_comments')
          .select('report_id, author_id, resolved, created_at')
          .eq('org_id', orgId)
          .limit(20000)
      : { data: [] };

    const tickerSectors = {};
    for (const p of [...(positions.data || []), ...(pitches.data || [])]) {
      if (p.ticker && p.sector) tickerSectors[String(p.ticker).toUpperCase()] = p.sector;
    }
    const result = computeAnalytics({
      members: members.data || [],
      reports: reports.data || [],
      comments: comments.data || [],
      runs: runs.error ? [] : runs.data || [],
      pitches: pitches.data || [],
      tickerSectors,
      days,
    });
    const manager = assertOrgRole(member, ['executive', 'portfolio_manager']);
    return NextResponse.json({
      ...(manager ? result : ownView(result, member.user_id)),
      viewer: { userId: member.user_id, seesEveryone: manager },
    });
  },
  { requireAuth: true },
);
