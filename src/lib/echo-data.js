/**
 * Live Echo data layer. The reader is served entirely from the database
 * (public.echo_articles); the curated catalog is seeded on first access via
 * ensureCuratedSeeded. Rows are mapped to the shape the Echo UI already
 * expects (slug-as-id, author as a string, rich contentBlocks/heroImage).
 *
 * Server-only: depends on the service-role admin client.
 */
import { getAdminClient } from '@/lib/supabase';
import { ensureCuratedSeeded } from '@/lib/echo/curated-seed';

const admin = getAdminClient();

const CARD_COLS =
  'id, author_id, author_name, author_avatar, article_title, article_slug, article_excerpt, article_category, cover_image_url, hero_image, tags, is_featured, read_time_minutes, view_count, like_count, published_at';

function mapCard(row) {
  return {
    id: row.article_slug,
    dbId: row.id,
    slug: row.article_slug,
    title: row.article_title,
    excerpt: row.article_excerpt,
    category: row.article_category || 'markets',
    author: row.author_name,
    authorId: row.author_id || null,
    authorAvatar: row.author_avatar || null,
    featured: !!row.is_featured,
    heroImage: row.hero_image || null,
    coverImage: row.cover_image_url || null,
    tags: row.tags || [],
    readTime: row.read_time_minutes || 1,
    views: row.view_count || 0,
    likes: row.like_count || 0,
    publishedAt: row.published_at,
  };
}

function mapFull(row) {
  return {
    ...mapCard(row),
    body: row.article_body || '',
    contentBlocks: row.content_blocks || undefined,
    contentParagraphs: row.content_paragraphs || undefined,
    tickers: row.tickers || [],
    status: row.article_status,
  };
}

/** All published articles as light cards (newest first). */
export async function getPublishedArticles() {
  await ensureCuratedSeeded(admin);
  const { data, error } = await admin
    .from('echo_articles')
    .select(CARD_COLS)
    .eq('article_status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[echo] getPublishedArticles:', error.message);
    return [];
  }
  return (data || []).map(mapCard);
}

/** Hub payload: cards + the featured article. */
export async function getHubData() {
  const articles = await getPublishedArticles();
  const featured = articles.find((a) => a.featured) || articles[0] || null;
  return { articles, featured };
}

/** Co-authors credited on an article (by article DB id). */
export async function getCoauthorsForArticle(articleDbId) {
  const { data: links } = await admin
    .from('echo_article_coauthors')
    .select('user_id')
    .eq('article_id', articleDbId);
  const ids = (links || []).map((l) => l.user_id);
  if (!ids.length) return [];
  const { data: profs } = await admin
    .from('profiles')
    .select('id, username, full_name, user_settings')
    .in('id', ids);
  return (profs || []).map((p) => ({
    id: p.id,
    username: p.username || '',
    name: p.user_settings?.display_name || p.full_name || 'Author',
    avatar: p.user_settings?.avatar_url || null,
  }));
}

/** Series summary + ordered parts, flagging the current article. */
async function getSeriesSummary(seriesId, currentSlug) {
  const { data: s } = await admin
    .from('echo_series')
    .select('id, title, slug, description')
    .eq('id', seriesId)
    .maybeSingle();
  if (!s) return null;
  const { data: parts } = await admin
    .from('echo_articles')
    .select('article_slug, article_title, series_order, published_at')
    .eq('series_id', seriesId)
    .eq('article_status', 'published')
    .order('series_order', { ascending: true, nullsFirst: false })
    .order('published_at', { ascending: true });
  return {
    id: s.id,
    title: s.title,
    slug: s.slug,
    description: s.description,
    parts: (parts || []).map((p) => ({
      id: p.article_slug,
      slug: p.article_slug,
      title: p.article_title,
      current: p.article_slug === currentSlug,
    })),
  };
}

/** Full article by slug (any status), with series + co-authors. Side-effect free. */
export async function getArticleBySlug(slug) {
  await ensureCuratedSeeded(admin);
  const { data, error } = await admin
    .from('echo_articles')
    .select('*')
    .eq('article_slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  const article = mapFull(data);
  article.coAuthors = await getCoauthorsForArticle(data.id);
  article.series = data.series_id
    ? await getSeriesSummary(data.series_id, data.article_slug)
    : null;
  return article;
}

/** A series and its published articles, by slug. */
export async function getSeriesBySlug(slug) {
  const { data: s } = await admin.from('echo_series').select('*').eq('slug', slug).maybeSingle();
  if (!s) return null;
  const { data: rows } = await admin
    .from('echo_articles')
    .select(`${CARD_COLS}, series_order`)
    .eq('series_id', s.id)
    .eq('article_status', 'published')
    .order('series_order', { ascending: true, nullsFirst: false })
    .order('published_at', { ascending: false });
  return { series: s, articles: (rows || []).map(mapCard) };
}

/** Series owned by a user (for the editor's series picker). */
export async function listSeriesByOwner(ownerId) {
  const { data } = await admin
    .from('echo_series')
    .select('id, title, slug, description, cover_image_url, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  return data || [];
}

/** Fire-and-forget view increment for a published article (by slug). */
export async function bumpArticleView(slug) {
  try {
    const { data } = await admin
      .from('echo_articles')
      .select('id, view_count')
      .eq('article_slug', slug)
      .maybeSingle();
    if (!data) return;
    await admin
      .from('echo_articles')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', data.id);
  } catch {
    /* ignore */
  }
}

/** Related (same category) + more (other) published cards, excluding a slug. */
export async function getRelatedAndMore(category, excludeSlug, relatedLimit = 3, moreLimit = 4) {
  const all = await getPublishedArticles();
  const related = all
    .filter((a) => a.category === category && a.slug !== excludeSlug)
    .slice(0, relatedLimit);
  const relatedSlugs = new Set(related.map((a) => a.slug));
  const more = all
    .filter((a) => a.slug !== excludeSlug && !relatedSlugs.has(a.slug))
    .slice(0, moreLimit);
  return { related, more };
}
