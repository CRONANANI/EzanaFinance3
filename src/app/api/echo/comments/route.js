import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function buildAuthorFromProfile(profile, userId) {
  if (!profile) {
    return {
      id: userId,
      name: 'User',
      initials: 'U',
      avatarUrl: null,
    };
  }
  const settings = profile.user_settings && typeof profile.user_settings === 'object' ? profile.user_settings : {};
  const fromSettings =
    typeof settings.display_name === 'string' ? settings.display_name.trim() : '';
  const name =
    (profile.full_name && String(profile.full_name).trim()) ||
    (profile.display_name && String(profile.display_name).trim()) ||
    fromSettings ||
    (profile.username && String(profile.username).trim()) ||
    (profile.email && String(profile.email).split('@')[0]) ||
    'User';
  const parts = name.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return {
    id: userId,
    name,
    initials: initials.slice(0, 2),
    avatarUrl: profile.avatar_url || null,
  };
}

/**
 * GET /api/echo/comments?article_id=<slug>
 * Returns: { comments: Comment[] }
 *
 * Public endpoint — anyone can read non-deleted comments.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const article_id = String(searchParams.get('article_id') || '').trim();
    if (!article_id) {
      return NextResponse.json({ error: 'article_id required' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data: comments, error } = await supabase
      .from('echo_article_comments')
      .select('id, user_id, content, created_at, updated_at')
      .eq('article_id', article_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = Array.from(new Set((comments || []).map((c) => c.user_id)));
    let profiles = {};
    if (userIds.length > 0) {
      const { data: profileRows } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, display_name, username, avatar_url, user_settings')
        .in('id', userIds);
      profiles = Object.fromEntries((profileRows || []).map((p) => [p.id, p]));
    }

    const hydrated = (comments || []).map((c) => {
      const profile = profiles[c.user_id];
      const author = buildAuthorFromProfile(profile, c.user_id);
      return {
        id: c.id,
        userId: c.user_id,
        author,
        content: c.content,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
    });

    return NextResponse.json({ comments: hydrated });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

/**
 * POST /api/echo/comments
 * Body: { article_id: string, content: string }
 * Returns: { comment: Comment }
 *
 * Authenticated. The new comment is returned with author info already hydrated
 * so the client can append it directly to the comment list.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const article_id = String(body?.article_id || '').trim();
    const content = String(body?.content || '').trim();

    if (!article_id) {
      return NextResponse.json({ error: 'article_id required' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'content required' }, { status: 400 });
    }
    if (content.length > 4000) {
      return NextResponse.json({ error: 'Comment too long (max 4000 chars)' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: inserted, error } = await supabase
      .from('echo_article_comments')
      .insert({ article_id, user_id: user.id, content })
      .select('id, user_id, content, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, display_name, username, avatar_url, user_settings')
      .eq('id', user.id)
      .maybeSingle();

    const author = buildAuthorFromProfile(profile, user.id);

    return NextResponse.json({
      comment: {
        id: inserted.id,
        userId: inserted.user_id,
        author: {
          id: inserted.user_id,
          name: 'You',
          initials: author.initials,
          avatarUrl: author.avatarUrl,
        },
        content: inserted.content,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
