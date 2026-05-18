import { NextResponse } from 'next/server';
import { requireUser, getCurrentUser, getUserClient, getAdminClient } from '@/lib/supabase';
import { awardXP } from '@/lib/rewards';
import { sanitizeInput } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

const admin = getAdminClient();

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
    username: prof.username || '',
    display_name: settings.display_name || '',
    bio: settings.bio || '',
    avatar_url: settings.avatar_url || '',
  };
}

function engagementScore(p) {
  return (p.likes_count || 0) + (p.comments_count || 0) + (p.reposts_count || 0);
}

async function buildEnrichedResponse(supabase, user, list) {
  const userIds = [...new Set(list.map((p) => p.user_id))];

  let profileMap = {};
  if (userIds.length > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, username, user_settings')
      .in('id', userIds);
    profileMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  }

  const postIds = list.map((p) => p.id);

  let likedSet = new Set();
  let savedSet = new Set();
  let votedMap = {};
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

    const { data: votes } = await supabase
      .from('poll_votes')
      .select('post_id, option_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);
    votedMap = Object.fromEntries((votes || []).map((v) => [v.post_id, v.option_id]));
  }

  const enrichedPosts = list.map((post) => ({
    ...post,
    author: mapAuthor(profileMap[post.user_id], user?.id),
    liked_by_me: likedSet.has(post.id),
    saved_by_me: savedSet.has(post.id),
    my_vote: votedMap[post.id] ?? null,
  }));

  return NextResponse.json({ posts: enrichedPosts });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawTab = (searchParams.get('tab') || 'recent').toLowerCase();
    const tab = rawTab === 'latest' ? 'recent' : rawTab;
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));

    const supabase = getUserClient();
    const user = await getCurrentUser(request);

    const from = page * LIMIT;
    const to = from + LIMIT - 1;

    const selectCols =
      'id, user_id, content, mentioned_ticker, image_url, poll_data, ticker_embed, likes_count, comments_count, reposts_count, created_at';

    /** Popular / trending: sort by likes + comments + reposts (batched then sliced) */
    if (tab === 'trending' || tab === 'popular') {
      const { data: batch, error } = await supabase
        .from('community_posts')
        .select(selectCols)
        .is('parent_post_id', null)
        .limit(500);

      if (error) {
        console.error('Fetch posts error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const sorted = [...(batch || [])].sort((a, b) => engagementScore(b) - engagementScore(a));
      const list = sorted.slice(from, from + LIMIT);
      return await buildEnrichedResponse(supabase, user, list);
    }

    let query = supabase.from('community_posts').select(selectCols).is('parent_post_id', null);

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
      const authorIds = [...new Set([...followingIds, user.id])];
      query = query.in('user_id', authorIds);
    } else if (tab === 'friends' && user) {
      const [{ data: outRows }, { data: inRows }] = await Promise.all([
        supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
        supabase.from('user_follows').select('follower_id').eq('following_id', user.id),
      ]);
      const followingSet = new Set((outRows || []).map((r) => r.following_id));
      const followerSet = new Set((inRows || []).map((r) => r.follower_id));
      const mutualIds = [...followingSet].filter((id) => followerSet.has(id));
      if (mutualIds.length === 0) {
        return NextResponse.json({
          posts: [],
          message: 'No posts from friends yet',
        });
      }
      const authorIds = [...new Set([...mutualIds, user.id])];
      query = query.in('user_id', authorIds);
    } else if (tab === 'friends' && !user) {
      return NextResponse.json({ posts: [], message: "Sign in to see friends' posts" });
    } else if (tab === 'my-posts' && user) {
      query = query.eq('user_id', user.id);
    } else if (tab === 'my-posts' && !user) {
      return NextResponse.json({ posts: [], message: 'Sign in to see your posts' });
    } else if (tab === 'following' && !user) {
      return NextResponse.json({
        posts: [],
        message: 'Sign in to see posts from people you follow',
      });
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: posts, error } = await query;

    if (error) {
      console.error('Fetch posts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = posts || [];
    return await buildEnrichedResponse(supabase, user, list);
  } catch (error) {
    console.error('GET posts:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const content = sanitizeInput(typeof body.content === 'string' ? body.content : '');
    const mentioned_ticker = body.mentioned_ticker
      ? String(body.mentioned_ticker).slice(0, 8)
      : null;
    const parent_post_id =
      typeof body.parent_post_id === 'string' && body.parent_post_id.length > 0
        ? body.parent_post_id
        : null;

    const image_url =
      typeof body.image_url === 'string' && body.image_url.startsWith('http')
        ? body.image_url
        : null;

    let poll_data = null;
    if (body.poll_data && typeof body.poll_data === 'object') {
      const q = sanitizeInput(String(body.poll_data.question || '').trim());
      const opts = Array.isArray(body.poll_data.options) ? body.poll_data.options : [];
      if (q && opts.length >= 2 && opts.length <= 6) {
        poll_data = {
          question: q.slice(0, 200),
          options: opts.slice(0, 6).map((o, i) => ({
            id: `opt_${i}`,
            label: sanitizeInput(String(o.label || o).slice(0, 100)),
            votes: 0,
          })),
          total_votes: 0,
          ends_at: null,
        };
      }
    }

    let ticker_embed = null;
    if (body.ticker_embed && typeof body.ticker_embed === 'object') {
      const period = ['1D', '1W', '1M', '3M', '1Y'].includes(body.ticker_embed.period)
        ? body.ticker_embed.period
        : '1M';
      const symbols = [];
      if (Array.isArray(body.ticker_embed.symbols)) {
        for (const s of body.ticker_embed.symbols.slice(0, 3)) {
          const sym = String(s?.symbol || '')
            .toUpperCase()
            .trim();
          if (!sym) continue;
          const hp =
            typeof s.highlight_price === 'number' && Number.isFinite(s.highlight_price)
              ? s.highlight_price
              : null;
          symbols.push({ symbol: sym, highlight_price: hp });
        }
      } else if (body.ticker_embed.symbol) {
        const sym = String(body.ticker_embed.symbol).toUpperCase().trim();
        const hp =
          typeof body.ticker_embed.highlight_price === 'number' &&
          Number.isFinite(body.ticker_embed.highlight_price)
            ? body.ticker_embed.highlight_price
            : null;
        if (sym) symbols.push({ symbol: sym, highlight_price: hp });
      }
      if (symbols.length) {
        ticker_embed = { period, symbols };
      }
    }

    const isComment = !!parent_post_id;
    const hasAttachment = !!(image_url || poll_data || ticker_embed);
    if (isComment && !content.trim()) {
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 });
    }
    if (!isComment && !content.trim() && !hasAttachment) {
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 });
    }

    const maxLen = isComment ? 500 : 1000;
    if (content.length > maxLen) {
      return NextResponse.json(
        {
          error: isComment
            ? `Comment must be under ${maxLen} characters`
            : `Post must be under ${maxLen} characters`,
        },
        { status: 400 },
      );
    }

    let parentPostForNotif = null;
    if (isComment) {
      const { data: parent, error: pErr } = await admin
        .from('community_posts')
        .select('id, parent_post_id, user_id')
        .eq('id', parent_post_id)
        .maybeSingle();
      if (pErr || !parent || parent.parent_post_id != null) {
        return NextResponse.json({ error: 'Parent post not found' }, { status: 400 });
      }
      parentPostForNotif = parent;
    }

    const { user, client: supabase } = await requireUser(request);

    const { data: post, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: user.id,
        content: content.trim(),
        mentioned_ticker: isComment ? null : mentioned_ticker || null,
        parent_post_id: parent_post_id || null,
        image_url: isComment ? null : image_url,
        poll_data: isComment ? null : poll_data,
        ticker_embed: isComment ? null : ticker_embed,
      })
      .select(
        'id, user_id, content, mentioned_ticker, image_url, poll_data, ticker_embed, likes_count, comments_count, reposts_count, created_at, parent_post_id',
      )
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

    if (isComment && parentPostForNotif?.user_id && parentPostForNotif.user_id !== user.id) {
      // ── Notify parent post author of comment ──
      try {
        const { data: authorPref } = await admin
          .from('user_interest_profiles')
          .select('notification_prefs')
          .eq('user_id', parentPostForNotif.user_id)
          .maybeSingle();
        const prefs = authorPref?.notification_prefs || {};
        if (prefs.community_interactions !== false) {
          let commenterName = 'Someone';
          const { data: cProfile } = await admin
            .from('profiles')
            .select('full_name, user_settings')
            .eq('id', user.id)
            .maybeSingle();
          if (cProfile) {
            commenterName =
              (cProfile.full_name || cProfile.user_settings?.display_name || '').trim() ||
              'Someone';
          }

          const commentContent = content.trim();
          await admin.from('user_notifications').insert({
            user_id: parentPostForNotif.user_id,
            type: 'community',
            title: `${commenterName} commented on your post`,
            content: `${commentContent.slice(0, 80)}${commentContent.length > 80 ? '…' : ''}`,
          });
        }
      } catch (notifErr) {
        console.error('[comment] notification insert:', notifErr);
      }
    }

    const { data: prof } = await admin
      .from('profiles')
      .select('id, username, user_settings')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({
      post: {
        ...post,
        author: mapAuthor(prof, user.id),
        liked_by_me: false,
        saved_by_me: false,
        my_vote: null,
      },
    });
  } catch (error) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST posts:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const post_id = typeof body.post_id === 'string' ? body.post_id : null;
    const option_id = typeof body.option_id === 'string' ? body.option_id : null;

    if (!post_id || !option_id) {
      return NextResponse.json({ error: 'post_id and option_id required' }, { status: 400 });
    }

    const { user } = await requireUser(request);

    const { data: row } = await admin
      .from('community_posts')
      .select('poll_data')
      .eq('id', post_id)
      .maybeSingle();

    if (!row?.poll_data) {
      return NextResponse.json({ error: 'Post has no poll' }, { status: 400 });
    }

    const { data: existingVote } = await admin
      .from('poll_votes')
      .select('option_id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const pd = {
      ...row.poll_data,
      options: (row.poll_data.options || []).map((o) => ({ ...o })),
    };

    if (existingVote) {
      const oldOpt = pd.options.find((o) => o.id === existingVote.option_id);
      if (oldOpt) oldOpt.votes = Math.max(0, (oldOpt.votes || 0) - 1);
      pd.total_votes = Math.max(0, (pd.total_votes || 0) - 1);
      await admin.from('poll_votes').delete().eq('post_id', post_id).eq('user_id', user.id);
    }

    const newOpt = pd.options.find((o) => o.id === option_id);
    if (!newOpt) return NextResponse.json({ error: 'Invalid option' }, { status: 400 });
    newOpt.votes = (newOpt.votes || 0) + 1;
    pd.total_votes = (pd.total_votes || 0) + 1;

    const { error: insErr } = await admin
      .from('poll_votes')
      .insert({ post_id, user_id: user.id, option_id });
    if (insErr) {
      console.error('poll_votes insert:', insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const { error: updErr } = await admin
      .from('community_posts')
      .update({ poll_data: pd })
      .eq('id', post_id);
    if (updErr) {
      console.error('community_posts poll update:', updErr);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ poll_data: pd, my_vote: option_id });
  } catch (err) {
    if (err?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
