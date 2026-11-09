/**
 * GET /api/community/me : what the Community sidebar and header need about the
 * caller: their username (My Profile), the people they follow, accepted
 * friends, and whether any message is waiting unread.
 */
import { NextResponse } from 'next/server';
import { withSession, PRIVATE } from '@/lib/community/route-session';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return withSession(request, 'me', async ({ user, supabase }) => {
    const [profile, following, friends, unread] = await Promise.all([
      supabase.from('public_profiles').select('username').eq('id', user.id).maybeSingle(),
      supabase
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', user.id),
      supabase
        .from('friend_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .neq('sender_id', user.id),
    ]);
    return NextResponse.json(
      {
        user_id: user.id,
        username: profile.data?.username || null,
        following: following.count || 0,
        friends: friends.count || 0,
        /* A missing table or column must not break the sidebar: no dot. */
        has_unread_messages: !unread.error && (unread.count || 0) > 0,
      },
      { headers: PRIVATE },
    );
  });
}
