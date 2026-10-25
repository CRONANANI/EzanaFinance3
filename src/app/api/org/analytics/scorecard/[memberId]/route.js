import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { memberHasPermission, loadMemberOverrides } from '@/lib/org-permissions-server';
import { analystScorecard } from '@/lib/org-attribution';
import { getGovernance } from '@/lib/org-governance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/analytics/scorecard/:memberId — one analyst's scorecard.
   Own = always; PM with view_team_analytics = own team; view_analytics
   (executive default) = anyone. 403 otherwise. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { memberId } = await resolveParams(context);

    // Resolve the requested member (must be in the same org).
    const { data: target } = await supabase
      .from('org_members')
      .select('id, team_id')
      .eq('id', memberId)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    // ORG-7: org-wide reads need view_analytics (executive default, grantable);
    // a PM's same-team reads need view_team_analytics.
    const isSelf = target.id === member.id;
    const overrides = isSelf ? [] : await loadMemberOverrides(supabase, member.id);
    const canViewAll =
      !isSelf && (await memberHasPermission(supabase, member, 'view_analytics', overrides));
    const isPmSameTeam =
      !isSelf &&
      member.role === 'portfolio_manager' &&
      target.team_id &&
      target.team_id === member.team_id &&
      (await memberHasPermission(supabase, member, 'view_team_analytics', overrides));

    let allowed = isSelf || canViewAll || isPmSameTeam;
    // Governance: analysts may view peers' scorecards only when the advisor has
    // enabled `students_see_peer_scorecards` (off by default for privacy).
    if (!allowed) {
      const gov = await getGovernance(supabase, member.org_id);
      if (gov.students_see_peer_scorecards) allowed = true;
    }
    if (!allowed) {
      return NextResponse.json({ error: 'You can only view your own scorecard.' }, { status: 403 });
    }

    const scorecard = await analystScorecard(supabase, member.org_id, memberId);
    if (!scorecard) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    return NextResponse.json({ scorecard });
  },
  { requireAuth: true },
);
