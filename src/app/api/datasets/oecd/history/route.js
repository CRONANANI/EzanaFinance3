import { NextResponse } from 'next/server';
import { getOecdHistory } from '@/lib/oecd-store';
import { OECD_CURATED_SLUGS } from '@/lib/oecd-curated';

/**
 * GET /api/datasets/oecd/history?slug=eo-sratio
 *
 * Full 1961–2025 series for ONE curated indicator across every area (one request
 * returns all countries, ~1,200–1,800 rows). The history chart fetches per
 * indicator and caches client-side. Public read (RLS-allowed on the observations
 * table). The slug is validated against the curated allow-list — unchecked user
 * input never reaches the store.
 *
 * This data changes only when the sync cron runs, so it is safe to cache.
 */
export const revalidate = 3600;
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || '';

  if (!OECD_CURATED_SLUGS.includes(slug)) {
    return NextResponse.json({ error: 'Unknown slug', slug }, { status: 400 });
  }

  const rows = await getOecdHistory(slug);
  if (rows == null) {
    // The store swallows failures to null; report an honest empty set rather
    // than a 500 so the chart shows a skeleton/empty state, not an error.
    return NextResponse.json({ slug, rows: [] }, { status: 200 });
  }

  return NextResponse.json({ slug, rows }, { status: 200 });
}
