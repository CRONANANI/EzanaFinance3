'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { supabase } from '@/lib/supabase-browser';
import { useProfileActivity } from '@/hooks/useProfileActivity';
import { useAchievements } from '@/hooks/useAchievements';
import { computeProfileMetrics } from '@/lib/profile-metrics';

import { ProfileNav } from './ProfileNav';
import { IdentityHero } from './IdentityHero';
import { PerfStats } from './PerfStats';
import { Achievements } from './Achievements';
import { PerfChart } from './PerfChart';
import { EloRatingCard } from './EloRatingCard';
import { WaysToImprove } from './WaysToImprove';
import { TradeNotesPanel } from './TradeNotesPanel';

import {
  mapProfileUser,
  mapPerfStats,
  mapAchievements,
  mapPerformanceSeries,
  generateHeuristicQuests,
} from './mappers';

import './profile-redesign.css';

export function ProfilePageStripe({ username }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [trades, setTrades] = useState([]);
  const [privacyBlocked, setPrivacyBlocked] = useState(false);
  const [plaidHoldingsPayload, setPlaidHoldingsPayload] = useState(null);
  const [eloState, setEloState] = useState(null);
  const [meData, setMeData] = useState(null);
  const [totalTraders, setTotalTraders] = useState(0);
  const [chartRange, setChartRange] = useState('1M');
  const [platformChartResp, setPlatformChartResp] = useState(null);

  const mock = useMockPortfolio();
  const activity = useProfileActivity();

  const useLiveHoldings =
    !!plaidHoldingsPayload?.connected && (plaidHoldingsPayload?.aggregated?.length ?? 0) > 0;

  const isOwn = Boolean(user?.id && profile?.id === user.id);

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

  const achievementsState = useAchievements({
    positions: isOwn ? positions : [],
    totalReturnPct: isOwn ? totalReturnPct : 0,
  });

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
        if (e1 || !p1) {
          setNotFound(true);
          setProfile(null);
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
          setNotFound(true);
          setProfile(null);
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
        setTrades(tr || []);
      }

      try {
        const eloRes = await fetch(`/api/elo/user/${prof.id}`);
        if (eloRes.ok) {
          setEloState(await eloRes.json());
        } else {
          setEloState(null);
        }
      } catch {
        setEloState(null);
      }

      if (viewerIsOwner) {
        try {
          const meRes = await fetch('/api/leaderboard/me');
          if (meRes.ok) {
            setMeData(await meRes.json());
          }
        } catch {
          setMeData(null);
        }
      } else {
        setMeData(null);
      }

      try {
        const statsRes = await fetch('/api/leaderboard/stats');
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setTotalTraders(stats.totalTraders ?? stats.total_users ?? 0);
        }
      } catch {
        setTotalTraders(0);
      }
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

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/platform-aggregates?window=${encodeURIComponent(chartRange)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setPlatformChartResp(d);
      })
      .catch(() => {
        if (!cancelled) setPlatformChartResp(null);
      });
    return () => {
      cancelled = true;
    };
  }, [chartRange]);

  const profileUser = useMemo(
    () =>
      profile
        ? mapProfileUser({
            profile,
            followerCount,
            eloState,
            meData,
            totalTraders,
          })
        : null,
    [profile, followerCount, eloState, meData, totalTraders],
  );

  const perfStats = useMemo(() => (metrics ? mapPerfStats(metrics) : []), [metrics]);

  const achievements = useMemo(
    () => (isOwn ? mapAchievements(achievementsState) : []),
    [isOwn, achievementsState],
  );

  const performance = useMemo(
    () => mapPerformanceSeries(userSeriesFull, chartRange, platformChartResp),
    [userSeriesFull, chartRange, platformChartResp],
  );

  const quests = useMemo(
    () =>
      isOwn
        ? generateHeuristicQuests({
            metrics,
            achievementsState,
            activity: { streakDays: meData?.streakDays ?? 0 },
          })
        : [],
    [isOwn, metrics, achievementsState, meData?.streakDays],
  );

  const toggleFollow = useCallback(async () => {
    if (!user?.id || !profile?.id || isOwn) return;
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
  }, [user?.id, profile?.id, isOwn, following]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/profile/${profile?.username || username}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: profile?.full_name || profile?.username || username,
          url,
        });
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* unavailable */
      }
    }
  }, [profile, username]);

  if (loading) {
    return (
      <div className="profile-stripe-wrap">
        <div className="profile-stripe-body">
          <div className="profile-stripe-left">
            <div
              style={{ height: 160, background: 'var(--bg-tertiary, #f7f7f8)', borderRadius: 12 }}
            />
            <div
              style={{ height: 240, background: 'var(--bg-tertiary, #f7f7f8)', borderRadius: 12 }}
            />
            <div
              style={{ height: 200, background: 'var(--bg-tertiary, #f7f7f8)', borderRadius: 12 }}
            />
          </div>
          <div className="profile-stripe-right">
            <div
              style={{ height: 280, background: 'var(--bg-tertiary, #f7f7f8)', borderRadius: 12 }}
            />
            <div
              style={{ height: 240, background: 'var(--bg-tertiary, #f7f7f8)', borderRadius: 12 }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profileUser) {
    return (
      <div className="profile-stripe-wrap">
        <div style={{ padding: 80, textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Profile not found</h2>
          <Link
            href="/community"
            style={{ color: 'var(--emerald, #15803d)', marginTop: 12, display: 'inline-block' }}
          >
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  const showChart = !privacyBlocked || isOwn;

  return (
    <div className="profile-stripe-wrap">
      <ProfileNav
        userName={profileUser.name}
        onShare={handleShare}
        onFollow={toggleFollow}
        isFollowing={following}
        showActions={!isOwn && !!user?.id}
      />

      <div className="profile-stripe-body">
        <div className="profile-stripe-left">
          <IdentityHero user={profileUser} />
          <PerfStats stats={perfStats} />
          {isOwn && <Achievements achievements={achievements} />}
          {showChart && (
            <PerfChart
              performance={performance}
              range={chartRange}
              onRangeChange={setChartRange}
              isLive={isOwn && activity.isLive}
              sourceLabel={isOwn ? activity.sourceLabel : undefined}
            />
          )}
        </div>

        <div className="profile-stripe-right">
          <EloRatingCard user={profileUser} />
          {isOwn && <WaysToImprove quests={quests} />}
          <TradeNotesPanel userId={profile.id} isOwn={isOwn} />
        </div>
      </div>
    </div>
  );
}
