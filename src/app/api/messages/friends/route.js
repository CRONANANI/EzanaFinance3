/**
 * GET /api/messages/friends
 * Returns a list of the authenticated user's friends (mutual followers)
 * who can be messaged. Each entry includes the friend's user ID, display
 * name, and whether a conversation already exists.
 */
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: following } = await supabaseAdmin
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = (following || []).map((r) => r.following_id);
    if (followingIds.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    const { data: mutuals } = await supabaseAdmin
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', user.id)
      .in('follower_id', followingIds);

    const friendIds = (mutuals || []).map((r) => r.follower_id);
    if (friendIds.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, user_settings')
      .in('id', friendIds);

    const { data: existingConvos } = await supabaseAdmin
      .from('conversations')
      .select('id, participant_a, participant_b')
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`);

    const convoByFriend = new Map();
    for (const c of existingConvos || []) {
      const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a;
      if (friendIds.includes(otherId)) {
        convoByFriend.set(otherId, c.id);
      }
    }

    const friends = (profiles || [])
      .map((p) => {
        const displayName =
          (p.full_name || p.user_settings?.display_name || '').trim() || 'Member';
        return {
          id: p.id,
          name: displayName,
          conversation_id: convoByFriend.get(p.id) || null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ friends });
  } catch (e) {
    console.error('[messages/friends GET] exception:', e?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
