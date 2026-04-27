import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseArticleId(body) {
  return String(body?.articleId ?? body?.article_id ?? '').trim();
}

/**
 * POST /api/echo/like
 * Body: { articleId: string } (or article_id)
 *
 * Toggle like. Unique (user_id, article_id) → insert or delete on 23505.
 */
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Sign in to like articles.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const articleId = parseArticleId(body);
    if (!articleId) {
      return NextResponse.json({ error: 'articleId required' }, { status: 400 });
    }

    const { error: insertErr } = await supabaseAdmin
      .from('echo_article_likes')
      .insert({ user_id: user.id, article_id: articleId });

    let liked;
    if (insertErr) {
      if (insertErr.code === '23505') {
        const { error: deleteErr } = await supabaseAdmin
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

    const { count: likeCount } = await supabaseAdmin
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
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500 },
    );
  }
}
