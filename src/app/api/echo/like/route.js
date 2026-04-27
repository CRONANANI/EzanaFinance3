import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/echo/like
 * Body: { article_id: string, action: 'like' | 'unlike' }
 *
 * Idempotent: liking an already-liked article is a no-op (not an error).
 * Unliking an unliked article is also a no-op. The DB constraint
 * UNIQUE(article_id, user_id) enforces one like per user per article.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const article_id = String(body?.article_id || '').trim();
    const action = body?.action;

    if (!article_id) {
      return NextResponse.json({ error: 'article_id required' }, { status: 400 });
    }
    if (action !== 'like' && action !== 'unlike') {
      return NextResponse.json({ error: "action must be 'like' or 'unlike'" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (action === 'like') {
      const { error } = await supabase
        .from('echo_article_likes')
        .insert({ article_id, user_id: user.id });

      // Duplicate-key error means already liked — that's idempotent success
      if (error && error.code !== '23505' && !error.message?.includes('duplicate')) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from('echo_article_likes')
        .delete()
        .eq('article_id', article_id)
        .eq('user_id', user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const [likesCountRes, userLikeRes] = await Promise.all([
      supabase
        .from('echo_article_likes')
        .select('id', { count: 'exact', head: true })
        .eq('article_id', article_id),
      supabase
        .from('echo_article_likes')
        .select('id')
        .eq('article_id', article_id)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      success: true,
      like_count: likesCountRes.count ?? 0,
      user_has_liked: Boolean(userLikeRes.data),
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
