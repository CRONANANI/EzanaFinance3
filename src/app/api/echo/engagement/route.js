import { NextResponse } from 'next/server';
import { getCurrentUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const admin = getAdminClient();

function articleIdFromRequest(request) {
  const { searchParams } = new URL(request.url);
  return String(searchParams.get('articleId') || searchParams.get('article_id') || '').trim();
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

    const [{ count: likeCount }, { count: commentCount }, { count: saveCount }] = await Promise.all(
      [
        admin
          .from('echo_article_likes')
          .select('id', { count: 'exact', head: true })
          .eq('article_id', articleId),
        admin
          .from('echo_article_comments')
          .select('id', { count: 'exact', head: true })
          .eq('article_id', articleId)
          .is('deleted_at', null),
        admin
          .from('echo_saved_articles')
          .select('article_id', { count: 'exact', head: true })
          .eq('article_id', articleId),
      ],
    );

    let userHasLiked = false;
    let userHasSaved = false;
    try {
      const authUser = await getCurrentUser(request);
      if (authUser) {
        const [{ data: existingLike }, { data: existingSave }] = await Promise.all([
          admin
            .from('echo_article_likes')
            .select('id')
            .eq('user_id', authUser.id)
            .eq('article_id', articleId)
            .maybeSingle(),
          admin
            .from('echo_saved_articles')
            .select('article_id')
            .eq('user_id', authUser.id)
            .eq('article_id', articleId)
            .maybeSingle(),
        ]);
        userHasLiked = Boolean(existingLike);
        userHasSaved = Boolean(existingSave);
      }
    } catch {
      /* unauthenticated */
    }

    return NextResponse.json({
      like_count: likeCount ?? 0,
      comment_count: commentCount ?? 0,
      user_has_liked: userHasLiked,
      save_count: saveCount ?? 0,
      user_has_saved: userHasSaved,
      likeCount: likeCount ?? 0,
      commentCount: commentCount ?? 0,
      userHasLiked,
      saveCount: saveCount ?? 0,
      userHasSaved,
    });
  } catch (err) {
    console.error('[echo/engagement] unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
