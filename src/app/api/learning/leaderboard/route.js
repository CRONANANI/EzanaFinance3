import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient } from '@/lib/supabase';
import { getInitials } from '@/lib/community-utils';

export const dynamic = 'force-dynamic';

const TOTAL_ELO_AVAILABLE = 2520;

function deriveTier(totalElo) {
  if (totalElo >= 2500) return 'Diamond';
  if (totalElo >= 1500) return 'Platinum';
  if (totalElo >= 750) return 'Gold';
  if (totalElo >= 250) return 'Silver';
  return 'Bronze';
}

export const GET = withApiGuard(
  async (request) => {
    try {
      const supabase = getUserClient();
      const url = new URL(request.url);
      const scope = url.searchParams.get('scope') || 'friends';
      const period = url.searchParams.get('period') || 'weekly';

      const admin = getAdminClient();

      let userIds = [user.id];
      if (scope === 'friends') {
        const { data: follows } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);
        userIds = userIds.concat((follows || []).map((f) => f.following_id));
      } else {
        const { data: top } = await admin
          .from('user_learning_elo')
          .select('user_id')
          .order('total_elo', { ascending: false })
          .limit(50);
        userIds = userIds.concat((top || []).map((r) => r.user_id));
      }
      userIds = Array.from(new Set(userIds.filter(Boolean)));

      const [{ data: elosRaw, error: eloError }, { data: profiles }] = await Promise.all([
        admin
          .from('user_learning_elo')
          .select('user_id, total_elo, weekly_delta')
          .in('user_id', userIds),
        admin.from('profiles').select('id, full_name, username, user_settings').in('id', userIds),
      ]);

      let elos = elosRaw;
      if (eloError) {
        const { data: fallback } = await admin
          .from('user_elo')
          .select('user_id, current_rating')
          .in('user_id', userIds);
        elos = (fallback || []).map((e) => ({
          user_id: e.user_id,
          total_elo: e.current_rating,
          weekly_delta: 0,
        }));
      }

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const eloMap = new Map((elos || []).map((e) => [e.user_id, e]));

      const rankings = userIds
        .map((id) => {
          const p = profileMap.get(id);
          const e = eloMap.get(id) || { total_elo: 0, weekly_delta: 0 };
          const rawName = (p?.full_name || p?.username || 'Member').trim();
          const totalElo = Number(e.total_elo) || 0;
          const weeklyDelta = Number(e.weekly_delta) || 0;
          return {
            user_id: id,
            name: id === user.id ? 'You' : rawName,
            initials: getInitials(id === user.id ? 'You' : rawName),
            elo: period === 'weekly' ? weeklyDelta : totalElo,
            total_elo: totalElo,
            delta: weeklyDelta,
            main_track: p?.user_settings?.learning_main_track || 'stocks',
            tier: deriveTier(totalElo),
            position_pct: Math.min(100, (totalElo / TOTAL_ELO_AVAILABLE) * 100),
            is_me: id === user.id,
          };
        })
        .sort((a, b) => b.elo - a.elo);

      rankings.forEach((r, i) => {
        r.rank = i + 1;
      });

      return NextResponse.json({
        scope,
        period,
        rankings,
        total_elo_available: TOTAL_ELO_AVAILABLE,
      });
    } catch (err) {
      console.error('[learning/leaderboard]', err);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
  },
  { requireAuth: false },
);
