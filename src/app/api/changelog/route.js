import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/changelog?limit=50&offset=0&since=<ISO>
 *
 * Returns published changelog entries, pinned first then newest by released_at.
 * Optional `since` filters to released_at >= since (e.g. last 90 days).
 * Authenticated users only (matches RLS policy).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const since = searchParams.get('since'); // ISO timestamp, optional

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let q = supabase
      .from('platform_changelog_entries')
      .select('id, title, body, category, is_pinned, released_at, created_at', { count: 'exact' })
      .eq('is_published', true);

    if (since) {
      q = q.gte('released_at', since);
    }

    q = q
      .order('is_pinned', { ascending: false })
      .order('released_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: entries, error, count } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      entries: entries || [],
      pagination: { offset, limit, total: count || 0 },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
