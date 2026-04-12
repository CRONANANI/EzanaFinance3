'use client';

import '@/app/(dashboard)/community/community.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { supabase } from '@/lib/supabase';
import { generateMockActivityForUser, generateMockTradesForUser } from '@/lib/profileMockData';
import { TradeCard } from './TradeCard';
import { ProfilePerformancePanel } from './ProfilePerformancePanel';

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
  const [plaidHoldingsPayload, setPlaidHoldingsPayload] = useState(null);

  const mock = useMockPortfolio();
  const useLiveHoldings =
    !!plaidHoldingsPayload?.connected && (plaidHoldingsPayload?.aggregated?.length ?? 0) > 0;

  const isOwn = Boolean(user?.id && profile?.id === user.id);

  /** Own profile only: Plaid holdings → mock positions → empty. Others: null → use `trades` from user_trades. */
  const portfolioTradesForPerf = useMemo(() => {
    if (!isOwn) return null;
    if (useLiveHoldings && plaidHoldingsPayload?.aggregated?.length) {
      return plaidHoldingsPayload.aggregated.map((p, idx) => ({
        id: `plaid-${p.ticker || 'x'}-${idx}`,
        ticker: p.ticker,
        status: 'closed',
        pnl_percent:
          p.gainLossPercent != null
            ? Number(p.gainLossPercent)
            : p.totalCostBasis > 0
              ? ((p.totalValue - p.totalCostBasis) / p.totalCostBasis) * 100
              : 0,
        created_at: new Date().toISOString(),
      }));
    }
    if (mock?.enrichedPositions?.length) {
      return mock.enrichedPositions.map((p) => ({
        id: `mock-${p.symbol}`,
        ticker: p.symbol,
        status: 'closed',
        pnl_percent: Number(p.pnlPct) || 0,
        created_at: new Date().toISOString(),
      }));
    }
    return [];
  }, [isOwn, useLiveHoldings, plaidHoldingsPayload, mock?.enrichedPositions]);

  const statsQuick = useMemo(() => {
    const closed = trades.filter((t) => t.status === 'closed' || t.status === 'partial_exit');
    const withPnl = closed.filter((t) => t.pnl_percent != null);
    const wins = withPnl.filter((t) => Number(t.pnl_percent) > 0);
    const winRate = withPnl.length ? (wins.length / withPnl.length) * 100 : 0;
    const avgReturn =
      withPnl.length > 0
        ? withPnl.reduce((s, t) => s + Number(t.pnl_percent), 0) / withPnl.length
        : 0;
    return { totalTrades: trades.length, winRate, avgReturn };
  }, [trades]);

  const sortedTrades = useMemo(() => {
    let t = [...trades];
    if (subTab === 'profitable') {
      t = t.filter((x) => x.pnl_percent != null && Number(x.pnl_percent) > 0);
      t.sort((a, b) => Number(b.pnl_percent) - Number(a.pnl_percent));
    } else if (subTab === 'popular') {
      t.sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0));
    } else {
      t.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return t;
  }, [trades, subTab]);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      let prof = null;
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);

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
        const safeTrades = tr && tr.length > 0 ? tr : generateMockTradesForUser(prof.id);
        setTrades(safeTrades);
      }

      const { data: bm } = await supabase.from('user_trade_bookmarks').select('trade_id').eq('user_id', prof.id);
      const ids = (bm || []).map((b) => b.trade_id).filter(Boolean);
      if (ids.length > 0) {
        const { data: btr } = await supabase.from('user_trades').select('*').in('id', ids);
        setBookmarked(btr || []);
      } else {
        setBookmarked([]);
      }

      const res = await fetch('/api/leaderboard?period=all_time&includeRising=1&limit=300&persist=0');
      const js = await res.json();
      if (js.averages) setBenchmark(js.averages);

      const [followingRows, likedRows, commentRows, postRows] = await Promise.all([
        supabase.from('user_follows').select('following_id, created_at').eq('follower_id', prof.id).limit(10),
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

      setActivityItems(activity.length ? activity : generateMockActivityForUser(prof.id));
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
      await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', profile.id);
      setFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from('user_follows').insert({ follower_id: user.id, following_id: profile.id });
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
            <div className="flex flex-wrap items-start gap-4">
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.username || display}</h1>
                {profile.is_partner && <span title="Partner">⚡</span>}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-[#6b7280]">{followerCount} subscribers</p>
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
                <button
                  type="button"
                  onClick={toggleFollow}
                  className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20"
                >
                  {following ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 border-b border-gray-200 dark:border-[#1a1a24]">
            <div className="flex gap-6">
              {['trades', 'following', 'activity', 'bookmarked'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`border-b-2 pb-3 text-sm font-semibold transition ${
                    tab === t ? 'border-emerald-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-[#6b7280]'
                  }`}
                >
                  {t === 'trades'
                    ? 'My Trades'
                    : t === 'following'
                      ? 'Following'
                      : t === 'activity'
                        ? 'My Activity'
                        : 'Bookmarked'}
                </button>
              ))}
            </div>
          </div>

          {tab === 'trades' && (
            <>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {['recent', 'popular', 'profitable'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSubTab(s)}
                      className={`rounded px-3 py-1.5 text-xs font-medium capitalize ${
                        subTab === s ? 'bg-gray-200 dark:bg-[#1a1a24] text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-600 dark:text-[#6b7280] dark:hover:text-[#9ca3af]'
                      }`}
                    >
                      {s === 'recent' ? 'Recents' : s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 rounded border border-gray-200 dark:border-[#1a1a24] p-1">
                  <button
                    type="button"
                    className={`rounded px-2 py-1 text-xs ${viewMode === 'card' ? 'bg-gray-200 dark:bg-[#1a1a24] text-gray-900 dark:text-white' : 'text-gray-500 dark:text-[#6b7280]'}`}
                    onClick={() => setViewMode('card')}
                  >
                    ▦
                  </button>
                  <button
                    type="button"
                    className={`rounded px-2 py-1 text-xs ${viewMode === 'list' ? 'bg-gray-200 dark:bg-[#1a1a24] text-gray-900 dark:text-white' : 'text-gray-500 dark:text-[#6b7280]'}`}
                    onClick={() => setViewMode('list')}
                  >
                    ☰
                  </button>
                </div>
              </div>

              {privacyBlocked ? (
                <p className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center text-sm text-gray-600 dark:text-[#9ca3af]">
                  This user has hidden their trades.
                </p>
              ) : (
                <div className={`mt-6 ${viewMode === 'list' ? 'space-y-2' : 'space-y-4'}`}>
                  {sortedTrades.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-[#6b7280]">No trades yet.</p>
                  ) : (
                    sortedTrades.map((tr) => <TradeCard key={tr.id} trade={tr} isOwner={isOwn} />)
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'bookmarked' && (
            <div className="mt-6 space-y-4">
              {bookmarked.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-[#6b7280]">No bookmarked trades.</p>
              ) : (
                bookmarked.map((tr) => <TradeCard key={tr.id} trade={tr} isOwner={false} />)
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="mt-6 space-y-3">
              {activityItems.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-[#6b7280]">No activity yet.</p>
              ) : (
                activityItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 dark:border-[#1a1a24] bg-gray-50 dark:bg-[#111118] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-800 dark:text-[#e5e7eb]">{item.text}</p>
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-600 dark:bg-[#1a1a24] dark:text-[#9ca3af]">
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-[#6b7280]">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'following' && (
            <div className="mt-6 space-y-3">
              {followingItems.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-[#6b7280]">This user is not following anyone yet.</p>
              ) : (
                followingItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/profile/${item.username || item.id}`}
                    className="block rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-emerald-200 dark:border-[#1a1a24] dark:bg-[#111118] dark:hover:border-[#2a2a34]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-600 dark:border-[#1a1a24] dark:bg-[#16161f] dark:text-[#9ca3af]"
                          style={{ backgroundImage: item.avatar_url ? `url(${item.avatar_url})` : undefined, backgroundSize: 'cover' }}
                        >
                          {!item.avatar_url && (item.name?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-[#f5f5f5]">{item.name}</p>
                          <p className="truncate text-xs text-gray-500 dark:text-[#6b7280]">
                            @{item.username || item.id}
                            {item.is_partner ? ` · ${item.partner_type || 'Legendary Investor'}` : ''}
                          </p>
                        </div>
                      </div>
                      {item.is_partner && (
                        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                          Legendary
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
          </div>
        </section>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <ProfilePerformancePanel
            trades={portfolioTradesForPerf ?? trades}
            benchmarkAverages={benchmark}
            emptyCopyIsPortfolio={isOwn}
          />
        </aside>
      </div>
    </div>
  );
}
