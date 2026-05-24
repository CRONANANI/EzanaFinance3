'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useCommunityData } from './useCommunityData';
import { TopNav } from './TopNav';
import { NotificationsPanel, useNotificationCount } from './NotificationsPanel';
import { KpiCard } from './KpiCard';
import { KpiModal } from './KpiModal';
import { SearchBar } from './SearchBar';
import { Composer } from './Composer';
import { PostCard } from './PostCard';
import {
  SidebarTrendingDiscussions,
  SidebarTrendingTopics,
  SidebarFriendsActivity,
} from './Sidebar';

const FEED_TABS = ['Feed', 'Following', 'Friends', 'Discussions', 'Badges'];

function FeedSkeleton({ rows = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="ez-card ez-shimmer"
          style={{ padding: 18, minHeight: 140, borderRadius: 12 }}
          aria-hidden
        />
      ))}
    </div>
  );
}

function formatDateLine() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function HubConservative() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Feed');
  const [activeModal, setActiveModal] = useState(null);
  const [feedSort, setFeedSort] = useState('Latest');
  const [notifOpen, setNotifOpen] = useState(false);
  const [newPostCount, setNewPostCount] = useState(0);
  const [followingIds, setFollowingIds] = useState(new Set());

  const notifCount = useNotificationCount();

  const {
    posts,
    trendingTopics,
    trendingDiscussions,
    friendsActivity,
    suggestedUsers,
    topSector,
    loading,
    error,
    updatePostConviction,
    refetch,
  } = useCommunityData({
    feedTab: activeTab,
    feedSort,
    hasUser: !!user?.id,
  });

  useEffect(() => {
    const lastVisitKey = 'ezana.community.lastVisit';
    let lastVisit = null;
    try {
      const stored = window.localStorage.getItem(lastVisitKey);
      if (stored) lastVisit = new Date(stored);
    } catch {
      /* ignore */
    }

    try {
      window.localStorage.setItem(lastVisitKey, new Date().toISOString());
    } catch {
      /* ignore */
    }

    if (lastVisit && posts.length > 0) {
      const count = posts.filter((p) => {
        const created = new Date(p.created_at);
        return created > lastVisit;
      }).length;
      setNewPostCount(count);
    } else {
      setNewPostCount(posts.length);
    }
  }, [posts]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/community/follow?list=following');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setFollowingIds(new Set((data.following || []).map((u) => u.id)));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const displayName = useMemo(() => {
    return (
      user?.user_metadata?.first_name ||
      user?.user_metadata?.full_name?.split(' ')?.[0] ||
      user?.email?.split('@')[0] ||
      'there'
    );
  }, [user]);

  const greeting = getGreeting();
  const today = formatDateLine();
  const topPerformer = suggestedUsers[0] ?? null;
  const unfollowedSuggestions = suggestedUsers.filter((u) => !followingIds.has(u.id));

  const handleFeedTab = (t) => {
    if (t === 'Badges') {
      router.push('/badges');
      return;
    }
    setActiveTab(t);
  };

  return (
    <div
      className="ezana-theme"
      style={{ minHeight: '100%', background: 'var(--bg-primary)', position: 'relative' }}
    >
      <TopNav
        active="Community"
        onOpenNotifications={() => setNotifOpen(true)}
        notifCount={notifCount}
      />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      <div style={{ padding: '20px 28px', maxWidth: 1320, margin: '0 auto' }}>
        <div
          style={{
            marginBottom: 22,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {greeting}, {displayName}{' '}
              <span style={{ fontSize: 22 }} aria-hidden>
                👋
              </span>
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {loading
                ? 'Loading community feed…'
                : `${posts.length} posts in your feed. Join the conversation around markets and investing.`}
            </p>
          </div>
          <div
            className="ez-pill"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-input)',
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            <i className="bi bi-clock" style={{ fontSize: 11 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{today}</span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <KpiCard
            icon="bi-chat-square-text"
            label="New posts"
            value={loading ? '…' : newPostCount > 0 ? `+${newPostCount}` : String(posts.length)}
            sub={newPostCount > 0 ? 'since your last visit' : 'in current feed'}
            tone="emerald"
            chevron="down"
            onClick={() => {
              const feed = document.querySelector('[data-feed-anchor]');
              if (feed) feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <KpiCard
            icon="bi-graph-up-arrow"
            label="Top performer"
            value={topPerformer ? `@${topPerformer.username || 'leader'}` : '—'}
            sub={
              topPerformer
                ? `${topPerformer.return >= 0 ? '+' : ''}${topPerformer.return}% this week`
                : 'Leaderboard'
            }
            tone="positive"
            onClick={() => setActiveModal('top-performer')}
          />
          <KpiCard
            icon="bi-bar-chart-line"
            label="Sector momentum"
            value={topSector?.name || (loading ? '…' : '—')}
            sub={
              topSector
                ? `${topSector.pct >= 0 ? '+' : ''}${topSector.pct.toFixed(1)}% past 7d`
                : 'Data unavailable'
            }
            tone="info"
            onClick={() => setActiveModal('sector-momentum')}
          />
          <KpiCard
            icon="bi-stars"
            label="Suggested for you"
            value={
              loading
                ? '…'
                : `${unfollowedSuggestions.length} investor${unfollowedSuggestions.length === 1 ? '' : 's'}`
            }
            sub={
              unfollowedSuggestions[0]
                ? `Top: ${unfollowedSuggestions[0].name}`
                : 'Build your network'
            }
            tone="gold"
            onClick={() => setActiveModal('investors-to-follow')}
          />
        </div>

        <SearchBar />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 20,
            marginTop: 18,
          }}
        >
          <div>
            <Composer onPosted={refetch} />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 18,
                marginBottom: 12,
                padding: '0 4px',
              }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                {FEED_TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleFeedTab(t)}
                    style={{
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `2px solid ${activeTab === t ? 'var(--emerald)' : 'transparent'}`,
                      color: activeTab === t ? 'var(--emerald)' : 'var(--text-muted)',
                      fontWeight: activeTab === t ? 700 : 500,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {t === 'Badges' && <i className="bi bi-award" style={{ fontSize: 12 }} />}
                    {t}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={feedSort}
                  onChange={(e) => setFeedSort(e.target.value)}
                  style={{
                    background: 'var(--surface-input)',
                    border: '1px solid var(--border-input)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '6px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <option>Latest</option>
                  <option>Popular</option>
                  <option>Following</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const el =
                      document.querySelector('[data-composer-anchor]') ||
                      document.querySelector('[data-feed-anchor]');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="ez-btn ez-btn--primary"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  <i className="bi bi-pencil-square" style={{ fontSize: 12 }} />
                  New Post
                </button>
              </div>
            </div>

            {error && (
              <div style={{ color: 'var(--negative)', fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}

            {loading ? (
              <FeedSkeleton />
            ) : (
              <div data-feed-anchor style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {posts.length === 0 && (
                  <div
                    className="ez-card"
                    style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    No posts to show yet.
                  </div>
                )}
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onConvictionChange={(stats) => updatePostConviction(p.id, stats)}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SidebarTrendingDiscussions discussions={trendingDiscussions} />
            <SidebarTrendingTopics topics={trendingTopics} />
            <SidebarFriendsActivity activity={friendsActivity} />
          </div>
        </div>
      </div>

      {activeModal && (
        <KpiModal
          type={activeModal}
          onClose={() => setActiveModal(null)}
          topPerformer={topPerformer}
          suggestedUsers={unfollowedSuggestions.length ? unfollowedSuggestions : suggestedUsers}
        />
      )}
    </div>
  );
}
