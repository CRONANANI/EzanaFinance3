/** GET /api/community/discussions: the Active Discussions card (community_active_discussions). */
import { NextResponse } from 'next/server';
import { withSession, PRIVATE } from '@/lib/community/route-session';
import { isCommunityDemoViewer, DEMO_DISCUSSIONS } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';
const BADGES = ['hot', 'rising', 'popular'];

export async function GET(request) {
  return withSession(request, 'discussions', async ({ user, supabase }) => {
    if (isCommunityDemoViewer(user)) {
      return NextResponse.json({ rows: DEMO_DISCUSSIONS }, { headers: PRIVATE });
    }
    const { data, error } = await supabase.rpc('community_active_discussions', { p_limit: 3 });
    if (error) throw new Error(error.message);
    const rows = (data || []).map((r) => ({
      post_id: r.post_id,
      title: r.title || 'Untitled discussion',
      replies: Number(r.reply_count) || 0,
      badge: BADGES.includes(String(r.badge || '').toLowerCase())
        ? String(r.badge).toLowerCase()
        : 'popular',
    }));
    return NextResponse.json({ rows }, { headers: PRIVATE });
  });
}
