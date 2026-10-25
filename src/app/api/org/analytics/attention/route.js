import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { memberHasPermission, loadMemberOverrides } from '@/lib/org-permissions-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Hard privacy floor mirrored from the org-interest-aggregates cron. Rows are
// already k-anonymized at write time; we re-assert it on read as defence in
// depth in case the cron floor is ever loosened.
const K_MIN = 3;

/**
 * GET /api/org/analytics/attention — the org "attention map": what topics the
 * team is collectively paying attention to, grouped by taxonomy dimension.
 *
 * view_analytics, or a manager with view_team_analytics. Every returned row already
 * represents at least K distinct members (k-anonymous), so no individual's
 * interests are exposed; the manager gate is an additional need-to-know limit.
 */
export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    // ORG-7: org-wide view_analytics (executive default, grantable), or a
    // manager holding view_team_analytics.
    const overrides = await loadMemberOverrides(supabase, member.id);
    const allowed =
      (await memberHasPermission(supabase, member, 'view_analytics', overrides)) ||
      (assertOrgRole(member, ['executive', 'portfolio_manager']) &&
        (await memberHasPermission(supabase, member, 'view_team_analytics', overrides)));
    if (!allowed) {
      return NextResponse.json({ error: 'Analytics access required' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('org_interest_aggregates')
      .select('dimension, value, score, member_count, computed_at')
      .eq('org_id', member.org_id)
      .gte('member_count', K_MIN)
      .order('score', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Group by dimension for the client (already score-sorted).
    const dimensions = {};
    let computedAt = null;
    for (const row of data || []) {
      (dimensions[row.dimension] ||= []).push({
        value: row.value,
        score: Number(row.score),
        memberCount: row.member_count,
      });
      if (!computedAt && row.computed_at) computedAt = row.computed_at;
    }

    return NextResponse.json({
      orgId: member.org_id,
      k: K_MIN,
      computedAt,
      dimensions,
    });
  },
  { requireAuth: true },
);
