'use client';

import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import '@/app/(dashboard)/community/community.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { usePartner } from '@/contexts/PartnerContext';
import { CommunityFeedPost } from '@/components/community/CommunityFeedPost';
import { LearningCommunityBadgesPanel } from '@/components/community/LearningCommunityBadgesPanel';
import { CommunitySocialConnectCard } from '@/components/community/CommunitySocialConnectCard';
import { extractTickerFromContent, formatRelativeTime, getInitials, normalizeTickerEmbed } from '@/lib/community-utils';
import { TICKER_SEARCH_DATA } from '@/lib/tickerSearchData';
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
const PAGE_TABS = ['Community', 'Messages'];

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
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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
  /** Up to 3 tickers for the chart embed */
  const [tickerEmbedSymbols, setTickerEmbedSymbols] = useState([]);
  const [tickerStep, setTickerStep] = useState('search');
  const [tickerPeriod, setTickerPeriod] = useState('1M');
  const [quoteMap, setQuoteMap] = useState({});
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [followBusy, setFollowBusy] = useState({});

  const filteredTickers = useMemo(() => {
    const q = tickerQuery.toUpperCase().trim();
    if (!q) return TICKER_SEARCH_DATA.slice(0, 8);
    return TICKER_SEARCH_DATA.filter(
      (t) => t.ticker.startsWith(q) || t.name.toUpperCase().includes(q)
    ).slice(0, 8);
  }, [tickerQuery]);

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
    const hasText = composerText.trim().length > 0;
    const hasPoll = pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2;
    const hasTicker = tickerEmbedSymbols.length > 0;
    const hasImage = composerImage !== null;

    if (!hasText && !hasPoll && !hasTicker && !hasImage) return;
    if (!user?.id) return;

    setPosting(true);
    try {
      let image_url = null;

      if (composerImage?.source === 'device' && composerImage?.file) {
        const ext = composerImage.file.name.split('.').pop() || 'jpg';
        const path = `community/${user.id}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('community-images')
          .upload(path, composerImage.file, { upsert: false, contentType: composerImage.file.type });
        if (!uploadErr && uploadData?.path) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('community-images').getPublicUrl(uploadData.path);
          image_url = publicUrl;
        }
      } else if (composerImage?.source === 'storage') {
        image_url = composerImage.url;
      }

      const tickerMatch = composerText.match(/\$([A-Za-z]{1,5})\b/);
      const autoBits = [];
      if (!composerText.trim()) {
        if (hasPoll) autoBits.push(`📊 ${pollQuestion.trim()}`);
        if (hasTicker) autoBits.push(`📈 ${tickerEmbedSymbols.map((x) => x.symbol).join(', ')}`);
      }
      const body = {
        content: composerText.trim() || autoBits.join(' '),
        mentioned_ticker:
          tickerEmbedSymbols[0]?.symbol ||
          (tickerMatch ? tickerMatch[1] : extractTickerFromContent(composerText)),
        image_url,
        poll_data: hasPoll
          ? {
              question: pollQuestion.trim(),
              options: pollOptions.filter((o) => o.trim()).map((o) => ({ label: o.trim() })),
            }
          : null,
        ticker_embed: hasTicker
          ? {
              period: tickerPeriod,
              symbols: tickerEmbedSymbols.map((s) => ({
                symbol: s.symbol,
                highlight_price: s.highlight_price,
              })),
            }
          : null,
      };

      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setComposerText('');
        setComposerImage(null);
        setShowImageMenu(false);
        setShowPollBuilder(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setTickerEmbedSymbols([]);
        setShowTickerSearch(false);
        setTickerQuery('');
        setTickerStep('search');
        setTickerPeriod('1M');
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
    if (t === 'Messages') router.push('/community');
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
        <div style={{ minWidth: 0, flex: '1 1 0', maxWidth: '60%' }}>
          <h1
            className="db-greeting"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              flexWrap: 'nowrap',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {getGreeting()}, {firstName}
            </span>
            <span className="db-greeting-waving" style={{ flexShrink: 0 }}>👋</span>
          </h1>
          <p className="db-greeting-sub">Connect, share, and grow with the investing community</p>
          <p className="db-greeting-date">{formatDateLine()}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
            {t === 'Community' && <i className="bi bi-people" />}
            {t === 'Messages' && <i className="bi bi-chat-dots" />}
            {t}
          </button>
        ))}
      </div>

      {/* ── Top row: Trending Topics + Trophy Cabinet side by side ── */}
      <div className="comm-top-row">
        <div className="db-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: 'var(--home-heading, #f0f6fc)' }}>
                Trending Topics
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.625rem', color: '#6b7280' }}>What&apos;s hot in the community</p>
            </div>
            <button
              type="button"
              style={{
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(16,185,129,0.15)',
                background: 'rgba(16,185,129,0.05)',
                color: '#10b981',
                fontSize: '0.6875rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
              }}
            >
              View All
            </button>
          </div>
          <div
            className="trending-strip"
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '2px',
              scrollbarWidth: 'none',
            }}
          >
            {TRENDING_TOPICS.map((topic) => (
              <button
                key={topic.tag}
                type="button"
                style={{
                  whiteSpace: 'nowrap',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  border: '1px solid rgba(16,185,129,0.2)',
                  background: 'rgba(16,185,129,0.05)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--home-heading, #f0f6fc)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#10b981' }}>#</span>
                {topic.tag}
                <span style={{ color: '#6b7280', fontSize: '0.6rem', fontWeight: 400 }}>
                  {topic.posts}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="db-card comm-trophy-strip" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: 'var(--home-heading, #f0f6fc)' }}>
                🏆 Trophy Cabinet
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.625rem', color: '#6b7280' }}>Your achievements</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '6px' }}>
            {[
              { icon: '🥇', name: 'First Return', earned: true, color: '#d4a853' },
              { icon: '📈', name: '10% Month', earned: true, color: '#10b981' },
              { icon: '🏆', name: '25% Year', earned: false, color: '#6b7280' },
              { icon: '✍️', name: 'First Post', earned: true, color: '#3b82f6' },
              { icon: '🦋', name: 'Social Butterfly', earned: false, color: '#6b7280' },
              { icon: '⚡', name: 'Top Trader', earned: false, color: '#6b7280' },
              { icon: '🌐', name: 'Diversified', earned: true, color: '#8b5cf6' },
              { icon: '👑', name: 'Community Legend', earned: false, color: '#6b7280' },
              { icon: '💎', name: 'Consistent Earner', earned: false, color: '#6b7280' },
            ].map((trophy) => (
              <div
                key={trophy.name}
                title={trophy.name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 2px',
                  borderRadius: '7px',
                  border: `1px solid ${trophy.earned ? trophy.color + '35' : 'rgba(107,114,128,0.1)'}`,
                  background: trophy.earned ? `${trophy.color}10` : 'rgba(107,114,128,0.03)',
                  opacity: trophy.earned ? 1 : 0.4,
                  cursor: trophy.earned ? 'pointer' : 'default',
                  gap: '2px',
                }}
              >
                <span
                  style={{
                    fontSize: '1rem',
                    lineHeight: 1,
                    filter: trophy.earned ? 'none' : 'grayscale(1)',
                  }}
                >
                  {trophy.icon}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="comm-3col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <CommunitySocialConnectCard variant={isPartner ? 'partner' : 'user'} />

          <div className="db-card suggested-for-you-card">
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
                        style={{
                          color: 'var(--home-heading, #111827)',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'block',
                        }}
                      >
                        {u.name}
                      </Link>
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
              <button
                type="button"
                onClick={() => document.getElementById('comm-composer')?.focus()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
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
                <i className="bi bi-pencil-square" /> New Post
              </button>
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
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowImageMenu((v) => !v);
                          setShowPollBuilder(false);
                          setShowTickerSearch(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: composerImage ? 'rgba(16,185,129,0.1)' : 'transparent',
                          color: composerImage ? '#10b981' : '#6b7280',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <i className="bi bi-image" /> Image {composerImage && '✓'}
                      </button>

                      {showImageMenu && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 6px)',
                            left: 0,
                            background: 'var(--card-bg, #1a1f2e)',
                            border: '1px solid rgba(16,185,129,0.15)',
                            borderRadius: '10px',
                            padding: '0.5rem',
                            zIndex: 50,
                            minWidth: '200px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                          }}
                        >
                          <p
                            style={{
                              fontSize: '0.65rem',
                              color: '#6b7280',
                              margin: '0 0 0.4rem 0.25rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            Add image
                          </p>

                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 0.6rem',
                              borderRadius: '7px',
                              cursor: 'pointer',
                              fontSize: '0.8125rem',
                              color: '#e2e8f0',
                              background: 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(16,185,129,0.06)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <i className="bi bi-upload" style={{ color: '#10b981' }} />
                            Upload from device
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const url = URL.createObjectURL(file);
                                setComposerImage({ url, source: 'device', file });
                                setShowImageMenu(false);
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              const url = window.prompt('Paste an image URL from your platform storage:');
                              if (url && url.startsWith('http')) {
                                setComposerImage({ url, source: 'storage' });
                              }
                              setShowImageMenu(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 0.6rem',
                              borderRadius: '7px',
                              cursor: 'pointer',
                              fontSize: '0.8125rem',
                              color: '#e2e8f0',
                              background: 'transparent',
                              border: 'none',
                              width: '100%',
                              textAlign: 'left',
                              fontFamily: 'var(--font-sans)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(16,185,129,0.06)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <i className="bi bi-cloud" style={{ color: '#6366f1' }} />
                            Platform storage
                          </button>

                          {composerImage && (
                            <button
                              type="button"
                              onClick={() => {
                                setComposerImage(null);
                                setShowImageMenu(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.6rem',
                                borderRadius: '7px',
                                cursor: 'pointer',
                                fontSize: '0.8125rem',
                                color: '#ef4444',
                                background: 'transparent',
                                border: 'none',
                                width: '100%',
                                textAlign: 'left',
                                fontFamily: 'var(--font-sans)',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                marginTop: '0.25rem',
                              }}
                            >
                              <i className="bi bi-trash" /> Remove image
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPollBuilder((v) => !v);
                        setShowImageMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: showPollBuilder ? 'rgba(16,185,129,0.1)' : 'transparent',
                        color: showPollBuilder ? '#10b981' : '#6b7280',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      <i className="bi bi-bar-chart" /> Poll
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowTickerSearch((v) => !v);
                        setShowImageMenu(false);
                        if (!showTickerSearch) {
                          setTickerStep('search');
                          setTickerQuery('');
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: tickerEmbedSymbols.length ? 'rgba(16,185,129,0.1)' : 'transparent',
                        color: tickerEmbedSymbols.length ? '#10b981' : '#6b7280',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      <i className="bi bi-graph-up" />{' '}
                      {tickerEmbedSymbols.length === 0
                        ? 'Ticker'
                        : tickerEmbedSymbols.length === 1
                          ? `$${tickerEmbedSymbols[0].symbol}`
                          : `${tickerEmbedSymbols.length} tickers`}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handlePost}
                    disabled={
                      posting ||
                      !user ||
                      !(
                        composerText.trim() ||
                        composerImage ||
                        (pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2) ||
                        tickerEmbedSymbols.length > 0
                      )
                    }
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background:
                        user &&
                        (composerText.trim() ||
                          composerImage ||
                          (pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2) ||
                          tickerEmbedSymbols.length > 0)
                          ? '#10b981'
                          : 'rgba(16, 185, 129, 0.15)',
                      color: '#fff',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor:
                        user &&
                        (composerText.trim() ||
                          composerImage ||
                          (pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2) ||
                          tickerEmbedSymbols.length > 0)
                          ? 'pointer'
                          : 'not-allowed',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Post
                  </button>
                </div>
                {composerImage && (
                  <div style={{ marginTop: '0.75rem', paddingLeft: '52px', position: 'relative' }}>
                    <img
                      src={composerImage.url}
                      alt="Post image"
                      style={{ maxWidth: '100%', maxHeight: 220, borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => setComposerImage(null)}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {showPollBuilder && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      paddingLeft: '52px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Ask a question..."
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      maxLength={200}
                      style={{
                        background: 'rgba(16,185,129,0.03)',
                        border: '1px solid rgba(16,185,129,0.1)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: '#e2e8f0',
                        fontSize: '0.8125rem',
                        outline: 'none',
                        fontFamily: 'var(--font-sans)',
                      }}
                    />
                    {pollOptions.map((opt, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder={`Option ${i + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const next = [...pollOptions];
                            next[i] = e.target.value;
                            setPollOptions(next);
                          }}
                          maxLength={100}
                          style={{
                            flex: 1,
                            background: 'rgba(16,185,129,0.03)',
                            border: '1px solid rgba(16,185,129,0.08)',
                            borderRadius: '8px',
                            padding: '0.4rem 0.65rem',
                            color: '#e2e8f0',
                            fontSize: '0.8125rem',
                            outline: 'none',
                            fontFamily: 'var(--font-sans)',
                          }}
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: 'rgba(239,68,68,0.1)',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 6 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions([...pollOptions, ''])}
                        style={{
                          alignSelf: 'flex-start',
                          padding: '0.3rem 0.7rem',
                          borderRadius: '6px',
                          border: '1px dashed rgba(16,185,129,0.3)',
                          background: 'transparent',
                          color: '#10b981',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        + Add option
                      </button>
                    )}
                  </div>
                )}

                {showTickerSearch && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      paddingLeft: '52px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    {tickerStep === 'search' && (
                      <>
                        <input
                          type="text"
                          placeholder="Search ticker (e.g. AAPL, NVDA...)"
                          value={tickerQuery}
                          onChange={(e) => setTickerQuery(e.target.value)}
                          autoFocus
                          style={{
                            background: 'rgba(16,185,129,0.03)',
                            border: '1px solid rgba(16,185,129,0.1)',
                            borderRadius: '8px',
                            padding: '0.5rem 0.75rem',
                            color: '#e2e8f0',
                            fontSize: '0.8125rem',
                            outline: 'none',
                            fontFamily: 'var(--font-sans)',
                          }}
                        />
                        <div
                          style={{
                            background: 'rgba(22,27,34,0.98)',
                            border: '1px solid rgba(16,185,129,0.1)',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            maxHeight: 220,
                            overflowY: 'auto',
                          }}
                        >
                          {filteredTickers.map((t) => (
                            <button
                              key={t.ticker}
                              type="button"
                              onClick={() => {
                                setTickerEmbedSymbols((prev) => {
                                  if (prev.some((x) => x.symbol === t.ticker)) return prev;
                                  if (prev.length >= 3) return prev;
                                  return [...prev, { symbol: t.ticker, highlight_price: null }];
                                });
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                width: '100%',
                                padding: '0.55rem 0.75rem',
                                background: 'none',
                                border: 'none',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontFamily: 'var(--font-sans)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(16,185,129,0.06)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'none';
                              }}
                            >
                              <span
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '8px',
                                  background: 'rgba(16,185,129,0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  color: '#10b981',
                                  flexShrink: 0,
                                }}
                              >
                                {t.ticker.slice(0, 2)}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: '0.8125rem',
                                    fontWeight: 700,
                                    color: '#e2e8f0',
                                  }}
                                >
                                  {t.ticker}
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: '0.6875rem',
                                    color: '#6b7280',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {t.name}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                        {tickerEmbedSymbols.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.35rem',
                              alignItems: 'center',
                            }}
                          >
                            {tickerEmbedSymbols.map((s) => (
                              <span
                                key={s.symbol}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px',
                                  background: 'rgba(16,185,129,0.1)',
                                  border: '1px solid rgba(16,185,129,0.2)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#10b981',
                                  fontFamily: 'var(--font-sans)',
                                }}
                              >
                                ${s.symbol}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTickerEmbedSymbols((prev) => prev.filter((x) => x.symbol !== s.symbol))
                                  }
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontSize: '0.85rem',
                                    lineHeight: 1,
                                  }}
                                  aria-label={`Remove ${s.symbol}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            <span style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                              {tickerEmbedSymbols.length}/3
                            </span>
                          </div>
                        )}
                        {tickerEmbedSymbols.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setTickerStep('configure')}
                            style={{
                              alignSelf: 'flex-start',
                              padding: '0.5rem 0.85rem',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#10b981',
                              color: '#fff',
                              fontSize: '0.8125rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            Time period & highlights →
                          </button>
                        )}
                      </>
                    )}

                    {tickerStep === 'configure' && tickerEmbedSymbols.length > 0 && (
                      <div
                        style={{
                          background: 'rgba(16,185,129,0.04)',
                          border: '1px solid rgba(16,185,129,0.12)',
                          borderRadius: '10px',
                          padding: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.8125rem',
                              fontWeight: 700,
                              color: '#10b981',
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            {tickerEmbedSymbols.map((s) => `$${s.symbol}`).join(' · ')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTickerEmbedSymbols([]);
                              setTickerStep('search');
                              setTickerQuery('');
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#6b7280',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            ← Change tickers
                          </button>
                        </div>

                        <div>
                          <p
                            style={{
                              margin: '0 0 0.3rem',
                              fontSize: '0.65rem',
                              color: '#6b7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            Time period (all charts)
                          </p>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {['1D', '1W', '1M', '3M', '1Y'].map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setTickerPeriod(p)}
                                style={{
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: tickerPeriod === p ? '#10b981' : 'rgba(16,185,129,0.06)',
                                  color: tickerPeriod === p ? '#fff' : '#8b949e',
                                  fontFamily: 'var(--font-sans)',
                                }}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        {tickerEmbedSymbols.map((s, i) => (
                          <div key={s.symbol}>
                            <p
                              style={{
                                margin: '0 0 0.3rem',
                                fontSize: '0.65rem',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              Highlight ${s.symbol} (optional)
                            </p>
                            <input
                              type="number"
                              placeholder="e.g. 180.00"
                              value={Number.isFinite(s.highlight_price) ? s.highlight_price : ''}
                              onChange={(e) => {
                                const num = parseFloat(e.target.value);
                                setTickerEmbedSymbols((prev) =>
                                  prev.map((row, j) =>
                                    j === i
                                      ? {
                                          ...row,
                                          highlight_price: Number.isFinite(num) ? num : null,
                                        }
                                      : row
                                  )
                                );
                              }}
                              style={{
                                width: '100%',
                                background: 'rgba(16,185,129,0.03)',
                                border: '1px solid rgba(16,185,129,0.08)',
                                borderRadius: '8px',
                                padding: '0.4rem 0.65rem',
                                color: '#e2e8f0',
                                fontSize: '0.8125rem',
                                outline: 'none',
                                fontFamily: 'var(--font-sans)',
                              }}
                            />
                          </div>
                        ))}

                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#10b981' }}>
                          ✓ {tickerEmbedSymbols.length} chart{tickerEmbedSymbols.length !== 1 ? 's' : ''} ·{' '}
                          {tickerPeriod}
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
                    <p style={{ color: 'var(--home-heading, #f0f6fc)', fontSize: '0.8125rem', fontWeight: 700, margin: 0 }}>{f.name}</p>
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
                        color: 'var(--home-heading, #e2e8f0)',
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
