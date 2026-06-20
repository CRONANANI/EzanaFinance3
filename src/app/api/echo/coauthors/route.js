/**
 * /api/echo/coauthors — credit co-authors on an Echo article.
 * GET    ?articleId=<uuid> → list co-authors (public)
 * POST   { articleId, username } → add a co-author (article author only)
 * DELETE { articleId, userId }   → remove a co-author (article author only)
 */
import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { getCoauthorsForArticle } from '@/lib/echo-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const admin = getAdminClient();

// Confirm the caller authored the article (only the author manages credits).
async function ownsArticle(articleId, userId) {
  const { data } = await admin
    .from('echo_articles')
    .select('id, author_id')
    .eq('id', articleId)
    .maybeSingle();
  return data && data.author_id === userId ? data : null;
}

export async function GET(request) {
  try {
    const articleId = new URL(request.url).searchParams.get('articleId');
    if (!articleId) return NextResponse.json({ coAuthors: [] });
    return NextResponse.json({ coAuthors: await getCoauthorsForArticle(articleId) });
  } catch (e) {
    console.error('[echo] coauthors GET:', e?.message || e);
    return NextResponse.json({ coAuthors: [] });
  }
}

export async function POST(request) {
  try {
    const { user } = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const articleId = typeof body.articleId === 'string' ? body.articleId : null;
    const username = String(body.username || '')
      .trim()
      .replace(/^@/, '');
    if (!articleId || !username) {
      return NextResponse.json({ error: 'articleId and username are required' }, { status: 400 });
    }

    if (!(await ownsArticle(articleId, user.id))) {
      return NextResponse.json({ error: 'Only the author can add co-authors' }, { status: 403 });
    }

    const { data: prof } = await admin
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();
    if (!prof) return NextResponse.json({ error: `No member @${username}` }, { status: 404 });
    if (prof.id === user.id) {
      return NextResponse.json({ error: 'You are already the author' }, { status: 400 });
    }

    const { error } = await admin
      .from('echo_article_coauthors')
      .upsert({ article_id: articleId, user_id: prof.id }, { onConflict: 'article_id,user_id' });
    if (error) return NextResponse.json({ error: 'Failed to add co-author' }, { status: 500 });

    return NextResponse.json({ coAuthors: await getCoauthorsForArticle(articleId) });
  } catch (e) {
    if (e?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[echo] coauthors POST:', e?.message || e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { user } = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const articleId = typeof body.articleId === 'string' ? body.articleId : null;
    const userId = typeof body.userId === 'string' ? body.userId : null;
    if (!articleId || !userId) {
      return NextResponse.json({ error: 'articleId and userId are required' }, { status: 400 });
    }

    if (!(await ownsArticle(articleId, user.id))) {
      return NextResponse.json({ error: 'Only the author can remove co-authors' }, { status: 403 });
    }

    await admin
      .from('echo_article_coauthors')
      .delete()
      .eq('article_id', articleId)
      .eq('user_id', userId);

    return NextResponse.json({ coAuthors: await getCoauthorsForArticle(articleId) });
  } catch (e) {
    if (e?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[echo] coauthors DELETE:', e?.message || e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
