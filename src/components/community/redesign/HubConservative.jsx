'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useCommunityData } from './useCommunityData';
import { TopNav, PageTabs } from './TopNav';
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
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [composerMode, setComposerMode] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const notifCount = useNotificationCount();

  const {
    posts,
    trendingTopics,
    trendingDiscussions,
    friendsActivity,
    suggestedUsers,
    loading,
    error,
    updatePostConviction,
    refetch,
  } = useCommunityData({
    feedTab: activeTab,
    feedSort,
    hasUser: !!user?.id,
  });

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

  const handleFeedTab = (t) => {
    if (t === 'Badges') {
      router.push('/badges');
      return;
    }
    setActiveTab(t);
  };

  const handlePageTab = (t) => {
    if (t === 'Messages') router.push('/community/messages');
    if (t === 'My Profile' && user?.id) {
      const handle = user.user_metadata?.username || user.id;
      router.push(`/profile/${handle}`);
    }
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <PageTabs active="Community" onChange={handlePageTab} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              className="ez-pill"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-input)',
                color: 'var(--text-muted)',
              }}
            >
              <i className="bi bi-clock" style={{ fontSize: 11 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{today}</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
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
            value={loading ? '…' : String(posts.length)}
            sub="in current feed"
            tone="emerald"
            chevron="down"
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
            value="Technology"
            sub="+4.2% past 7d"
            tone="info"
            onClick={() => setActiveModal('sector-momentum')}
          />
          <KpiCard
            icon="bi-stars"
            label="Suggested for you"
            value={`${suggestedUsers.length || 0} investors`}
            sub={topPerformer ? `Top: ${topPerformer.name}` : 'From leaderboard'}
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
            <Composer
              expanded={composerExpanded}
              setExpanded={setComposerExpanded}
              text={composerText}
              setText={setComposerText}
              mode={composerMode}
              setMode={setComposerMode}
              onPosted={refetch}
            />

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
                  onClick={() => setComposerExpanded(true)}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          suggestedUsers={suggestedUsers}
        />
      )}
    </div>
  );
}
