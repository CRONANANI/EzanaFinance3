/**
 * /api/echo/authors
 * GET — list published authors or get a specific author profile
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const authorId = searchParams.get('id');
  const search = searchParams.get('search');

  if (authorId) {
    const { data: partner } = await supabaseAdmin
      .from('partners')
      .select('user_id, display_name, bio, avatar_url, verified, echo_writer_approved')
      .eq('user_id', authorId)
      .eq('echo_writer_approved', true)
      .single();

    if (!partner) return NextResponse.json({ error: 'Author not found' }, { status: 404 });

    const { count: subscriberCount } = await supabaseAdmin
      .from('echo_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', authorId);

    const { count: articleCount } = await supabaseAdmin
      .from('echo_articles')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', authorId)
      .eq('article_status', 'published');

    const { data: articles } = await supabaseAdmin
      .from('echo_articles')
      .select('id, article_title, article_slug, article_excerpt, article_category, published_at, read_time_minutes, view_count, like_count')
      .eq('author_id', authorId)
      .eq('article_status', 'published')
      .order('published_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      author: {
        ...partner,
        subscriberCount: subscriberCount || 0,
        articleCount: articleCount || 0,
      },
      articles: articles || [],
    });
  }

  let query = supabaseAdmin
    .from('partners')
    .select('user_id, display_name, bio, avatar_url, verified')
    .eq('echo_writer_approved', true);

  const { data: partners } = await query;
  const authors = partners || [];

  const authorsWithCounts = await Promise.all(
    authors.map(async (a) => {
      const { count } = await supabaseAdmin
        .from('echo_articles')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', a.user_id)
        .eq('article_status', 'published');

      const { count: subs } = await supabaseAdmin
        .from('echo_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', a.user_id);

      return { ...a, articleCount: count || 0, subscriberCount: subs || 0 };
    })
  );

  let filtered = authorsWithCounts;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((a) =>
      a.display_name?.toLowerCase().includes(q) || a.bio?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ authors: filtered });
}
