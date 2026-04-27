import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function articleIdFromRequest(request) {
  const { searchParams } = new URL(request.url);
  return String(
    searchParams.get('articleId') || searchParams.get('article_id') || '',
  ).trim();
}

/**
 * GET /api/echo/engagement?articleId=<slug>
 */
export async function GET(request) {
  try {
    const articleId = articleIdFromRequest(request);
    if (!articleId) {
      return NextResponse.json({ error: 'articleId required' }, { status: 400 });
    }

    const [{ count: likeCount }, { count: commentCount }] = await Promise.all([
      supabaseAdmin
        .from('echo_article_likes')
        .select('id', { count: 'exact', head: true })
        .eq('article_id', articleId),
      supabaseAdmin
        .from('echo_article_comments')
        .select('id', { count: 'exact', head: true })
        .eq('article_id', articleId)
        .is('deleted_at', null),
    ]);

    let userHasLiked = false;
    try {
      const authUser = await getAuthUser(request);
      if (authUser) {
        const { data: existingLike } = await supabaseAdmin
          .from('echo_article_likes')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('article_id', articleId)
          .maybeSingle();
        userHasLiked = Boolean(existingLike);
      }
    } catch {
      /* unauthenticated */
    }

    return NextResponse.json({
      like_count: likeCount ?? 0,
      comment_count: commentCount ?? 0,
      user_has_liked: userHasLiked,
    });
  } catch (err) {
    console.error('[echo/engagement] unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500 },
    );
  }
}
