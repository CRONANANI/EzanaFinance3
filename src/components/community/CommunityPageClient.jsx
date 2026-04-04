'use client';

import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import '@/app/(dashboard)/community/community.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { CommunityFeedPost } from '@/components/community/CommunityFeedPost';
import { LearningCommunityBadgesPanel } from '@/components/community/LearningCommunityBadgesPanel';
import { extractTickerFromContent, formatRelativeTime, getInitials } from '@/lib/community-utils';
import { supabase } from '@/lib/supabase';
import { MOCK_DISCUSSIONS } from '@/lib/orgMockData';

const TRENDING_TOPICS = [
  { tag: 'EarningsSeason', posts: '1.2K' },
  { tag: 'AIStocks', posts: '892' },
  { tag: 'LongTermGrowth', posts: '745' },
  { tag: 'Crypto', posts: '612' },
  { tag: 'DividendInvesting', posts: '523' },
];

const FRIENDS_ACTIVITY_MOCK = [
  { name: 'Emily Chen', username: 'emilyc', action: 'Bought $AAPL', ret: '+2.35%', returnColor: '#10b981', time: '2h' },
  { name: 'Michael Torres', username: 'miketorres', action: 'Sold $TSLA', ret: '-1.23%', returnColor: '#ef4444', time: '3h' },
  { name: 'Alex Morgan', username: 'alexm', action: 'Commented on a post', ret: null, returnColor: null, time: '4h' },
  { name: 'Sarah Lee', username: 'sarahlee', action: 'Created a new post', ret: null, returnColor: null, time: '5h' },
  { name: 'David Park', username: 'dpark', action: 'Liked a post', ret: null, returnColor: null, time: '6h' },
];

const TRENDING_DISCUSSIONS = [
  { title: 'The Future of AI in Investing', author: '@tech_investor', comments: 124, color: '#10b981' },
  { title: 'Best Long-Term Stocks for 2026', author: '@value_hunter', comments: 98, color: '#10b981' },
  { title: 'Crypto Market Outlook', author: '@crypto_king', comments: 87, color: '#10b981' },
  { title: 'FED Rate Decision Impact', author: '@macro_mind', comments: 65, color: '#f59e0b' },
  { title: 'Green Energy Stocks', author: '@green_future', comments: 43, color: '#6366f1' },
];

const FEED_TABS = ['Feed', 'Following', 'Friends', 'Discussions', 'Badges'];
const PAGE_TABS = ['Overview', 'Community', 'Messages'];

function tabToApiParam(feedTab, feedSort, hasUser) {
  if (feedTab === 'Badges') return 'trending';
  if (feedTab === 'Following' || feedTab === 'Friends') return 'following';
  if (feedTab === 'Discussions') return 'trending';
  if (feedTab === 'Feed') {
    if (feedSort === 'Popular') return 'trending';
    if (feedSort === 'Following' && hasUser) return 'following';
    return 'trending';
  }
  return 'trending';
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
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function CommunityPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOrgUser } = useOrg();

  const [userProfile, setUserProfile] = useState(null);
  const [feedTab, setFeedTab] = useState('Feed');
  const [feedSort, setFeedSort] = useState('Latest');
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedMessage, setFeedMessage] = useState('');
  const [feedLoading, setFeedLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [posting, setPosting] = useState(false);
  const [quoteMap, setQuoteMap] = useState({});
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [followBusy, setFollowBusy] = useState({});

  const firstName = useMemo(() => {
    const raw = userProfile?.full_name || userProfile?.display_name || user?.user_metadata?.full_name || '';
    const part = String(raw).trim().split(/\s+/)[0];
    return part || 'there';
  }, [userProfile, user]);

  const fetchFeed = useCallback(async () => {
    if (feedTab === 'Badges') {
      setFeedLoading(false);
      setFeedMessage('');
      return;
    }
    setFeedLoading(true);
    setFeedMessage('');
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
        tickerSym: p.mentioned_ticker || extractTickerFromContent(p.content),
        likes: p.likes_count ?? 0,
        comments: p.comments_count ?? 0,
        reposts: p.reposts_count ?? 0,
        liked_by_me: !!p.liked_by_me,
        saved_by_me: !!p.saved_by_me,
        returnBadge: hashReturnPct(p.author?.id || p.id),
        isPartner: false,
      }));

      const userIds = [...new Set(mapped.map((m) => m.userId).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, is_partner').in('id', userIds);
        const pmap = Object.fromEntries((profs || []).map((r) => [r.id, r.is_partner === true]));
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
                changePercent: row.changePercent ?? row.change_percent ?? row.pct ?? 0,
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/community/leaderboard?limit=8&period=weekly');
        const data = await res.json();
        const rows = data.rankings || [];
        if (cancelled) return;
        setSuggestedUsers(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            username: r.username || '',
            return: `+${Number(r.return).toFixed(1)}%`,
            followers: `${Math.max(1, Math.round((r.trades || 5) * 0.35))}K`,
          }))
        );
      } catch {
        if (!cancelled) setSuggestedUsers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchBusy(true);
      try {
        const res = await fetch(`/api/community/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

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
          : p
      )
    );
    try {
      const res = await fetch('/api/community/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, action }),
      });
      const data = await res.json();
      if (data.likes_count != null) {
        setFeedPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes: data.likes_count } : p)));
      }
    } catch {
      fetchFeed();
    }
  };

  const handleSave = async (postId, saved) => {
    if (!user) return;
    const action = saved ? 'unsave' : 'save';
    setFeedPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, saved_by_me: !saved } : p)));
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
    setFeedPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p)));
  };

  const handlePost = async () => {
    if (!composerText.trim() || !user?.id) return;
    setPosting(true);
    try {
      const tickerMatch = composerText.match(/\$([A-Za-z]{1,5})\b/);
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: composerText.trim(),
          mentioned_ticker: tickerMatch ? tickerMatch[1] : extractTickerFromContent(composerText),
        }),
      });
      if (res.ok) {
        setComposerText('');
        await fetchFeed();
      }
    } finally {
      setPosting(false);
    }
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
    if (t === 'Overview') router.push('/home-dashboard');
    else if (t === 'Messages') router.push('/community');
  };

  return (
    <div className="dashboard-page-inset db-page" style={{ paddingTop: 0, paddingBottom: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h1 className="db-greeting" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {getGreeting()}, {firstName}
            <span className="db-greeting-waving">👋</span>
          </h1>
          <p className="db-greeting-sub">Connect, share, and grow with the investing community</p>
          <p className="db-greeting-date">{formatDateLine()}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(16, 185, 129, 0.04)',
              border: '1px solid rgba(16, 185, 129, 0.08)',
              borderRadius: '10px',
              padding: '0.5rem 0.85rem',
              minWidth: '220px',
            }}
          >
            <i className="bi bi-search" style={{ color: '#6b7280', fontSize: '0.8rem' }} />
            <input
              type="text"
              placeholder="Search users, posts, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e2e8f0',
                fontSize: '0.8125rem',
                width: '100%',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <span style={{ color: '#6b7280', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>⌘K</span>
            {searchQuery.trim().length >= 2 && (
              <div
                className="comm-search-dropdown"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 6px)',
                  zIndex: 40,
                  maxHeight: 240,
                  overflowY: 'auto',
                }}
              >
                {searchBusy && <div className="comm-search-loading">Searching…</div>}
                {!searchBusy &&
                  searchResults.map((u) => (
                    <Link key={u.id} href={`/profile/${u.username || u.id}`} className="comm-search-hit">
                      <span className="comm-search-avatar">{getInitials(u.full_name)}</span>
                      <span className="comm-search-meta">
                        <span className="comm-search-name">{u.full_name}</span>
                        <span className="comm-search-sub">@{u.username || u.id.slice(0, 8)}</span>
                      </span>
                    </Link>
                  ))}
                {!searchBusy && searchResults.length === 0 && (
                  <div className="comm-search-empty">No users found</div>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('comm-composer')?.focus()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: '#10b981',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-sans)',
            }}
          >
            + New Post
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {PAGE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onPageTab(t)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: t === 'Community' ? '#10b981' : 'rgba(16, 185, 129, 0.04)',
              color: t === 'Community' ? '#fff' : '#8b949e',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {t === 'Overview' && <i className="bi bi-grid" />}
            {t === 'Community' && <i className="bi bi-people" />}
            {t === 'Messages' && <i className="bi bi-chat-dots" />}
            {t}
          </button>
        ))}
      </div>

      <div className="comm-3col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="db-card">
            <div style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#f0f6fc', margin: '0 0 0.25rem' }}>Find People</h3>
              <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0 0 0.75rem' }}>
                Search for investors, friends, or partners
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.08)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.7rem',
                }}
              >
                <i className="bi bi-search" style={{ color: '#6b7280', fontSize: '0.75rem' }} />
                <input
                  type="text"
                  placeholder="Search users by name or @username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#e2e8f0',
                    fontSize: '0.75rem',
                    width: '100%',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-header">
              <h3>Suggested for You</h3>
              <Link href="/leaderboard" style={{ color: '#10b981', fontSize: '0.6875rem', fontWeight: 600, textDecoration: 'none' }}>
                View All
              </Link>
            </div>
            <div style={{ padding: '0 1.25rem 1rem' }}>
              {suggestedUsers.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0 }}>No suggestions yet.</p>
              ) : (
                suggestedUsers.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.65rem 0',
                      borderBottom: '1px solid rgba(16, 185, 129, 0.04)',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#10b981',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {getInitials(u.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        href={`/profile/${u.username || u.id}`}
                        style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 700, textDecoration: 'none', display: 'block' }}
                      >
                        {u.name}
                      </Link>
                      <p style={{ color: '#6b7280', fontSize: '0.6875rem', margin: 0 }}>@{u.username || u.id.slice(0, 8)}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>{u.return}</span>
                      <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: 0 }}>{u.followers} followers</p>
                    </div>
                    {user?.id !== u.id && (
                      <button
                        type="button"
                        disabled={followBusy[u.id]}
                        onClick={() => handleFollowSuggested(u.id)}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0,
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {followBusy[u.id] ? '…' : 'Follow'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-header">
              <div>
                <h3 style={{ margin: 0 }}>Trending Topics</h3>
                <p style={{ color: '#6b7280', fontSize: '0.6875rem', margin: '0.15rem 0 0' }}>What&apos;s hot in the community</p>
              </div>
            </div>
            <div style={{ padding: '0 1.25rem 0.75rem' }}>
              {TRENDING_TOPICS.map((topic, i) => (
                <div
                  key={topic.tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0',
                    borderBottom: i < TRENDING_TOPICS.length - 1 ? '1px solid rgba(16, 185, 129, 0.04)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.8125rem' }}>#</span>
                    <span style={{ color: '#e2e8f0', fontSize: '0.8125rem', fontWeight: 600 }}>{topic.tag}</span>
                  </div>
                  <span style={{ color: '#6b7280', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)' }}>{topic.posts} posts</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 1.25rem 1rem' }}>
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.08)',
                  background: 'rgba(16, 185, 129, 0.02)',
                  color: '#10b981',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                View All Topics
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              {FEED_TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFeedTab(t)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: feedTab === t ? '#10b981' : 'rgba(16, 185, 129, 0.04)',
                    color: feedTab === t ? '#fff' : '#8b949e',
                    fontFamily: 'var(--font-sans)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {t === 'Badges' && <i className="bi bi-award" aria-hidden />}
                  {t}
                </button>
              ))}
            </div>
            {feedTab !== 'Badges' && (
              <select
                value={feedSort}
                onChange={(e) => setFeedSort(e.target.value)}
                style={{
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.08)',
                  borderRadius: '8px',
                  padding: '0.4rem 0.6rem',
                  color: '#8b949e',
                  fontSize: '0.75rem',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
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
              <div className="db-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {getInitials(userProfile?.full_name || userProfile?.display_name || user?.email || 'U')}
                  </div>
                  <textarea
                    id="comm-composer"
                    placeholder="Share something with the community..."
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    rows={2}
                    disabled={!user}
                    style={{
                      flex: 1,
                      resize: 'none',
                      background: 'rgba(16, 185, 129, 0.02)',
                      border: '1px solid rgba(16, 185, 129, 0.06)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      color: '#e2e8f0',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.75rem',
                    paddingLeft: '52px',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {[
                      { icon: 'bi-image', label: 'Image' },
                      { icon: 'bi-bar-chart', label: 'Poll' },
                      { icon: 'bi-graph-up', label: 'Ticker' },
                    ].map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          color: '#6b7280',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <i className={`bi ${a.icon}`} /> {a.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handlePost}
                    disabled={!composerText.trim() || posting || !user}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: composerText.trim() && user ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
                      color: '#fff',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: composerText.trim() && user ? 'pointer' : 'not-allowed',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Post
                  </button>
                </div>
                {!user && (
                  <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0.5rem 0 0 52px' }}>Sign in to post.</p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {feedMessage && !feedLoading && (
                  <div className="db-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: '#8b949e', fontSize: '0.8125rem', margin: 0 }}>{feedMessage}</p>
                  </div>
                )}
                {feedLoading ? (
                  <div className="db-card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#6b7280', fontSize: '0.8125rem' }}>Loading posts…</p>
                  </div>
                ) : feedPosts.length === 0 ? (
                  <div className="db-card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#6b7280', fontSize: '0.8125rem' }}>No posts yet. Be the first to share!</p>
                  </div>
                ) : (
                  feedPosts.map((post) => (
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
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="db-card">
            <div className="db-card-header">
              <div>
                <h3 style={{ margin: 0 }}>Friends Activity</h3>
                <p style={{ color: '#6b7280', fontSize: '0.6875rem', margin: '0.15rem 0 0' }}>See what your friends are up to</p>
              </div>
              <Link href="/community" style={{ color: '#10b981', fontSize: '0.6875rem', fontWeight: 600, textDecoration: 'none' }}>
                View All
              </Link>
            </div>
            <div style={{ padding: '0 1.25rem 1rem' }}>
              {FRIENDS_ACTIVITY_MOCK.map((f, i) => (
                <div
                  key={`${f.username}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.6rem 0',
                    borderBottom: i < FRIENDS_ACTIVITY_MOCK.length - 1 ? '1px solid rgba(16, 185, 129, 0.04)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {getInitials(f.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 700, margin: 0 }}>{f.name}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.6875rem', margin: 0 }}>
                      <span style={{ color: '#8b949e' }}>@{f.username}</span>
                    </p>
                    <p style={{ color: '#8b949e', fontSize: '0.6875rem', margin: 0 }}>{f.action}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ color: '#6b7280', fontSize: '0.625rem' }}>{f.time}</span>
                    {f.ret && (
                      <p style={{ color: f.returnColor, fontSize: '0.75rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-sans)' }}>
                        {f.ret}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-header">
              <div>
                <h3 style={{ margin: 0 }}>Trending Discussions</h3>
                <p style={{ color: '#6b7280', fontSize: '0.6875rem', margin: '0.15rem 0 0' }}>What everyone is talking about</p>
              </div>
              <Link href="/community" style={{ color: '#10b981', fontSize: '0.6875rem', fontWeight: 600, textDecoration: 'none' }}>
                View All
              </Link>
            </div>
            <div style={{ padding: '0 1.25rem 1rem' }}>
              {TRENDING_DISCUSSIONS.map((d, i) => (
                <div
                  key={d.title}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.6rem 0',
                    borderBottom: i < TRENDING_DISCUSSIONS.length - 1 ? '1px solid rgba(16, 185, 129, 0.04)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: `${d.color}15`,
                      border: `1px solid ${d.color}25`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <i className="bi bi-chat-dots" style={{ color: d.color, fontSize: '0.7rem' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        color: '#e2e8f0',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.title}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: 0 }}>Started by {d.author}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                    <i className="bi bi-chat" style={{ color: '#6b7280', fontSize: '0.65rem' }} />
                    <span style={{ color: '#6b7280', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)' }}>{d.comments}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
