/** GET /api/community/people: People to Follow (community_people_to_follow). */
import { NextResponse } from 'next/server';
import { withSession, PRIVATE } from '@/lib/community/route-session';
import { displayNameOf } from '@/lib/community/redesign';
import { isCommunityDemoViewer, DEMO_PEOPLE } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return withSession(request, 'people', async ({ user, supabase }) => {
    if (isCommunityDemoViewer(user)) {
      return NextResponse.json({ rows: DEMO_PEOPLE }, { headers: PRIVATE });
    }
    const { data, error } = await supabase.rpc('community_people_to_follow', { p_limit: 2 });
    if (error) throw new Error(error.message);
    const rows = (data || []).map((r) => ({
      user_id: r.user_id,
      name: displayNameOf(r),
      username: r.username || null,
      avatar_url: r.avatar_url || null,
      type: r.investor_type || r.partner_type || (r.is_partner ? 'Partner' : 'Investor'),
      is_partner: Boolean(r.is_partner),
      followers: Number(r.follower_count) || 0,
    }));
    return NextResponse.json({ rows }, { headers: PRIVATE });
  });
}
