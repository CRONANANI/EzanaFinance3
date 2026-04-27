import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/echo/engagement?article_id=<slug>
 *
 * Returns: {
 *   like_count: number,
 *   comment_count: number,
 *   user_has_liked: boolean   // false for unauthenticated requests
 * }
 *
 * Public endpoint — counts are public. The user's like state is included
 * only if they're logged in.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const article_id = String(searchParams.get('article_id') || '').trim();
    if (!article_id) {
      return NextResponse.json({ error: 'article_id required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [likesRes, commentsRes, userLikeRes] = await Promise.all([
      supabase
        .from('echo_article_likes')
        .select('id', { count: 'exact', head: true })
        .eq('article_id', article_id),
      supabase
        .from('echo_article_comments')
        .select('id', { count: 'exact', head: true })
        .eq('article_id', article_id)
        .is('deleted_at', null),
      user
        ? supabase
            .from('echo_article_likes')
            .select('id')
            .eq('article_id', article_id)
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({
      like_count: likesRes.count ?? 0,
      comment_count: commentsRes.count ?? 0,
      user_has_liked: Boolean(userLikeRes?.data),
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
