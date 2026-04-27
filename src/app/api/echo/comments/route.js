import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseArticleId(bodyOrSearch, fromSearch = false) {
  if (fromSearch) {
    return String(bodyOrSearch.get('articleId') || bodyOrSearch.get('article_id') || '').trim();
  }
  return String(bodyOrSearch?.articleId ?? bodyOrSearch?.article_id ?? '').trim();
}

/**
 * GET /api/echo/comments?articleId=<slug>
 * POST /api/echo/comments  { articleId, content }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = parseArticleId(searchParams, true);
    if (!articleId) {
      return NextResponse.json({ error: 'articleId required' }, { status: 400 });
    }

    const { data: comments, error: commentsErr } = await supabaseAdmin
      .from('echo_article_comments')
      .select('id, user_id, content, created_at')
      .eq('article_id', articleId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(100);

    if (commentsErr) {
      console.error('[echo/comments GET] read failed:', commentsErr);
      return NextResponse.json({ error: 'Could not load comments' }, { status: 500 });
    }

    const userIds = [...new Set((comments || []).map((c) => c.user_id))];
    const authorsByUserId = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url, user_settings')
        .in('id', userIds);
      for (const p of profiles || []) {
        const name =
          (p.full_name && String(p.full_name).trim()) ||
          p.user_settings?.display_name ||
          'Reader';
        authorsByUserId[p.id] = {
          id: p.id,
          name,
          avatar_url: p.avatar_url || null,
          avatarUrl: p.avatar_url || null,
          initials:
            name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((s) => s[0]?.toUpperCase())
              .join('') || 'R',
        };
      }
    }

    const hydrated = (comments || []).map((c) => ({
      id: c.id,
      userId: c.user_id,
      content: c.content,
      createdAt: c.created_at,
      author: authorsByUserId[c.user_id] || {
        id: c.user_id,
        name: 'Reader',
        avatar_url: null,
        avatarUrl: null,
        initials: 'R',
      },
    }));

    return NextResponse.json({ comments: hydrated });
  } catch (err) {
    console.error('[echo/comments GET] unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Sign in to comment.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const articleId = parseArticleId(body);
    const content = String(body?.content || '').trim();

    if (!articleId) {
      return NextResponse.json({ error: 'articleId required' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    }
    if (content.length > 4000) {
      return NextResponse.json({ error: 'Comment too long (max 4000 chars)' }, { status: 400 });
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('echo_article_comments')
      .insert({
        user_id: user.id,
        article_id: articleId,
        content,
      })
      .select('id, user_id, content, created_at')
      .single();

    if (insertErr) {
      console.error('[echo/comments POST] insert failed:', insertErr);
      return NextResponse.json({ error: 'Could not post comment' }, { status: 500 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, avatar_url, user_settings')
      .eq('id', user.id)
      .maybeSingle();

    const name =
      profile?.full_name ||
      profile?.user_settings?.display_name ||
      user.email?.split('@')[0] ||
      'You';

    const initials =
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join('') || 'Y';

    return NextResponse.json({
      comment: {
        id: inserted.id,
        userId: inserted.user_id,
        content: inserted.content,
        createdAt: inserted.created_at,
        author: {
          id: user.id,
          name,
          avatar_url: profile?.avatar_url || null,
          avatarUrl: profile?.avatar_url || null,
          initials,
        },
      },
    });
  } catch (err) {
    console.error('[echo/comments POST] unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500 },
    );
  }
}
