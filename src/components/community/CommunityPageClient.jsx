'use client';

import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import '@/app/(dashboard)/community/community.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { usePartner } from '@/contexts/PartnerContext';

/* CommunityFeedPost pulls in Recharts (for the ticker embed charts some
   posts have) plus its own 700+ line UI. Feed posts render below the
   composer and the first user interaction is typically with the composer,
   so we dynamic-import the feed post component. Result: Recharts stays
   out of the initial /community bundle (~289 kB before → measurably
   smaller). A minimal placeholder prevents the feed from collapsing
   while the chunk streams in. */
const CommunityFeedPost = dynamic(
  () => import('@/components/community/CommunityFeedPost').then((m) => ({ default: m.CommunityFeedPost })),
  { ssr: false, loading: () => <div className="community-feed-post-skeleton" style={{ minHeight: 180 }} aria-hidden /> }
);
import { LearningCommunityBadgesPanel } from '@/components/community/LearningCommunityBadgesPanel';
import { CommunitySocialConnectCard } from '@/components/community/CommunitySocialConnectCard';
import { UserSearch } from '@/components/community/UserSearch';
import { FeedComposer } from '@/components/community/FeedComposer';
import {
  extractTickerFromContent,
  formatRelativeTime,
  getInitials,
  normalizeTickerEmbed,
} from '@/lib/community-utils';
import { supabase } from '@/lib/supabase';
import { MOCK_DISCUSSIONS } from '@/lib/orgMockData';
import { auditContrast } from '@/lib/a11y/audit-contrast';

const TRENDING_TOPICS = [
  { tag: 'EarningsSeason', posts: '1.2K', category: 'Macro', trend: 'up' },
  { tag: 'AIStocks', posts: '892', category: 'Tech', trend: 'up' },
  { tag: 'LongTermGrowth', posts: '745', category: 'Strategy', trend: 'up' },
  { tag: 'Crypto', posts: '612', category: 'Digital Assets', trend: 'down' },
  { tag: 'DividendInvesting', posts: '523', category: 'Income', trend: 'up' },
  { tag: 'FedWatch', posts: '489', category: 'Macro', trend: 'up' },
  { tag: 'Semiconductors', posts: '445', category: 'Tech', trend: 'up' },
  { tag: 'RenewableEnergy', posts: '412', category: 'ESG', trend: 'down' },
  { tag: 'EmergingMarkets', posts: '389', category: 'Global', trend: 'up' },
  { tag: 'IPOWatch', posts: '367', category: 'New Listings', trend: 'up' },
  { tag: 'OptionsFlow', posts: '321', category: 'Derivatives', trend: 'down' },
  { tag: 'ValueInvesting', posts: '298', category: 'Strategy', trend: 'up' },
  { tag: 'RealEstate', posts: '276', category: 'Alternative', trend: 'down' },
  { tag: 'Commodities', posts: '255', category: 'Macro', trend: 'up' },
  { tag: 'RiskManagement', posts: '234', category: 'Strategy', trend: 'up' },
];

const FRIENDS_ACTIVITY_MOCK = [
  { name: 'Emily Chen', username: 'emilyc', action: 'Bought $AAPL', ret: '+2.35%', direction: 'pos', time: '2h' },
  { name: 'Michael Torres', username: 'miketorres', action: 'Sold $TSLA', ret: '-1.23%', direction: 'neg', time: '3h' },
  { name: 'Alex Morgan', username: 'alexm', action: 'Commented on a post', ret: null, direction: null, time: '4h' },
  { name: 'Sarah Lee', username: 'sarahlee', action: 'Created a new post', ret: null, direction: null, time: '5h' },
  { name: 'David Park', username: 'dpark', action: 'Liked a post', ret: null, direction: null, time: '6h' },
];

const TRENDING_DISCUSSIONS = [
  { title: 'The Future of AI in Investing', author: '@tech_investor', comments: 124, tone: 'emerald' },
  { title: 'Best Long-Term Stocks for 2026', author: '@value_hunter', comments: 98, tone: 'emerald' },
  { title: 'Crypto Market Outlook', author: '@crypto_king', comments: 87, tone: 'emerald' },
  { title: 'FED Rate Decision Impact', author: '@macro_mind', comments: 65, tone: 'amber' },
  { title: 'Green Energy Stocks', author: '@green_future', comments: 43, tone: 'indigo' },
];

const DISCUSSION_TONE_TO_CSS = {
  emerald: { background: 'rgba(16,185,129,0.12)', color: '#10b981' },
  amber: { background: 'rgba(245,158,11,0.14)', color: '#d97706' },
  indigo: { background: 'rgba(99,102,241,0.14)', color: '#6366f1' },
};

const FEED_TABS = ['Feed', 'Following', 'Friends', 'Discussions', 'Badges'];
const PAGE_TABS = ['Community', 'My Profile', 'Messages'];

function tabToApiParam(feedTab, feedSort, hasUser) {
  if (feedTab === 'Badges') return 'recent';
  if (feedTab === 'Following' || feedTab === 'Friends') return 'following';
  if (feedTab === 'Discussions') {
    return feedSort === 'Popular' ? 'trending' : 'recent';
  }
  if (feedTab === 'Feed') {
    if (feedSort === 'Popular') return 'trending';
    if (feedSort === 'Following' && hasUser) return 'following';
    return 'recent';
  }
  return 'recent';
}

function hashReturnPct(userId) {
  if (!userId) return '+8.2%';
  let h = 0;
  const s = String(userId);
  for (let i = 0; i < s.length; i += 1) h = Math.imul(31, h) + s.charCodeAt(i);
  const v = ((Math.abs(h) % 220) - 80) / 10;
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDateLine() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function rankPillClass(index) {
  if (index === 0) return 'comm-rank-pill comm-rank-pill--1';
  if (index === 1) return 'comm-rank-pill comm-rank-pill--2';
  if (index === 2) return 'comm-rank-pill comm-rank-pill--3';
  return 'comm-rank-pill';
}

function FeedSkeleton({ rows = 3 }) {
  return (
    <div className="db-card comm-skeleton-list" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="comm-skeleton-row">
          <div className="comm-skeleton-avatar" />
          <div className="comm-skeleton-lines">
            <div className="comm-skeleton-line comm-skeleton-line--short" />
            <div className="comm-skeleton-line comm-skeleton-line--mid" />
            <div className="comm-skeleton-line comm-skeleton-line--full" />
            {i === 0 && <div className="comm-skeleton-line comm-skeleton-line--block" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommunityPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOrgUser } = useOrg();
  const { isPartner } = usePartner();

  const [userProfile, setUserProfile] = useState(null);
  const [feedTab, setFeedTab] = useState('Feed');
  const [feedSort, setFeedSort] = useState('Latest');
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedMessage, setFeedMessage] = useState('');
  const [feedError, setFeedError] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [composerText, setComposerText] = useState('');
  const [posting, setPosting] = useState(false);
  const [composerImage, setComposerImage] = useState(null);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showTickerSearch, setShowTickerSearch] = useState(false);
  const [tickerQuery, setTickerQuery] = useState('');
  const [tickerEmbedSymbols, setTickerEmbedSymbols] = useState([]);
  const [tickerStep, setTickerStep] = useState('search');
  const [tickerPeriod, setTickerPeriod] = useState('1M');
  const [quoteMap, setQuoteMap] = useState({});
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [suggestedError, setSuggestedError] = useState(false);
  const [followBusy, setFollowBusy] = useState({});

  const firstName = useMemo(() => {
    const raw =
      userProfile?.full_name ||
      userProfile?.display_name ||
      user?.user_metadata?.full_name ||
      '';
    const part = String(raw).trim().split(/\s+/)[0];
    return part || 'there';
  }, [userProfile, user]);

  const fetchFeed = useCallback(async () => {
    if (feedTab === 'Badges') {
      setFeedLoading(false);
      setFeedMessage('');
      setFeedError(false);
      return;
    }
    setFeedLoading(true);
    setFeedMessage('');
    setFeedError(false);
    try {
      if (isOrgUser) {
        let orgRows = MOCK_DISCUSSIONS;
        if (feedTab === 'Discussions') {
          orgRows = orgRows.filter((d) => /#[A-Za-z][A-Za-z0-9_]*/.test(d.content || ''));
        }
        const rows = orgRows.slice(0, 20).map((d) => ({
          id: d.id,
          text: d.content,
          userId: null,
          username: '',
          name: d.author_name,
          initials: getInitials(d.author_name),
          time: d.time,
          badge: d.type === 'announcement' ? 'Announcement' : null,
          tickerSym: extractTickerFromContent(d.content),
          likes: 0,
          comments: d.replies ?? 0,
          reposts: 0,
          liked_by_me: false,
          saved_by_me: false,
          returnBadge: hashReturnPct(d.id),
          isPartner: false,
        }));
        setFeedPosts(rows);
        setFeedLoading(false);
        return;
      }

      const apiTab = tabToApiParam(feedTab, feedSort, !!user?.id);
      const res = await fetch(`/api/community/posts?tab=${encodeURIComponent(apiTab)}`);
      const data = await res.json();
      if (!res.ok) {
        setFeedPosts([]);
        setFeedMessage(data.error || 'Could not load posts');
        setFeedError(true);
        return;
      }
      if (data.message) setFeedMessage(data.message);

      let mapped = (data.posts || []).map((p) => ({
        id: p.id,
        text: p.content,
        userId: p.author?.id,
        username: p.author?.username || '',
        name: (p.author?.display_name || '').trim() || 'Member',
        initials: getInitials(p.author?.display_name || 'Member'),
        time: formatRelativeTime(p.created_at),
        badge: null,
        tickerSym: (() => {
          const te = normalizeTickerEmbed(p.ticker_embed);
          if (te?.symbols?.length) return te.symbols[0].symbol;
          return p.mentioned_ticker || extractTickerFromContent(p.content);
        })(),
        likes: p.likes_count ?? 0,
        comments: p.comments_count ?? 0,
        reposts: p.reposts_count ?? 0,
        liked_by_me: !!p.liked_by_me,
        saved_by_me: !!p.saved_by_me,
        image_url: p.image_url ?? null,
        poll_data: p.poll_data ?? null,
        ticker_embed: p.ticker_embed ?? null,
        my_vote: p.my_vote ?? null,
        returnBadge: hashReturnPct(p.author?.id || p.id),
        isPartner: false,
      }));

      const userIds = [...new Set(mapped.map((m) => m.userId).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, is_partner')
          .in('id', userIds);
        const pmap = Object.fromEntries(
          (profs || []).map((r) => [r.id, r.is_partner === true]),
        );
        mapped = mapped.map((m) => ({ ...m, isPartner: pmap[m.userId] || false }));
      }

      if (feedTab === 'Discussions') {
        mapped = mapped.filter((p) => /#[A-Za-z][A-Za-z0-9_]*/.test(p.text || ''));
      }

      setFeedPosts(mapped);
    } catch (e) {
      console.error(e);
      setFeedPosts([]);
      setFeedMessage('Could not load posts');
      setFeedError(true);
    } finally {
      setFeedLoading(false);
    }
  }, [feedTab, feedSort, user?.id, isOrgUser]);

  useEffect(() => {
    if (!user?.id) {
      setUserProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, display_name, username')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setUserProfile(data || {});
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    const syms = [...new Set(feedPosts.map((p) => p.tickerSym).filter(Boolean))];
    if (syms.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/market/batch-quotes?symbols=${syms.join(',')}`);
        if (!res.ok) return;
        const data = await res.json();
        const q = data.quotes || {};
        if (!cancelled) {
          const next = {};
          for (const s of syms) {
            const row = q[s];
            if (row) {
              next[s] = {
                price: row.price ?? row.last ?? row.ap ?? 0,
                changePercent:
                  row.changePercent ?? row.change_percent ?? row.pct ?? 0,
              };
            }
          }
          setQuoteMap(next);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feedPosts]);

  const loadSuggested = useCallback(async () => {
    setSuggestedLoading(true);
    setSuggestedError(false);
    try {
      const res = await fetch('/api/community/leaderboard?limit=8&period=weekly');
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      const rows = data.rankings || [];
      setSuggestedUsers(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          username: r.username || '',
          return: `+${Number(r.return).toFixed(1)}%`,
          followers: `${Math.max(1, Math.round((r.trades || 5) * 0.35))}K`,
        })),
      );
    } catch {
      setSuggestedUsers([]);
      setSuggestedError(true);
    } finally {
      setSuggestedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuggested();
  }, [loadSuggested]);

  /** Dev-only contrast audit — runs once the page has had a chance to paint. */
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return undefined;
    const t = setTimeout(() => {
      auditContrast('.db-page.community-root');
    }, 600);
    return () => clearTimeout(t);
  }, [feedLoading, suggestedLoading, feedTab]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleLike = async (postId, liked) => {
    if (!user) return;
    const action = liked ? 'unlike' : 'like';
    setFeedPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: !liked, likes: Math.max(0, p.likes + (liked ? -1 : 1)) }
          : p,
      ),
    );
    try {
      const res = await fetch('/api/community/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, action }),
      });
      const data = await res.json();
      if (data.likes_count != null) {
        setFeedPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likes: data.likes_count } : p)),
        );
      }
    } catch {
      fetchFeed();
    }
  };

  const handleSave = async (postId, saved) => {
    if (!user) return;
    const action = saved ? 'unsave' : 'save';
    setFeedPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, saved_by_me: !saved } : p)),
    );
    try {
      await fetch('/api/community/posts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, action }),
      });
    } catch {
      fetchFeed();
    }
  };

  const handleCommentPosted = (postId) => {
    setFeedPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p)),
    );
  };

  const handleFollowSuggested = async (targetId) => {
    if (!user?.id || user.id === targetId) return;
    setFollowBusy((b) => ({ ...b, [targetId]: true }));
    try {
      await fetch('/api/community/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetId, action: 'follow' }),
      });
    } finally {
      setFollowBusy((b) => ({ ...b, [targetId]: false }));
    }
  };

  const onPageTab = (t) => {
    if (t === 'Messages') router.push('/community/messages');
    if (t === 'My Profile') {
      if (!user?.id) return;
      const handle =
        userProfile?.username || user?.user_metadata?.username || user.id;
      router.push(`/profile/${handle}`);
    }
  };

  // ─── Derived KPI values for the stats strip ──────────────────────
  const topSuggestedReturn = suggestedUsers[0]?.return ?? null;
  const hottestTopic = TRENDING_TOPICS[0] || null;
  const totalTrendingPosts = TRENDING_TOPICS.reduce((sum, topic) => {
    const numeric = String(topic.posts).replace(/[^0-9.]/g, '');
    const asNumber = Number(numeric) || 0;
    const multiplier = /K/i.test(topic.posts) ? 1000 : 1;
    return sum + asNumber * multiplier;
  }, 0);

  return (
    <div
      className="dashboard-page-inset db-page community-root"
      style={{ paddingTop: 0, paddingBottom: '2rem' }}
    >
      {/* ═══ Greeting — full width, on its own row ═══ */}
      <div className="comm-greeting-section">
        <h1 className="db-greeting">
          <span>
            {getGreeting()}, {firstName}
          </span>
          <span className="db-greeting-waving" aria-hidden>👋</span>
        </h1>
        <p className="db-greeting-sub">
          Connect, share, and grow with the investing community
        </p>
        <p className="db-greeting-date">{formatDateLine()}</p>
      </div>

      {/* ═══ TRENDING TOPICS — full width below greeting ═══ */}
      <section
        className="db-card comm-trending-card"
        data-community-card
        aria-label="Trending topics"
      >
        <div className="comm-trending-card-head">
          <div className="comm-trending-card-head-left">
            <div className="comm-trending-card-icon" aria-hidden>
              <i className="bi bi-fire" />
            </div>
            <div className="comm-trending-card-head-meta">
              <h3>Trending Topics</h3>
              <p>What&apos;s hot in the community right now</p>
            </div>
          </div>
          <Link href="/community" className="comm-trending-card-link">
            View All <i className="bi bi-arrow-right" aria-hidden />
          </Link>
        </div>

        <div className="comm-trending-grid">
          {TRENDING_TOPICS.map((topic, idx) => (
            <button
              key={topic.tag}
              type="button"
              className="comm-trending-tile"
            >
              <span className="comm-trending-tile__rank" aria-hidden>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="comm-trending-tile__body">
                <span className="comm-trending-tile__tag">
                  <span className="comm-trending-tile__hash">#</span>
                  {topic.tag}
                </span>
                <span className="comm-trending-tile__meta">
                  {topic.posts} posts · {topic.category}
                </span>
              </div>
              <span
                className={`comm-trending-tile__trend comm-trending-tile__trend--${topic.trend}`}
                aria-label={topic.trend === 'up' ? 'Trending up' : 'Trending down'}
              >
                <i
                  className={
                    topic.trend === 'up'
                      ? 'bi bi-arrow-up-right'
                      : 'bi bi-arrow-down-right'
                  }
                  aria-hidden
                />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ═══ KPI strip — community-wide snapshot ═══ */}
      <section className="comm-kpi-row" aria-label="Community at a glance">
        <div className="db-card comm-kpi-card" data-community-card>
          <div className="comm-kpi-icon" aria-hidden>
            <i className="bi bi-chat-square-text" />
          </div>
          <div className="comm-kpi-body">
            <span className="comm-kpi-label">Posts in feed</span>
            <span className="comm-kpi-value">{feedPosts.length}</span>
            <span className="comm-kpi-sub">Live from the community</span>
          </div>
        </div>
        <div className="db-card comm-kpi-card" data-community-card>
          <div className="comm-kpi-icon" aria-hidden>
            <i className="bi bi-graph-up-arrow" />
          </div>
          <div className="comm-kpi-body">
            <span className="comm-kpi-label">Top performer</span>
            <span className="comm-kpi-value">{topSuggestedReturn || '—'}</span>
            <span className="comm-kpi-sub positive">
              {suggestedUsers[0]?.name
                ? `@${
                    suggestedUsers[0].username ||
                    suggestedUsers[0].name.split(' ')[0].toLowerCase()
                  }`
                : 'Weekly leader'}
            </span>
          </div>
        </div>
        <div className="db-card comm-kpi-card" data-community-card>
          <div className="comm-kpi-icon" aria-hidden>
            <i className="bi bi-fire" />
          </div>
          <div className="comm-kpi-body">
            <span className="comm-kpi-label">Hottest topic</span>
            <span className="comm-kpi-value">
              #{hottestTopic?.tag || '—'}
            </span>
            <span className="comm-kpi-sub">
              {totalTrendingPosts.toLocaleString()} posts trending
            </span>
          </div>
        </div>
        <div className="db-card comm-kpi-card" data-community-card>
          <div className="comm-kpi-icon" aria-hidden>
            <i className="bi bi-person-plus" />
          </div>
          <div className="comm-kpi-body">
            <span className="comm-kpi-label">Investors to follow</span>
            <span className="comm-kpi-value">{suggestedUsers.length}</span>
            <span className="comm-kpi-sub">Suggested for you</span>
          </div>
        </div>
      </section>

      {/* ═══ Page-level tabs ═══ */}
      <div className="comm-page-tabs" role="tablist">
        {PAGE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === 'Community'}
            onClick={() => onPageTab(t)}
            className={`comm-page-tab ${t === 'Community' ? 'is-active' : ''}`}
          >
            {t === 'Community' && <i className="bi bi-people" aria-hidden />}
            {t === 'My Profile' && <i className="bi bi-person-circle" aria-hidden />}
            {t === 'Messages' && <i className="bi bi-chat-dots" aria-hidden />}
            {t}
          </button>
        ))}
      </div>

      {/* ═══ Find investors — user search wrapped in the shared card shell ═══ */}
      <section
        className="db-card comm-usersearch-card"
        data-community-card
        aria-label="Find investors"
      >
        <div className="db-card-header has-icon">
          <div className="comm-card-head-left">
            <div className="comm-card-icon" aria-hidden>
              <i className="bi bi-search" />
            </div>
            <div className="comm-card-head-meta">
              <h3>Find investors</h3>
              <p>
                Search by name or email to view their profile and trading
                activity.
              </p>
            </div>
          </div>
        </div>
        <div className="comm-usersearch-body">
          <UserSearch />
        </div>
      </section>

      <div className="comm-3col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <CommunitySocialConnectCard variant={isPartner ? 'partner' : 'user'} />

          <section
            className="db-card suggested-for-you-card"
            data-community-card
            aria-label="Suggested investors"
          >
            <div className="db-card-header has-icon">
              <div className="comm-card-head-left">
                <div className="comm-card-icon" aria-hidden>
                  <i className="bi bi-stars" />
                </div>
                <div className="comm-card-head-meta">
                  <h3>Suggested for You</h3>
                  <p>Investors worth following this week</p>
                </div>
              </div>
              <Link href="/leaderboard" className="comm-card-view-all">
                View All
              </Link>
            </div>

            <div className="comm-leaderboard-body">
              {suggestedLoading && (
                <>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="comm-list-row"
                      aria-hidden
                    >
                      <div className="comm-skeleton-avatar" style={{ width: 30, height: 30 }} />
                      <div className="comm-list-row__body">
                        <div className="comm-skeleton-line comm-skeleton-line--mid" />
                        <div className="comm-skeleton-line comm-skeleton-line--short" style={{ marginTop: 4 }} />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {!suggestedLoading && suggestedError && (
                <div className="comm-state-card comm-state-card--error" role="alert">
                  <div className="comm-state-card__icon">
                    <i className="bi bi-exclamation-triangle" aria-hidden />
                  </div>
                  <p className="comm-state-card__title">
                    Couldn&apos;t load suggestions
                  </p>
                  <p className="comm-state-card__desc">
                    Something went wrong fetching this week&apos;s top investors.
                  </p>
                  <button
                    type="button"
                    className="comm-state-card__retry"
                    onClick={loadSuggested}
                  >
                    Retry
                  </button>
                </div>
              )}

              {!suggestedLoading && !suggestedError && suggestedUsers.length === 0 && (
                <div className="comm-state-card">
                  <div className="comm-state-card__icon">
                    <i className="bi bi-people" aria-hidden />
                  </div>
                  <p className="comm-state-card__title">No suggestions yet</p>
                  <p className="comm-state-card__desc">
                    Check back once this week&apos;s rankings are computed.
                  </p>
                </div>
              )}

              {!suggestedLoading && !suggestedError && suggestedUsers.length > 0 &&
                suggestedUsers.map((u, i) => (
                  <div key={u.id} className="comm-list-row">
                    <span className={rankPillClass(i)} aria-label={`Rank ${i + 1}`}>
                      {i + 1}
                    </span>
                    <div className="comm-list-row__avatar" aria-hidden>
                      {getInitials(u.name)}
                    </div>
                    <div className="comm-list-row__body">
                      <Link
                        href={`/profile/${u.username || u.id}`}
                        className="comm-list-row__name"
                      >
                        {u.name}
                      </Link>
                      <p className="comm-list-row__handle">
                        {u.username ? `@${u.username}` : `${u.followers} followers`}
                      </p>
                    </div>
                    <div className="comm-list-row__trail">
                      <p className="comm-list-row__trail-primary comm-metric-pos">
                        {u.return}
                      </p>
                      <p className="comm-list-row__trail-secondary">
                        {u.followers} followers
                      </p>
                    </div>
                    {user?.id !== u.id && (
                      <button
                        type="button"
                        disabled={followBusy[u.id]}
                        onClick={() => handleFollowSuggested(u.id)}
                        className="comm-follow-btn"
                      >
                        {followBusy[u.id] ? '…' : 'Follow'}
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="comm-feed-nav">
            <div className="comm-feed-nav__tabs">
              {FEED_TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFeedTab(t)}
                  className={`comm-feed-nav__tab ${feedTab === t ? 'is-active' : ''}`}
                >
                  {t === 'Badges' && <i className="bi bi-award" aria-hidden />}
                  {t}
                </button>
              ))}
              <button
                type="button"
                onClick={() => document.getElementById('comm-composer')?.focus()}
                className="comm-feed-nav__cta"
              >
                <i className="bi bi-pencil-square" aria-hidden /> New Post
              </button>
            </div>
            {feedTab !== 'Badges' && (
              <select
                value={feedSort}
                onChange={(e) => setFeedSort(e.target.value)}
                className="comm-feed-nav__sort"
                aria-label="Sort feed"
              >
                <option>Latest</option>
                <option>Popular</option>
                <option>Following</option>
              </select>
            )}
          </div>

          {feedTab === 'Badges' ? (
            <LearningCommunityBadgesPanel />
          ) : (
            <>
              <FeedComposer
                user={user}
                userProfile={userProfile}
                composerText={composerText}
                setComposerText={setComposerText}
                posting={posting}
                setPosting={setPosting}
                composerImage={composerImage}
                setComposerImage={setComposerImage}
                showImageMenu={showImageMenu}
                setShowImageMenu={setShowImageMenu}
                showPollBuilder={showPollBuilder}
                setShowPollBuilder={setShowPollBuilder}
                pollQuestion={pollQuestion}
                setPollQuestion={setPollQuestion}
                pollOptions={pollOptions}
                setPollOptions={setPollOptions}
                showTickerSearch={showTickerSearch}
                setShowTickerSearch={setShowTickerSearch}
                tickerQuery={tickerQuery}
                setTickerQuery={setTickerQuery}
                tickerEmbedSymbols={tickerEmbedSymbols}
                setTickerEmbedSymbols={setTickerEmbedSymbols}
                tickerStep={tickerStep}
                setTickerStep={setTickerStep}
                tickerPeriod={tickerPeriod}
                setTickerPeriod={setTickerPeriod}
                onPosted={fetchFeed}
              />

              <div className="comm-feed-stream">
                {feedLoading ? (
                  <FeedSkeleton rows={3} />
                ) : feedError ? (
                  <div
                    className="db-card comm-state-card comm-state-card--error"
                    data-community-card
                    role="alert"
                  >
                    <div className="comm-state-card__icon">
                      <i className="bi bi-exclamation-triangle" aria-hidden />
                    </div>
                    <p className="comm-state-card__title">Couldn&apos;t load posts</p>
                    <p className="comm-state-card__desc">
                      {feedMessage || 'The community feed is temporarily unavailable.'}
                    </p>
                    <button
                      type="button"
                      className="comm-state-card__retry"
                      onClick={fetchFeed}
                    >
                      Retry
                    </button>
                  </div>
                ) : feedPosts.length === 0 ? (
                  <div
                    className="db-card comm-state-card"
                    data-community-card
                  >
                    <div className="comm-state-card__icon">
                      <i className="bi bi-chat-dots" aria-hidden />
                    </div>
                    <p className="comm-state-card__title">No posts yet</p>
                    <p className="comm-state-card__desc">
                      Be the first to share something with the community.
                    </p>
                  </div>
                ) : (
                  <>
                    {feedMessage && (
                      <div
                        className="db-card comm-state-card"
                        data-community-card
                      >
                        <p className="comm-state-card__desc">{feedMessage}</p>
                      </div>
                    )}
                    {feedPosts.map((post) => (
                      <CommunityFeedPost
                        key={post.id}
                        post={post}
                        expanded={expandedId === post.id}
                        onToggle={toggleExpand}
                        onLike={handleLike}
                        onSave={handleSave}
                        quote={post.tickerSym ? quoteMap[post.tickerSym] : undefined}
                        onCommentPosted={handleCommentPosted}
                      />
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <section
            className="db-card"
            data-community-card
            aria-label="Friends activity"
          >
            <div className="db-card-header has-icon">
              <div className="comm-card-head-left">
                <div className="comm-card-icon" aria-hidden>
                  <i className="bi bi-activity" />
                </div>
                <div className="comm-card-head-meta">
                  <h3>Friends Activity</h3>
                  <p>See what your friends are up to</p>
                </div>
              </div>
              <Link href="/community" className="comm-card-view-all">
                View All
              </Link>
            </div>

            <div className="comm-leaderboard-body">
              {FRIENDS_ACTIVITY_MOCK.map((f) => (
                <div key={f.username} className="comm-list-row">
                  <div className="comm-list-row__avatar" aria-hidden>
                    {getInitials(f.name)}
                  </div>
                  <div className="comm-list-row__body">
                    <p className="comm-list-row__name">{f.name}</p>
                    <p className="comm-list-row__handle">@{f.username}</p>
                    <p className="comm-list-row__meta">{f.action}</p>
                  </div>
                  <div className="comm-list-row__trail">
                    <p className="comm-list-row__trail-secondary">{f.time}</p>
                    {f.ret && (
                      <p
                        className={`comm-list-row__trail-primary ${
                          f.direction === 'pos'
                            ? 'comm-metric-pos'
                            : 'comm-metric-neg'
                        }`}
                      >
                        {f.ret}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            className="db-card"
            data-community-card
            aria-label="Trending discussions"
          >
            <div className="db-card-header has-icon">
              <div className="comm-card-head-left">
                <div className="comm-card-icon" aria-hidden>
                  <i className="bi bi-chat-quote" />
                </div>
                <div className="comm-card-head-meta">
                  <h3>Trending Discussions</h3>
                  <p>What everyone is talking about</p>
                </div>
              </div>
              <Link href="/community" className="comm-card-view-all">
                View All
              </Link>
            </div>

            <div className="comm-leaderboard-body">
              {TRENDING_DISCUSSIONS.map((d) => {
                const tone = DISCUSSION_TONE_TO_CSS[d.tone] ||
                  DISCUSSION_TONE_TO_CSS.emerald;
                return (
                  <div
                    key={d.title}
                    className="comm-list-row comm-list-row--interactive"
                    role="button"
                    tabIndex={0}
                  >
                    <div
                      className="comm-list-row__icon"
                      style={{
                        background: tone.background,
                        color: tone.color,
                      }}
                      aria-hidden
                    >
                      <i className="bi bi-chat-dots" />
                    </div>
                    <div className="comm-list-row__body">
                      <p className="comm-list-row__name">{d.title}</p>
                      <p className="comm-list-row__handle">
                        Started by {d.author}
                      </p>
                    </div>
                    <div className="comm-list-row__trail">
                      <p className="comm-list-row__trail-secondary">
                        <i className="bi bi-chat" aria-hidden />{' '}
                        {d.comments.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
