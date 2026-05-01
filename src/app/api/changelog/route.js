import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/changelog?limit=50&offset=0
 *
 * Returns published changelog entries, pinned first then newest by released_at.
 * Authenticated users only (matches RLS policy).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: entries, error, count } = await supabase
      .from('platform_changelog_entries')
      .select('id, title, body, category, is_pinned, released_at, created_at', { count: 'exact' })
      .eq('is_published', true)
      .order('is_pinned', { ascending: false })
      .order('released_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
