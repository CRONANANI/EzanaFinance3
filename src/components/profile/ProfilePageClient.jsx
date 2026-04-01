'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
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

  const isOwn = Boolean(user?.id && profile?.id === user.id);

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
      const { data: p1, error: e1 } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
      if (e1) {
        console.error(e1);
        setNotFound(true);
        setProfile(null);
        setLoading(false);
        return;
      }
      if (p1) prof = p1;
      else {
        const { data: p2 } = await supabase.from('profiles').select('*').ilike('username', username).maybeSingle();
        prof = p2;
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
        setTrades(tr || []);
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
      <div className="min-h-[60vh] animate-pulse space-y-4 p-6">
        <div className="h-24 rounded-xl bg-[#1a1a24]" />
        <div className="h-40 rounded-xl bg-[#1a1a24]" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg text-[#9ca3af]">Profile not found</p>
        <Link href="/home-dashboard" className="mt-4 inline-block text-emerald-400 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const display = profile.display_name || profile.full_name || profile.username;
  const pills = badgePills(statsQuick, profile.is_partner);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex flex-wrap items-start gap-4">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-[#1a1a24] bg-[#16161f] text-2xl font-bold text-[#9ca3af]"
              style={{
                backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : undefined,
                backgroundSize: 'cover',
              }}
            >
              {!profile.avatar_url && (display?.[0] || '?').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{profile.username || display}</h1>
                {profile.is_partner && <span title="Partner">⚡</span>}
              </div>
              <p className="mt-1 text-sm text-[#6b7280]">{followerCount} subscribers</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pills.map((p) => (
                  <span
                    key={p.key}
                    className="rounded-full border border-[#2a2a34] bg-[#1a1a24] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]"
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

          <div className="mt-8 border-b border-[#1a1a24]">
            <div className="flex gap-6">
              {['trades', 'bookmarked'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`border-b-2 pb-3 text-sm font-semibold transition ${
                    tab === t ? 'border-emerald-500 text-white' : 'border-transparent text-[#6b7280]'
                  }`}
                >
                  {t === 'trades' ? 'My Trades' : 'Bookmarked'}
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
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        subTab === s ? 'bg-[#1a1a24] text-white' : 'text-[#6b7280] hover:text-[#9ca3af]'
                      }`}
                    >
                      {s === 'recent' ? 'Recents' : s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 rounded-lg border border-[#1a1a24] p-1">
                  <button
                    type="button"
                    className={`rounded px-2 py-1 text-xs ${viewMode === 'card' ? 'bg-[#1a1a24] text-white' : 'text-[#6b7280]'}`}
                    onClick={() => setViewMode('card')}
                  >
                    ▦
                  </button>
                  <button
                    type="button"
                    className={`rounded px-2 py-1 text-xs ${viewMode === 'list' ? 'bg-[#1a1a24] text-white' : 'text-[#6b7280]'}`}
                    onClick={() => setViewMode('list')}
                  >
                    ☰
                  </button>
                </div>
              </div>

              {privacyBlocked ? (
                <p className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center text-sm text-[#9ca3af]">
                  This user has hidden their trades.
                </p>
              ) : (
                <div className={`mt-6 space-y-4 ${viewMode === 'list' ? 'space-y-2' : ''}`}>
                  {sortedTrades.length === 0 ? (
                    <p className="text-sm text-[#6b7280]">No trades yet.</p>
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
                <p className="text-sm text-[#6b7280]">No bookmarked trades.</p>
              ) : (
                bookmarked.map((tr) => <TradeCard key={tr.id} trade={tr} isOwner={false} />)
              )}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <ProfilePerformancePanel trades={trades} benchmarkAverages={benchmark} />
        </div>
      </div>
    </div>
  );
}
