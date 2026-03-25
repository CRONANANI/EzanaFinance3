/**
 * /api/echo/articles
 * GET — list published articles (public) or author's own articles (auth'd)
 * POST — create/save draft or submit for review (auth'd partner with writer approval)
 * PATCH — update article (auth'd, own articles only)
 */
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';


function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const authorId = searchParams.get('authorId');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const myArticles = searchParams.get('my') === 'true';
  const slug = searchParams.get('slug');

  if (slug) {
    const { data: article } = await supabaseAdmin
      .from('echo_articles')
      .select('*')
      .eq('article_slug', slug)
      .eq('article_status', 'published')
      .single();

    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    await supabaseAdmin
      .from('echo_articles')
      .update({ view_count: (article.view_count || 0) + 1 })
      .eq('id', article.id);

    return NextResponse.json({ article });
  }

  if (myArticles) {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: articles } = await supabaseAdmin
      .from('echo_articles')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ articles: articles || [] });
  }

  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = 20;
  const start = (page - 1) * pageSize;

  let query = supabaseAdmin
    .from('echo_articles')
    .select('id, author_id, author_name, author_avatar, article_title, article_slug, article_excerpt, article_category, cover_image_url, read_time_minutes, view_count, like_count, published_at', { count: 'exact' })
    .eq('article_status', 'published')
    .order('published_at', { ascending: false })
    .range(start, start + pageSize - 1);

  if (authorId) query = query.eq('author_id', authorId);
  if (category) query = query.eq('article_category', category);
  if (search) query = query.or(`article_title.ilike.%${search}%,author_name.ilike.%${search}%`);

  const { data: articles, count } = await query;
  return NextResponse.json({ articles: articles || [], total: count ?? 0 });
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: partner } = await supabaseAdmin
    .from('partners')
    .select('echo_writer_approved, display_name, avatar_url')
    .eq('user_id', user.id)
    .single();

  if (!partner?.echo_writer_approved) {
    return NextResponse.json(
      { error: 'You must be an approved Echo writer to submit articles. Apply via Creator Studio.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { title, excerpt, body: articleBody, category, coverImageUrl, action } = body;

  if (!title || !articleBody) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
  }

  const slug = slugify(title) + '-' + Date.now().toString(36);
  const status = action === 'submit' ? 'submitted' : 'draft';
  const wordCount = articleBody.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 200));

  const { data: article, error: insertErr } = await supabaseAdmin
    .from('echo_articles')
    .insert({
      author_id: user.id,
      author_name: partner.display_name || user.email?.split('@')[0] || 'Anonymous',
      author_avatar: partner.avatar_url || null,
      article_title: title,
      article_slug: slug,
      article_excerpt: excerpt || articleBody.slice(0, 200) + '...',
      article_body: articleBody,
      article_category: category || 'Markets',
      cover_image_url: coverImageUrl || null,
      article_status: status,
      read_time_minutes: readTime,
      submitted_at: action === 'submit' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[Echo] Article insert error:', insertErr);
    return NextResponse.json({ error: 'Failed to save article' }, { status: 500 });
  }

  return NextResponse.json({ success: true, article });
}

export async function PATCH(request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { articleId, title, excerpt, body: articleBody, category, coverImageUrl, action } = body;

  if (!articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 });

  const updates = { updated_at: new Date().toISOString() };
  if (title) updates.article_title = title;
  if (excerpt) updates.article_excerpt = excerpt;
  if (articleBody) {
    updates.article_body = articleBody;
    const wordCount = articleBody.trim().split(/\s+/).filter(Boolean).length;
    updates.read_time_minutes = Math.max(1, Math.round(wordCount / 200));
  }
  if (category) updates.article_category = category;
  if (coverImageUrl !== undefined) updates.cover_image_url = coverImageUrl;

  if (action === 'submit') {
    updates.article_status = 'submitted';
    updates.submitted_at = new Date().toISOString();
  }

  const { data: article, error: updateErr } = await supabaseAdmin
    .from('echo_articles')
    .update(updates)
    .eq('id', articleId)
    .eq('author_id', user.id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

  return NextResponse.json({ success: true, article });
}
