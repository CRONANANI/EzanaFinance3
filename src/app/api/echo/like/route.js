import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getCurrentUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const admin = getAdminClient();

function parseArticleId(body) {
  return String(body?.articleId ?? body?.article_id ?? '').trim();
}

/**
 * POST /api/echo/like
 * Body: { articleId: string } (or article_id)
 *
 * Toggle like. Unique (user_id, article_id) → insert or delete on 23505.
 */
export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json().catch(() => ({}));
      const articleId = parseArticleId(body);
      if (!articleId) {
        return NextResponse.json({ error: 'articleId required' }, { status: 400 });
      }

      const { error: insertErr } = await admin
        .from('echo_article_likes')
        .insert({ user_id: user.id, article_id: articleId });

      let liked;
      if (insertErr) {
        if (insertErr.code === '23505') {
          const { error: deleteErr } = await admin
            .from('echo_article_likes')
            .delete()
            .eq('user_id', user.id)
            .eq('article_id', articleId);
          if (deleteErr) {
            console.error('[echo/like] delete failed:', deleteErr);
            return NextResponse.json({ error: 'Could not unlike' }, { status: 500 });
          }
          liked = false;
        } else {
          console.error('[echo/like] insert failed:', insertErr);
          return NextResponse.json({ error: 'Could not like' }, { status: 500 });
        }
      } else {
        liked = true;
      }

      const { count: likeCount } = await admin
        .from('echo_article_likes')
        .select('id', { count: 'exact', head: true })
        .eq('article_id', articleId);

      return NextResponse.json({
        liked,
        like_count: likeCount ?? 0,
        user_has_liked: liked,
      });
    } catch (err) {
      console.error('[echo/like] unexpected error:', err);
      return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
