import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/competition-badges?member_id=… — competition trophies for an org
   member (defaults to the caller). RLS lets same-org members read each other's. */
export const GET = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    let memberId = member.id;
    try {
      memberId = new URL(request.url).searchParams.get('member_id') || member.id;
    } catch {
      memberId = member.id;
    }

    const { data, error } = await supabase
      .from('org_competition_badges')
      .select('id, badge_key, placement, role_at_event, competition_name, host_org_name, awarded_at')
      .eq('org_member_id', memberId)
      .order('awarded_at', { ascending: false });
    if (error) return NextResponse.json({ badges: [] });
    return NextResponse.json({ badges: data || [] });
  },
  { requireAuth: true },
);
