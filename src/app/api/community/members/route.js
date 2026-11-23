/**
 * GET /api/community/members?q=&offset=: the Members directory (Nov 23, 2026).
 * Public profile fields only (public_profiles: never email, holdings or
 * organization membership), whether the caller follows each member, and
 * their community activity over the last 30 days. 24 a page.
 */
import { NextResponse } from 'next/server';
import { withSession, PRIVATE } from '@/lib/community/route-session';
import { displayNameOf } from '@/lib/community/redesign';

export const dynamic = 'force-dynamic';
const PAGE = 24;

export async function GET(request) {
  return withSession(request, 'members', async ({ user, supabase }) => {
    const sp = new URL(request.url).searchParams;
    const q = String(sp.get('q') || '')
      .trim()
      .slice(0, 60)
      .replace(/[%_,()]/g, ' ');
    const offset = Math.max(0, parseInt(sp.get('offset') || '0', 10) || 0);
    let query = supabase
      .from('public_profiles')
      .select(
        'id, username, display_name, full_name, avatar_url, bio, is_partner, partner_type, investor_type, created_at',
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (q.length >= 2) {
      const like = `%${q}%`;
      query = query.or(`username.ilike.${like},display_name.ilike.${like},full_name.ilike.${like}`);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (data || []).filter((p) => p.id !== user.id || q.length >= 2);
    const ids = rows.map((p) => p.id);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [follows, posts] = ids.length
      ? await Promise.all([
          supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', user.id)
            .in('following_id', ids),
          supabase
            .from('community_posts')
            .select('user_id')
            .in('user_id', ids)
            .gte('created_at', since)
            .is('moderation_hidden_at', null)
            .limit(5000),
        ])
      : [{ data: [] }, { data: [] }];
    const following = new Set((follows.data || []).map((f) => f.following_id));
    const activity = new Map();
    for (const p of posts.data || []) activity.set(p.user_id, (activity.get(p.user_id) || 0) + 1);
    return NextResponse.json(
      {
        members: rows.map((p) => ({
          id: p.id,
          name: displayNameOf(p),
          username: p.username || null,
          avatar_url: p.avatar_url || null,
          bio: String(p.bio || '').slice(0, 160),
          role: p.is_partner ? p.partner_type || 'Partner' : p.investor_type || null,
          is_partner: Boolean(p.is_partner),
          posts_30d: activity.get(p.id) || 0,
          following: following.has(p.id),
          is_me: p.id === user.id,
        })),
        next: (data || []).length === PAGE ? offset + PAGE : null,
      },
      { headers: PRIVATE },
    );
  });
}
