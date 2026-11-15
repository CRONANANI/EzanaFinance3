/**
 * GET /api/org/analytics/sample   sample content for Fund Analytics
 *
 * { sample: null } for every council member. Master admin and demo accounts
 * (the same check the Community page, the Command Center and the Trading Desk
 * use, on the verified session) get the sample bundle from
 * src/lib/org-fund-analytics-sample.js, so the page can be presented from a
 * council with little activity. Nothing is read from or written to council
 * records here beyond resolving the caller's own membership and rights, which
 * also keeps non-members out.
 *
 * The attention map and the data health block are only included for members
 * who can already see them on the live page (the same checks as
 * /api/org/analytics/attention and /api/org/fund-health).
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { memberHasPermission, loadMemberOverrides } from '@/lib/org-permissions-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { buildFundAnalyticsSample } from '@/lib/org-fund-analytics-sample';

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
    const overrides = await loadMemberOverrides(supabase, member.id);
    const canHealth = await memberHasPermission(supabase, member, 'view_analytics', overrides);
    const canAttention =
      canHealth ||
      (assertOrgRole(member, ['executive', 'portfolio_manager']) &&
        (await memberHasPermission(supabase, member, 'view_team_analytics', overrides)));
    return NextResponse.json(
      {
        sample: buildFundAnalyticsSample({
          userId: member.user_id,
          memberId: member.id,
          role: member.role,
          displayName: member.display_name,
          title: member.title || member.sub_role || null,
          subRole: member.sub_role || null,
          canAttention,
          canHealth,
        }),
      },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);
