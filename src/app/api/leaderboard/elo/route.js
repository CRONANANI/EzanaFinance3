import { NextResponse } from 'next/server';
import { createServerSupabaseClient, isServerSupabaseConfigured } from '@/lib/supabase-service-role';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard/elo[?tier=&limit=&offset=&search=]
 */
export async function GET(request) {
  try {
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const tierFilter = searchParams.get('tier');
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const supabase = createServerSupabaseClient();

    let q = supabase
      .from('user_elo')
      .select('user_id, current_rating, peak_rating, tier, last_activity_at, partner_eligible', {
        count: 'exact',
      })
      .order('current_rating', { ascending: false });

    if (tierFilter) {
      q = q.eq('tier', tierFilter);
    }

    q = q.range(offset, offset + limit - 1);

    const { data: rows, count, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const userIds = (rows || []).map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, user_settings, avatar_url')
      .in('id', userIds);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    let merged = (rows || []).map((r, idx) => {
      const p = profileMap[r.user_id] || {};
      const displayName = (p.full_name || p.user_settings?.display_name || p.username || 'Member').trim();
      return {
        rank: offset + idx + 1,
        user_id: r.user_id,
        username: p.username,
        display_name: displayName,
        avatar_url: p.avatar_url,
        current_rating: r.current_rating,
        peak_rating: r.peak_rating,
        tier: r.tier,
        last_activity_at: r.last_activity_at,
        partner_eligible: r.partner_eligible,
      };
    });

    if (search) {
      merged = merged.filter(
        (r) =>
          (r.username || '').toLowerCase().includes(search) ||
          (r.display_name || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      rows: merged,
      pagination: { offset, limit, total: count ?? 0 },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
