import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';
import { awardXP } from '@/lib/rewards';

export const dynamic = 'force-dynamic';

const LIMIT = 20;

function mapAuthor(prof, viewerId) {
  if (!prof) return null;
  const settings = prof.user_settings || {};
  const isPublic = settings.privacy_show_profile !== false;
  const isOwner = viewerId && prof.id === viewerId;
  if (!isPublic && !isOwner) {
    return {
      id: prof.id,
      display_name: 'Member',
      bio: '',
      avatar_url: '',
    };
  }
  return {
    id: prof.id,
    display_name: settings.display_name || '',
    bio: settings.bio || '',
    avatar_url: settings.avatar_url || '',
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'trending';
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from('community_posts')
      .select(
        'id, user_id, content, mentioned_ticker, likes_count, comments_count, reposts_count, created_at'
      )
      .is('parent_post_id', null);

    if (tab === 'following' && user) {
      const { data: followingRows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);
      const followingIds = followingRows?.map((f) => f.following_id) || [];
      if (followingIds.length === 0) {
        return NextResponse.json({
          posts: [],
          message: 'Follow users to see their posts',
        });
      }
      query = query.in('user_id', followingIds);
    } else if (tab === 'my-posts' && user) {
      query = query.eq('user_id', user.id);
    } else if (tab === 'my-posts' && !user) {
      return NextResponse.json({ posts: [], message: 'Sign in to see your posts' });
    } else if (tab === 'following' && !user) {
      return NextResponse.json({ posts: [], message: 'Sign in to see posts from people you follow' });
    }

    if (tab === 'trending') {
      query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const from = page * LIMIT;
    const to = from + LIMIT - 1;
    query = query.range(from, to);

    const { data: posts, error } = await query;

    if (error) {
      console.error('Fetch posts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = posts || [];
    const userIds = [...new Set(list.map((p) => p.user_id))];

    let profileMap = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin.from('profiles').select('id, user_settings').in('id', userIds);
      profileMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    }

    const postIds = list.map((p) => p.id);

    let likedSet = new Set();
    let savedSet = new Set();
    if (user && postIds.length > 0) {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);
      const { data: saves } = await supabase
        .from('post_saves')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);
      likedSet = new Set((likes || []).map((l) => l.post_id));
      savedSet = new Set((saves || []).map((s) => s.post_id));
    }

    const enrichedPosts = list.map((post) => ({
      ...post,
      author: mapAuthor(profileMap[post.user_id], user?.id),
      liked_by_me: likedSet.has(post.id),
      saved_by_me: savedSet.has(post.id),
    }));

    return NextResponse.json({ posts: enrichedPosts });
  } catch (error) {
    console.error('GET posts:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content : '';
    const mentioned_ticker = body.mentioned_ticker ? String(body.mentioned_ticker).slice(0, 8) : null;
    const parent_post_id =
      typeof body.parent_post_id === 'string' && body.parent_post_id.length > 0 ? body.parent_post_id : null;

    if (!content.trim()) {
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 });
    }

    const isComment = !!parent_post_id;
    const maxLen = isComment ? 500 : 1000;
    if (content.length > maxLen) {
      return NextResponse.json(
        { error: isComment ? `Comment must be under ${maxLen} characters` : `Post must be under ${maxLen} characters` },
        { status: 400 }
      );
    }

    if (isComment) {
      const { data: parent, error: pErr } = await supabaseAdmin
        .from('community_posts')
        .select('id, parent_post_id')
        .eq('id', parent_post_id)
        .maybeSingle();
      if (pErr || !parent || parent.parent_post_id != null) {
        return NextResponse.json({ error: 'Parent post not found' }, { status: 400 });
      }
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: post, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: user.id,
        content: content.trim(),
        mentioned_ticker: isComment ? null : mentioned_ticker || null,
        parent_post_id: parent_post_id || null,
      })
      .select('id, user_id, content, mentioned_ticker, likes_count, comments_count, reposts_count, created_at, parent_post_id')
      .single();

    if (error) {
      console.error('Insert post error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      if (isComment) {
        await awardXP(user.id, 10, 'Commented on a community post', 'community');
      } else {
        await awardXP(user.id, 15, 'Made a community post', 'community');
      }
    } catch (e) {
      console.error('posts POST: awardXP', e);
    }

    const { data: prof } = await supabaseAdmin.from('profiles').select('id, user_settings').eq('id', user.id).maybeSingle();

    return NextResponse.json({
      post: {
        ...post,
        author: mapAuthor(prof, user.id),
        liked_by_me: false,
        saved_by_me: false,
      },
    });
  } catch (error) {
    console.error('POST posts:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
