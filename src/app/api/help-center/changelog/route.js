import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * GET /api/help-center/changelog?limit=6&offset=0
 *
 * The public read of the platform changelog for the help centre, which is a
 * public page. /api/changelog (the in-app panel) stays authenticated; this
 * route returns only published entries and only the fields a visitor needs:
 * no author, no pin flag, no internal ids beyond the row id.
 *
 * Bodies are cleaned for display: the changelog bot's "_Day … · N commits_"
 * footer is dropped and em dashes become commas (house style for UI copy).
 */
export const revalidate = 600;

const CACHE = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' };

function clean(text) {
  return String(text || '')
    .replace(/\n*_Day [^_]*_\s*$/i, '')
    .replace(/\n*_Week [^_]*_\s*$/i, '')
    .replace(/\s*\u2014\s*/g, ', ')
    .replace(/\s*\u2013\s*/g, ' to ')
    .trim();
}

export async function GET(request) {
  const rl = await checkRateLimit(`help:changelog:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit')) || 6));
  const offset = Math.min(500, Math.max(0, Number(searchParams.get('offset')) || 0));

  try {
    const { data, error, count } = await getAdminClient()
      .from('platform_changelog_entries')
      .select('id, title, body, category, released_at', { count: 'exact' })
      .eq('is_published', true)
      .order('released_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return NextResponse.json(
      {
        ok: true,
        total: count || 0,
        entries: (data || []).map((e) => ({
          id: e.id,
          title: clean(e.title),
          body: clean(e.body),
          category: e.category,
          releasedAt: e.released_at,
        })),
      },
      { headers: CACHE },
    );
  } catch (err) {
    console.error('[help-center/changelog] read failed:', err?.message || err);
    return NextResponse.json({ ok: false, total: 0, entries: [] }, { status: 200 });
  }
}
