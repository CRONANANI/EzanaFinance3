import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const userId = params.userId;
    if (!userId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

    const supabase = createServerSupabase();
    const {
      data: { user: viewer },
    } = await supabase.auth.getUser();

    const { data: profileRow, error } = await supabaseAdmin
      .from('profiles')
      .select('id, user_settings, email')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profileRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const settings = profileRow.user_settings || {};
    const privacyPublic = settings.privacy_show_profile !== false;
    const isViewer = viewer?.id === userId;
    if (!privacyPublic && !isViewer) {
      return NextResponse.json({ error: 'Profile is private' }, { status: 403 });
    }

    const { count: followerCount } = await supabaseAdmin
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    const { count: followingCount } = await supabaseAdmin
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    const { count: postCount } = await supabaseAdmin
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('parent_post_id', null);

    let isFollowing = false;
    if (viewer && viewer.id !== userId) {
      const { data: fr } = await supabaseAdmin
        .from('user_follows')
        .select('id')
        .eq('follower_id', viewer.id)
        .eq('following_id', userId)
        .maybeSingle();
      isFollowing = !!fr;
    }

    return NextResponse.json({
      profile: {
        id: profileRow.id,
        display_name: settings.display_name || '',
        bio: settings.bio || '',
        avatar_url: settings.avatar_url || '',
        privacy_show_portfolio: settings.privacy_show_portfolio === true,
        privacy_show_trades: settings.privacy_show_trades === true,
        privacy_show_holdings: settings.privacy_show_holdings === true,
        privacy_show_activity: settings.privacy_show_activity !== false,
        privacy_show_watchlist: settings.privacy_show_watchlist === true,
        privacy_show_on_leaderboard: settings.privacy_show_on_leaderboard !== false,
      },
      viewer: viewer ? { id: viewer.id, is_owner: viewer.id === userId } : null,
      is_followed_by_viewer: isFollowing,
      counts: {
        followers: followerCount || 0,
        following: followingCount || 0,
        posts: postCount || 0,
      },
    });
  } catch (e) {
    console.error('profile API', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
