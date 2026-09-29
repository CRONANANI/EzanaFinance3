/**
 * GET /api/help-center/trending?section=user|partner&limit=6
 *
 * The most-viewed Help Center articles in the last 30 days, via the
 * help_center_trending RPC over help_article_views. Titles and categories are
 * resolved from the content module by slug, so a stale slug in the table can
 * never render a dead link (unknown slugs are dropped). Returns { items: [] }
 * when there is no data yet; the rail then falls back to a static list.
 */
import { NextResponse } from 'next/server';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { USER_ARTICLES, PARTNER_ARTICLES } from '@/lib/help-center-content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECTIONS = { user: USER_ARTICLES, partner: PARTNER_ARTICLES };

export async function GET(request) {
  const url = new URL(request.url);
  const section = url.searchParams.get('section') || 'user';
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit')) || 6, 12));
  if (!Object.hasOwn(SECTIONS, section)) {
    return NextResponse.json({ items: [] }, { status: 400 });
  }
  const catalog = SECTIONS[section];

  let rows = [];
  if (isServerSupabaseConfigured()) {
    try {
      const { data } = await getAdminClient().rpc('help_center_trending', {
        p_section: section,
        p_days: 30,
        p_limit: limit,
      });
      rows = Array.isArray(data) ? data : [];
    } catch {
      rows = [];
    }
  }

  const items = rows
    .map((r) => {
      const a = Object.hasOwn(catalog, r.article_slug) ? catalog[r.article_slug] : null;
      return a
        ? {
            slug: r.article_slug,
            title: a.title,
            category: a.category || null,
            views: Number(r.views) || 0,
          }
        : null;
    })
    .filter(Boolean);

  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } },
  );
}
