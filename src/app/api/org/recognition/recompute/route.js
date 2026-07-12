import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { recomputeOrg, recomputeMemberRating } from '@/lib/org-rating-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/* POST /api/org/recognition/recompute — recompute Ezana Ratings from real
   resolved-thesis (org_pitch_hindsight) rows. Manager-only. Idempotent.
   Body: { memberId? } — optional single member (org_members.id); otherwise all. */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      /* no body → recompute all */
    }

    try {
      if (body?.memberId) {
        const { data: target } = await supabase
          .from('org_members')
          .select('id, user_id, role, sub_role, display_name')
          .eq('org_id', member.org_id)
          .eq('id', body.memberId)
          .maybeSingle();
        if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        const result = await recomputeMemberRating(supabase, member.org_id, target);
        return NextResponse.json({
          results: [{ member_id: target.id, display_name: target.display_name, ...result }],
        });
      }
      const results = await recomputeOrg(supabase, member.org_id);
      return NextResponse.json({ results, count: results.length });
    } catch (err) {
      return NextResponse.json({ error: err?.message || 'Recompute failed' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
