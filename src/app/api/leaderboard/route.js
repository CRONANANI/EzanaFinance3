import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';
import { computeUserStats, getPeriodStartIso } from '@/lib/userTradeStats';

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * GET /api/leaderboard?period=all_time|year|month|week&includeRising=0|1&limit=50&offset=0
 * Aggregates user_trades with service role (bypasses RLS).
 */
export async function GET(request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        rows: [],
        averages: null,
        meta: { period: 'all_time', error: 'service_role_unconfigured' },
      });
    }
    const admin = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all_time';
    const includeRising = searchParams.get('includeRising') === '1';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const persist = searchParams.get('persist') !== '0';

    const { data: profilesRaw, error: pe } = await admin
      .from('profiles')
      .select('id, username, full_name, display_name, avatar_url, is_partner, privacy_show_on_leaderboard')
      .not('username', 'is', null);

    if (pe) {
      console.error(pe);
      return NextResponse.json({ error: pe.message }, { status: 500 });
    }

    const profiles = (profilesRaw || []).filter(
      (p) => p.privacy_show_on_leaderboard !== false,
    );
    const userIds = profiles.map((p) => p.id);
    if (userIds.length === 0) {
      return NextResponse.json({ rows: [], averages: null, meta: { period } });
    }

    let tradesQuery = admin.from('user_trades').select('*').in('user_id', userIds);
    const startIso = getPeriodStartIso(period);
    if (startIso) {
      tradesQuery = tradesQuery.gte('opened_at', startIso);
    }
    const { data: allTrades, error: te } = await tradesQuery;
    if (te) {
      console.error(te);
      return NextResponse.json({ error: te.message }, { status: 500 });
    }

    const byUser = new Map();
    for (const t of allTrades || []) {
      if (!byUser.has(t.user_id)) byUser.set(t.user_id, []);
      byUser.get(t.user_id).push(t);
    }

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const rows = [];
    for (const uid of userIds) {
      const raw = byUser.get(uid) || [];
      const stats = computeUserStats(raw);
      if (!includeRising && stats.totalTrades < 10) continue;
      const p = profileMap.get(uid);
      rows.push({
        userId: uid,
        username: p?.username,
        fullName: p?.full_name,
        displayName: p?.display_name,
        avatarUrl: p?.avatar_url,
        isPartner: !!p?.is_partner,
        ...stats,
      });
    }

    rows.sort((a, b) => b.score - a.score);

    const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));

    /** Global averages for radar / compare (all included rows before pagination) */
    const n = ranked.length || 1;
    const averages = {
      totalTrades: ranked.reduce((s, r) => s + r.totalTrades, 0) / n,
      winRate: ranked.reduce((s, r) => s + r.winRate, 0) / n,
      avgReturn: ranked.reduce((s, r) => s + r.avgReturn, 0) / n,
      riskReward: ranked.reduce((s, r) => s + r.riskReward, 0) / n,
      avgMax: ranked.reduce((s, r) => s + r.avgMax, 0) / n,
    };

    const prevDate = yesterdayStr();
    const { data: prevSnaps } = await admin
      .from('leaderboard_snapshots')
      .select('user_id, rank')
      .eq('period', period)
      .eq('snapshot_date', prevDate);

    const prevRank = new Map((prevSnaps || []).map((s) => [s.user_id, s.rank]));

    const sliced = ranked.slice(offset, offset + limit).map((r) => {
      const pr = prevRank.get(r.userId);
      const rankDelta = pr != null ? pr - r.rank : null;
      return {
        ...r,
        rankChange: rankDelta,
      };
    });

    if (persist && ranked.length > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const snapRows = ranked.map((r) => ({
        user_id: r.userId,
        period,
        rank: r.rank,
        score: r.score,
        win_rate: r.winRate,
        avg_gain: r.avgGain,
        avg_return: r.avgReturn,
        avg_max: r.avgMax,
        active_trades: r.activeTrades,
        total_trades: r.totalTrades,
        snapshot_date: todayStr(),
      }));
      const { error: upErr } = await admin.from('leaderboard_snapshots').upsert(snapRows, {
        onConflict: 'user_id,period,snapshot_date',
      });
      if (upErr) console.warn('leaderboard snapshot upsert:', upErr.message);
    }

    return NextResponse.json({
      rows: sliced,
      averages,
      meta: { period, total: ranked.length, limit, offset },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
