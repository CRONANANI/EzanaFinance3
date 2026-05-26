'use client';

import '@/app/(dashboard)/community/community.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { supabase } from '@/lib/supabase-browser';
import { MetricsGrid } from './MetricsGrid';
import { AchievementsGrid } from './AchievementsGrid';
import { ProfilePerformancePanel } from './ProfilePerformancePanel';
import { ProfileEloCard } from './ProfileEloCard';
import { ProfileTradeNotes } from './ProfileTradeNotes';
import CopyRequestButton from './CopyRequestButton';
import { useProfileActivity } from '@/hooks/useProfileActivity';
import { computeProfileMetrics } from '@/lib/profile-metrics';
import './copy-request-button.css';

function badgePills(stats, isPartner) {
  const pills = [];
  if (isPartner) pills.push({ label: '⚡ Partner', key: 'p' });
  if (stats.totalTrades >= 20) pills.push({ label: 'SERIAL TRADER', key: 's' });
  if (stats.winRate >= 65) pills.push({ label: '⚡ TOP 8', key: 't' });
  if (pills.length === 0) pills.push({ label: 'TRADER', key: 'd' });
  return pills;
}

export function ProfilePageClient({ username }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [trades, setTrades] = useState([]);
  const [bookmarked, setBookmarked] = useState([]);
  const [privacyBlocked, setPrivacyBlocked] = useState(false);
  const [tab, setTab] = useState('trades');
  const [subTab, setSubTab] = useState('recent');
  const [viewMode, setViewMode] = useState('card');
  const [benchmark, setBenchmark] = useState(null);
  const [activityItems, setActivityItems] = useState([]);
  const [followingItems, setFollowingItems] = useState([]);
  const [followerItems, setFollowerItems] = useState([]);
  const [plaidHoldingsPayload, setPlaidHoldingsPayload] = useState(null);

  const mock = useMockPortfolio();
  const useLiveHoldings =
    !!plaidHoldingsPayload?.connected && (plaidHoldingsPayload?.aggregated?.length ?? 0) > 0;

  const isOwn = Boolean(user?.id && profile?.id === user.id);

  /** Own profile only: Plaid → mock positions → []. Others: null → use Supabase `trades`. */
  const portfolioTrades = useMemo(() => {
    if (!isOwn) return null;
    if (useLiveHoldings && plaidHoldingsPayload?.aggregated?.length) {
      return plaidHoldingsPayload.aggregated.map((p, i) => {
        const qty = Number(p.totalQuantity) || 0;
        const tb = Number(p.totalCostBasis) || 0;
        const tv = Number(p.totalValue) || 0;
        const last = Number(p.lastPrice) || (qty > 0 ? tv / qty : 0);
        const entry = qty > 0 ? tb / qty : last;
        const pl =
          p.gainLossPercent != null
            ? Number(p.gainLossPercent)
            : tb > 0
              ? ((tv - tb) / tb) * 100
              : 0;
        const iso = new Date().toISOString();
        return {
          id: `plaid-${p.ticker || 'x'}-${i}`,
          ticker: p.ticker || '?',
          entry_price: entry,
          exit_price: last,
          status: 'closed',
          pnl_percent: pl,
          created_at: iso,
          updated_at: iso,
          source: 'brokerage',
        };
      });
    }
    if (mock?.enrichedPositions?.length) {
      return mock.enrichedPositions.map((p, i) => {
        const cost = Number(p.avgCost) || 0;
        const cur = Number(p.currentPrice) || 0;
        const pl = cost > 0 ? ((cur - cost) / cost) * 100 : 0;
        const iso = new Date().toISOString();
        return {
          id: `mock-${p.symbol}-${i}`,
          ticker: p.symbol,
          entry_price: cost,
          exit_price: cur,
          status: 'closed',
          pnl_percent: pl,
          created_at: iso,
          updated_at: iso,
          source: 'mock',
        };
      });
    }
    return [];
  }, [isOwn, useLiveHoldings, plaidHoldingsPayload, mock?.enrichedPositions]);

  const effectiveTrades = portfolioTrades ?? trades;

  const activity = useProfileActivity();

  const { positions, totalReturnPct, userSeriesFull, platformAverages, benchmarkReturnPct } =
    useMemo(() => {
      if (isOwn) {
        return {
          positions: activity.positions,
          totalReturnPct: activity.totalReturnPct,
          userSeriesFull: activity.userSeriesFull,
          platformAverages: activity.platformAverages,
          benchmarkReturnPct: activity.benchmarkReturnPct,
        };
      }
      const closed = effectiveTrades.filter(
        (t) => t.status === 'closed' || t.status === 'partial_exit',
      );
      const withPnl = closed.filter((t) => t.pnl_percent != null);
      const avgReturn = withPnl.length
        ? withPnl.reduce((s, t) => s + Number(t.pnl_percent), 0) / withPnl.length
        : 0;
      const pseudoPositions = [
        {
          symbol: 'PORTFOLIO',
          qty: 1,
          avgCost: 100,
          currentPrice: 100 * (1 + avgReturn / 100),
          costBasis: 100,
          marketValue: 100 * (1 + avgReturn / 100),
          sector: '',
        },
      ];
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      const daysSinceYearStart = Math.round((today.getTime() - yearStart.getTime()) / 86_400_000);
      const points = Math.max(100, daysSinceYearStart + 1);
      const series = Array.from({ length: points }, (_, i) => {
        const d = new Date(today);
        d.setUTCDate(today.getUTCDate() - (points - 1 - i));
        const t = i / Math.max(1, points - 1);
        return {
          date: d.toISOString().slice(0, 10),
          cumReturnPct: Number((avgReturn * t).toFixed(3)),
        };
      });
      return {
        positions: pseudoPositions,
        totalReturnPct: avgReturn,
        userSeriesFull: series,
        platformAverages: activity.platformAverages,
        benchmarkReturnPct: activity.benchmarkReturnPct,
      };
    }, [isOwn, activity, effectiveTrades]);

  const metrics = useMemo(
    () =>
      computeProfileMetrics({
        positions,
        trades: isOwn ? activity.trades : effectiveTrades,
        deposits: isOwn ? activity.deposits : [],
        benchmarkReturnPct,
        platformAverages,
      }),
    [
      positions,
      isOwn,
      activity.trades,
      activity.deposits,
      effectiveTrades,
      benchmarkReturnPct,
      platformAverages,
    ],
  );

  const statsQuick = useMemo(() => {
    const closed = effectiveTrades.filter(
      (t) => t.status === 'closed' || t.status === 'partial_exit',
    );
    const withPnl = closed.filter((t) => t.pnl_percent != null);
    const wins = withPnl.filter((t) => Number(t.pnl_percent) > 0);
    const winRate = withPnl.length ? (wins.length / withPnl.length) * 100 : 0;
    const avgReturn =
      withPnl.length > 0
        ? withPnl.reduce((s, t) => s + Number(t.pnl_percent), 0) / withPnl.length
        : 0;
    return { totalTrades: effectiveTrades.length, winRate, avgReturn };
  }, [effectiveTrades]);

  const sortedTrades = useMemo(() => {
    let t = [...effectiveTrades];
    if (subTab === 'profitable') {
      t = t.filter((x) => x.pnl_percent != null && Number(x.pnl_percent) > 0);
      t.sort((a, b) => Number(b.pnl_percent) - Number(a.pnl_percent));
    } else if (subTab === 'popular') {
      t.sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0));
    } else {
      t.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return t;
  }, [effectiveTrades, subTab]);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      let prof = null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        username,
      );

      if (isUUID) {
        const { data: p1, error: e1 } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', username)
          .maybeSingle();
        if (e1) {
          console.error(e1);
          setNotFound(true);
          setProfile(null);
          setLoading(false);
          return;
        }
        prof = p1;
      } else {
        const { data: p1, error: e1 } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle();
        if (e1) {
          console.error(e1);
          setNotFound(true);
          setProfile(null);
          setLoading(false);
          return;
        }
        if (p1) {
          prof = p1;
        } else {
          const { data: p2 } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', username)
            .maybeSingle();
          prof = p2;
        }
      }

      if (!prof) {
        setNotFound(true);
        setProfile(null);
        setLoading(false);
        return;
      }
      setProfile(prof);

      const { count } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', prof.id);
      setFollowerCount(count || 0);

      if (user?.id && user.id !== prof.id) {
        const { data: fo } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', prof.id)
          .maybeSingle();
        setFollowing(!!fo);
      } else {
        setFollowing(false);
      }

      const viewerIsOwner = user?.id === prof.id;
      const showTrades = viewerIsOwner || prof.privacy_show_trades !== false;

      if (!showTrades) {
        setPrivacyBlocked(true);
        setTrades([]);
      } else {
        setPrivacyBlocked(false);
        const { data: tr } = await supabase
          .from('user_trades')
          .select('*')
          .eq('user_id', prof.id)
          .order('created_at', { ascending: false });
        // No fallback: show an empty state when the user has no real trades yet
        // rather than hallucinating deterministic fake option trades from the user ID.
        const safeTrades = tr || [];
        setTrades(safeTrades);
      }

      const { data: bm } = await supabase
        .from('user_trade_bookmarks')
        .select('trade_id')
        .eq('user_id', prof.id);
      const ids = (bm || []).map((b) => b.trade_id).filter(Boolean);
      if (ids.length > 0) {
        const { data: btr } = await supabase.from('user_trades').select('*').in('id', ids);
        setBookmarked(btr || []);
      } else {
        setBookmarked([]);
      }

      const res = await fetch(
        '/api/leaderboard?period=all_time&includeRising=1&limit=300&persist=0',
      );
      const js = await res.json();
      if (js.averages) setBenchmark(js.averages);

      const [followingRows, likedRows, commentRows, postRows] = await Promise.all([
        supabase
          .from('user_follows')
          .select('following_id, created_at')
          .eq('follower_id', prof.id)
          .limit(10),
        supabase.from('post_likes').select('post_id, created_at').eq('user_id', prof.id).limit(10),
        supabase
          .from('community_posts')
          .select('id, parent_post_id, content, created_at')
          .eq('user_id', prof.id)
          .not('parent_post_id', 'is', null)
          .limit(10),
        supabase
          .from('community_posts')
          .select('id, content, created_at')
          .eq('user_id', prof.id)
          .is('parent_post_id', null)
          .limit(10),
      ]);

      const followIds = (followingRows.data || []).map((r) => r.following_id).filter(Boolean);
      let followMap = {};
      if (followIds.length > 0) {
        const { data: followedProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, is_partner, partner_type')
          .in('id', followIds);
        followMap = Object.fromEntries((followedProfiles || []).map((p) => [p.id, p]));
      }

      const followingFeed = (followingRows.data || [])
        .map((r) => {
          const fp = followMap[r.following_id];
          return {
            id: r.following_id,
            username: fp?.username || '',
            name: fp?.full_name || fp?.username || 'User',
            avatar_url: fp?.avatar_url || '',
            is_partner: Boolean(fp?.is_partner),
            partner_type: fp?.partner_type || '',
            created_at: r.created_at,
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setFollowingItems(followingFeed);

      const { data: followerRows } = await supabase
        .from('user_follows')
        .select('follower_id, created_at')
        .eq('following_id', prof.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const followerIds = (followerRows || []).map((r) => r.follower_id).filter(Boolean);
      let followerMap = {};
      if (followerIds.length > 0) {
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, is_partner, partner_type')
          .in('id', followerIds);
        followerMap = Object.fromEntries((followerProfiles || []).map((p) => [p.id, p]));
      }

      const followerFeed = (followerRows || [])
        .map((r) => {
          const fp = followerMap[r.follower_id];
          return {
            id: r.follower_id,
            username: fp?.username || '',
            name: fp?.full_name || fp?.username || 'User',
            avatar_url: fp?.avatar_url || '',
            is_partner: Boolean(fp?.is_partner),
            partner_type: fp?.partner_type || '',
            created_at: r.created_at,
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setFollowerItems(followerFeed);

      const activity = [
        ...(followingRows.data || []).map((r) => {
          const fp = followMap[r.following_id];
          const person = fp?.username || fp?.full_name || 'a user';
          return {
            id: `f-${r.following_id}-${r.created_at}`,
            type: 'followed',
            text: `Started following ${person}`,
            created_at: r.created_at,
          };
        }),
        ...(likedRows.data || []).map((r) => ({
          id: `l-${r.post_id}-${r.created_at}`,
          type: 'liked',
          text: 'Liked a community post',
          created_at: r.created_at,
        })),
        ...(commentRows.data || []).map((r) => ({
          id: `c-${r.id}`,
          type: 'commented',
          text: `Commented: "${(r.content || '').slice(0, 80)}${(r.content || '').length > 80 ? '…' : ''}"`,
          created_at: r.created_at,
        })),
        ...(postRows.data || []).map((r) => ({
          id: `p-${r.id}`,
          type: 'posted',
          text: `Posted: "${(r.content || '').slice(0, 80)}${(r.content || '').length > 80 ? '…' : ''}"`,
          created_at: r.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20);

      // No fallback: show empty activity state for users who haven't engaged yet.
      setActivityItems(activity);
    } catch (e) {
      console.error(e);
      setNotFound(true);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [username, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id || !profile?.id || user.id !== profile.id) {
      setPlaidHoldingsPayload(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/plaid/holdings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) setPlaidHoldingsPayload(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.id]);

  async function toggleFollow() {
    if (!user?.id || !profile || isOwn) return;
    if (following) {
      await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.id);
      setFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from('user_follows')
        .insert({ follower_id: user.id, following_id: profile.id });
      setFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page-inset db-page">
        <div className="min-h-[60vh] animate-pulse space-y-4">
          <div className="h-28 rounded-xl bg-gray-200 dark:bg-[#1a1a24]" />
          <div className="h-56 rounded-xl bg-gray-200 dark:bg-[#1a1a24]" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="dashboard-page-inset db-page">
        <div className="rounded-xl border border-gray-200 dark:border-[#1a1a24] bg-white dark:bg-[#111118] p-8 text-center">
          <p className="text-lg text-gray-600 dark:text-[#9ca3af]">Profile not found</p>
          <Link href="/community" className="mt-4 inline-block text-emerald-400 hover:underline">
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  const display = profile.display_name || profile.full_name || profile.username;
  const pills = badgePills(statsQuick, profile.is_partner);

  return (
    <div className="dashboard-page-inset db-page comm-profile-page font-sans">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0">
          <div className="rounded-xl border border-gray-200 dark:border-[#1a1a24] bg-white dark:bg-[#111118] p-5">
            <div className="flex flex-col xl:flex-row xl:items-start gap-6">
              <div className="flex flex-wrap items-start gap-4 xl:w-[280px] xl:shrink-0">
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-2xl font-bold text-gray-600 dark:border-[#1a1a24] dark:bg-[#16161f] dark:text-[#9ca3af]"
                  style={{
                    backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : undefined,
                    backgroundSize: 'cover',
                  }}
                >
                  {!profile.avatar_url && (display?.[0] || '?').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      {profile.username || display}
                    </h1>
                    {profile.is_partner && <span title="Partner">⚡</span>}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-[#6b7280]">
                    {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pills.map((p) => (
                      <span
                        key={p.key}
                        className="rounded border border-gray-300 bg-gray-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:border-[#2a2a34] dark:bg-[#1a1a24] dark:text-[#9ca3af]"
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                  {!isOwn && user?.id && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleFollow}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20"
                      >
                        {following ? 'Unfollow' : 'Follow'}
                      </button>
                      <CopyRequestButton targetUserId={profile.id} />
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <MetricsGrid metrics={metrics} variant="compact" />
                {isOwn && (
                  <AchievementsGrid
                    positions={positions}
                    totalReturnPct={totalReturnPct}
                    variant="compact"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          {profile?.id && (
            <>
              <ProfileEloCard userId={profile.id} isOwn={isOwn} />
              <ProfileTradeNotes userId={profile.id} isOwn={isOwn} />
            </>
          )}
          <ProfilePerformancePanel
            userSeriesFull={userSeriesFull}
            isLive={activity.isLive}
            sourceTag={activity.sourceLabel}
            showSourceTag={isOwn && activity.source !== 'empty'}
            profileSource={isOwn && effectiveTrades.length === 0 ? 'empty-own' : null}
          />
        </aside>
      </div>
    </div>
  );
}
