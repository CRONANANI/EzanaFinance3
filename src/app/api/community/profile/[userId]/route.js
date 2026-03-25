import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';
import { isValidUuid } from '@/lib/uuid';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const userId = params.userId;
    if (!userId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    if (!isValidUuid(userId)) {
      return NextResponse.json(
        { error: 'Invalid profile link. Open a member from search or the leaderboard — names without an account use placeholder links only.' },
        { status: 400 }
      );
    }

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

    let badges = [];
    const { data: earnedBadges, error: badgeErr } = await supabaseAdmin
      .from('partner_badges')
      .select('badge_id, earned_at')
      .eq('partner_id', userId);

    if (!badgeErr && earnedBadges?.length) {
      const badgeIds = earnedBadges.map((b) => b.badge_id);
      const { data: defs } = await supabaseAdmin.from('badge_definitions').select('*').in('id', badgeIds);
      const earnedMap = Object.fromEntries(earnedBadges.map((b) => [b.badge_id, b.earned_at]));
      badges = (defs || []).map((d) => ({
        id: d.id,
        name: d.badge_name,
        icon: d.badge_icon,
        description: d.badge_description,
        category: d.badge_category,
        earnedAt: earnedMap[d.id] || null,
      }));
    }

    let likesGiven = 0;
    const { count: lc, error: likeErr } = await supabaseAdmin
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (!likeErr) likesGiven = lc || 0;

    const strategiesRaw = settings.investment_strategies;
    const strategies = Array.isArray(strategiesRaw)
      ? strategiesRaw
      : typeof strategiesRaw === 'string' && strategiesRaw.trim()
        ? strategiesRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    const favoriteTools = settings.favorite_research_tools;
    const favoriteResearchTools = Array.isArray(favoriteTools)
      ? favoriteTools
      : typeof favoriteTools === 'string' && favoriteTools.trim()
        ? favoriteTools.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

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
        likes_given: likesGiven || 0,
      },
      badges,
      performance:
        settings.privacy_show_portfolio === true
          ? {
              return_pct: settings.portfolio_return_pct ?? null,
              total_trades: settings.portfolio_total_trades ?? null,
              win_rate: settings.portfolio_win_rate ?? null,
              best_stock: settings.portfolio_best_stock ?? null,
            }
          : null,
      strategies,
      courses: [],
      favorite_research_tools: favoriteResearchTools.slice(0, 6),
    });
  } catch (e) {
    console.error('profile API', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
