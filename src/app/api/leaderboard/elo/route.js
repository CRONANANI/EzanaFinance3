import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import {
  computeDeltasAndSparkline,
  groupEloHistory,
  humanizeLastActive,
  initialsFromName,
  profileTitle,
} from '@/lib/leaderboard-elo-enrich';

export const dynamic = 'force-dynamic';

function enrichRow(r, profile, historyByUser) {
  const p = profile || {};
  const displayName = (
    p.full_name ||
    p.user_settings?.display_name ||
    p.username ||
    'Member'
  ).trim();

  const txs = historyByUser[r.user_id] || [];
  const { delta7d, delta30d, sparkline } = computeDeltasAndSparkline(txs, r.current_rating);

  const enriched = {
    rank: r.rank,
    user_id: r.user_id,
    username: p.username,
    display_name: displayName,
    avatar_url: p.avatar_url,
    current_rating: r.current_rating,
    peak_rating: r.peak_rating,
    tier: r.tier,
    last_activity_at: r.last_activity_at,
    partner_eligible: r.partner_eligible,
    id: r.user_id,
    name: displayName,
    initials: initialsFromName(displayName),
    title: profileTitle(p),
    rating: r.current_rating,
    peak: r.peak_rating,
    delta7d,
    delta30d,
    sparkline,
    active: humanizeLastActive(r.last_activity_at),
  };

  return enriched;
}

/**
 * GET /api/leaderboard/elo[?tier=&limit=&offset=&search=]
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
      }

      const { searchParams } = new URL(request.url);
      const tierFilter = searchParams.get('tier');
      const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));
      const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
      const search = (searchParams.get('search') || '').trim().toLowerCase();

      const supabase = getAdminClient();

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

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: profiles }, { data: history }] = await Promise.all([
        userIds.length
          ? supabase
              .from('profiles')
              .select('id, full_name, username, user_settings, avatar_url')
              .in('id', userIds)
          : Promise.resolve({ data: [] }),
        userIds.length
          ? supabase
              .from('elo_transactions')
              .select('user_id, delta, created_at, rating_after')
              .in('user_id', userIds)
              .gte('created_at', thirtyDaysAgo)
              .order('created_at', { ascending: true })
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      const historyByUser = groupEloHistory(history);

      let merged = (rows || []).map((r, idx) =>
        enrichRow({ ...r, rank: offset + idx + 1 }, profileMap[r.user_id], historyByUser),
      );

      if (search) {
        merged = merged.filter(
          (row) =>
            (row.username || '').toLowerCase().includes(search) ||
            (row.display_name || '').toLowerCase().includes(search) ||
            (row.name || '').toLowerCase().includes(search),
        );
      }

      return NextResponse.json({
        rows: merged,
        pagination: { offset, limit, total: count ?? 0 },
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      );
    }
  },
  { requireAuth: false },
);
