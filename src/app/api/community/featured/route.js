/**
 * GET /api/community/featured: the Community's featured editorial banner
 * (Nov 23, 2026). The Echo articles marked is_featured by the editorial
 * flow (the same flag that picks the Echo home hero), published only, with
 * their real title, excerpt, read time and hero image. Up to three; the
 * banner shows pagination only when there is more than one.
 */
import { NextResponse } from 'next/server';
import { withSession } from '@/lib/community/route-session';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return withSession(request, 'featured', async ({ supabase }) => {
    const { data, error } = await supabase
      .from('echo_articles')
      .select(
        'article_slug, article_title, article_excerpt, read_time_minutes, hero_image, cover_image_url, published_at',
      )
      .eq('is_featured', true)
      .eq('article_status', 'published')
      .order('published_at', { ascending: false })
      .limit(3);
    if (error) throw new Error(error.message);
    const items = (data || []).map((a) => {
      const img = a.hero_image?.src || a.cover_image_url || null;
      return {
        kind: 'echo',
        slug: a.article_slug,
        title: a.article_title,
        excerpt: a.article_excerpt || '',
        read_minutes: Number(a.read_time_minutes) || null,
        image: typeof img === 'string' ? img : null,
        image_alt: a.hero_image?.alt || '',
        url: `/ezana-echo/${a.article_slug}`,
      };
    });
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  });
}
