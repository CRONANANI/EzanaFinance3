'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { LeaderboardModal } from '@/components/community/LeaderboardModal';
import { LEGENDARY_INVESTOR_LIST } from '@/config/legendaryInvestors';
import { extractTickerFromContent, formatRelativeTime, getInitials } from '@/lib/community-utils';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'users', label: 'Users' },
  { key: 'partners', label: 'Partners' },
];

const STAT_CARDS = [
  { emoji: '👥', label: 'Members', value: '12,456', sub: '+342 this month', subTone: 'positive' },
  { emoji: '💬', label: 'Discussions', value: '89 active', sub: '+14 today', subTone: 'positive' },
  { emoji: '🏆', label: 'Your Rank', value: '#127', sub: 'Top 8%', subTone: 'neutral' },
  { emoji: '🔥', label: 'Your Streak', value: '12 days', sub: 'Best: 31 days', subTone: 'neutral' },
];

const CHALLENGES = [
  { id: 'c1', title: '7-Day Trading Streak', current: 5, total: 7, reward: '🔥 Streak Badge', ends: 'Ends in 2 days', done: false },
  { id: 'c2', title: 'Research 5 Companies', current: 2, total: 5, reward: '📊 Analyst Badge', ends: 'Ends in 5 days', done: false },
  { id: 'c3', title: 'Follow 3 Politicians', current: 3, total: 3, reward: '🏛️ Capitol Badge', ends: 'COMPLETED', done: true },
];

const TRENDING_TOPICS = [
  { rank: 1, title: 'NVDA earnings play?', replies: 47, kind: 'hot' },
  { rank: 2, title: 'Congressional insider trades are getting out of hand', replies: 34, kind: 'rise' },
  { rank: 3, title: 'Best dividend stocks for 2026', replies: 28, kind: 'pop' },
  { rank: 4, title: 'Is the market overvalued?', replies: 21, kind: 'act' },
  { rank: 5, title: 'Portfolio review: roast mine', replies: 56, kind: 'hot' },
];

const CIRCLE_ACTIVITY = [
  { initials: 'EW', name: 'Emma Wilson', userId: null, time: 'just now', action: 'Bought TSLA' },
  { initials: 'DK', name: 'David Kim', userId: null, time: '12m ago', action: 'Posted: "NVDA to $1000?"' },
  { initials: 'LP', name: 'Lisa Park', userId: null, time: '1h ago', action: 'Completed 7-day streak 🔥' },
  { initials: 'AC', name: 'Alex Chen', userId: null, time: '2h ago', action: 'Added AMZN to watchlist' },
];

function CommunityUserLink({ userId, children, className, style }) {
  if (!userId) return (
    <span className={className} style={style}>
      {children}
    </span>
  );
  return (
    <Link href={`/community/profile/${userId}`} className={className} style={style}>
      {children}
    </Link>
  );
}

function FeedPost({ post, expanded, onToggle, onLike, onSave, quote }) {
  const router = useRouter();
  const previewLen = 120;
  const text = post.text || '';
  const long = text.length > previewLen;
  const shown = expanded || !long ? text : `${text.slice(0, previewLen).trim()}…`;

  return (
    <div className="comm-post-block">
      <div
        className="comm-post"
        role="button"
        tabIndex={0}
        onClick={() => onToggle(post.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(post.id);
          }
        }}
      >
        <div className="comm-post-head">
          <div className="comm-post-meta">
            <div className="comm-avatar" aria-hidden>
              {post.initials}
            </div>
            <div>
              {post.userId ? (
                <span
                  role="link"
                  tabIndex={0}
                  className="comm-name-link comm-post-name"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/community/profile/${post.userId}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      router.push(`/community/profile/${post.userId}`);
                    }
                  }}
                >
                  {post.name}
                </span>
              ) : (
                <span className="comm-post-name">{post.name}</span>
              )}
              <span className="comm-post-time"> · {post.time}</span>
            </div>
          </div>
          {post.badge && <span className="comm-post-badge">{post.badge}</span>}
        </div>
        <p className="comm-post-text">
          {shown}
          {long && !expanded && <span className="comm-post-expand"> read more</span>}
        </p>
        {post.tickerSym && (
          <div className="comm-ticker-embed">
            <span className="comm-ticker-sym">{post.tickerSym}</span>
            {quote ? (
              <>
                <span className="comm-ticker-price">${quote.price?.toFixed(2) ?? '—'}</span>
                <span className={`comm-ticker-chg ${(quote.changePercent ?? 0) >= 0 ? 'up' : 'dn'}`}>
                  {(quote.changePercent ?? 0) >= 0 ? '▲' : '▼'}{' '}
                  {(quote.changePercent ?? 0) >= 0 ? '+' : ''}
                  {(quote.changePercent ?? 0).toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="comm-ticker-price" style={{ color: '#6b7280', fontSize: '0.6875rem' }}>
                Quote unavailable
              </span>
            )}
          </div>
        )}
      </div>
      <div className="comm-engage">
        <button
          type="button"
          className="comm-engage-btn"
          aria-label="Like"
          onClick={(e) => {
            e.stopPropagation();
            onLike(post.id, post.liked_by_me);
          }}
        >
          <span aria-hidden>❤️</span> {post.likes}
        </button>
        <button type="button" className="comm-engage-btn" aria-label="Comment">
          <span aria-hidden>💬</span> {post.comments}
        </button>
        <button type="button" className="comm-engage-btn" aria-label="Repost">
          <span aria-hidden>🔄</span> {post.reposts}
        </button>
        <button
          type="button"
          className="comm-engage-btn"
          aria-label="Save"
          onClick={(e) => {
            e.stopPropagation();
            onSave(post.id, post.saved_by_me);
          }}
        >
          <span aria-hidden>📌</span> {post.saved_by_me ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function tabToParam(key) {
  if (key === 'my-posts') return 'my-posts';
  return key;
}

export default function CommunityPageClient() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [feedTab, setFeedTab] = useState('trending');
  const [lbPeriod, setLbPeriod] = useState('weekly');
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [compose, setCompose] = useState('');
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedMessage, setFeedMessage] = useState('');
  const [feedLoading, setFeedLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [quoteMap, setQuoteMap] = useState({});
  const [lbRows, setLbRows] = useState([]);
  const [lbModalOpen, setLbModalOpen] = useState(false);

  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedMessage('');
    try {
      const tab = tabToParam(feedTab);
      const res = await fetch(`/api/community/posts?tab=${encodeURIComponent(tab)}`);
      const data = await res.json();
      if (!res.ok) {
        setFeedPosts([]);
        setFeedMessage(data.error || 'Could not load posts');
        return;
      }
      if (data.message) setFeedMessage(data.message);
      const mapped = (data.posts || []).map((p) => ({
        id: p.id,
        text: p.content,
        userId: p.author?.id,
        name: p.author?.display_name?.trim() || 'Member',
        initials: getInitials(p.author?.display_name),
        time: formatRelativeTime(p.created_at),
        badge: null,
        tickerSym: p.mentioned_ticker || extractTickerFromContent(p.content),
        likes: p.likes_count ?? 0,
        comments: p.comments_count ?? 0,
        reposts: p.reposts_count ?? 0,
        liked_by_me: !!p.liked_by_me,
        saved_by_me: !!p.saved_by_me,
      }));
      setFeedPosts(mapped);
    } catch (e) {
      console.error(e);
      setFeedPosts([]);
      setFeedMessage('Could not load posts');
    } finally {
      setFeedLoading(false);
    }
  }, [feedTab]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    const syms = [
      ...new Set(feedPosts.map((p) => p.tickerSym).filter(Boolean)),
    ];
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
            if (row)
              next[s] = {
                price: row.price ?? row.last ?? row.ap ?? 0,
                changePercent: row.changePercent ?? row.change_percent ?? row.pct ?? 0,
              };
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
        const res = await fetch(`/api/community/leaderboard?limit=10&period=${encodeURIComponent(lbPeriod)}`);
        const data = await res.json();
        if (!cancelled) setLbRows(data.rankings || []);
      } catch {
        if (!cancelled) setLbRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lbPeriod]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleLike = async (postId, liked) => {
    if (!user) return;
    const action = liked ? 'unlike' : 'like';
    setFeedPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked_by_me: !liked,
              likes: Math.max(0, p.likes + (liked ? -1 : 1)),
            }
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
        setFeedPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likes: data.likes_count } : p))
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
      prev.map((p) => (p.id === postId ? { ...p, saved_by_me: !saved } : p))
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

  const submitPost = async () => {
    if (!user || !compose.trim()) return;
    setPosting(true);
    try {
      const mentioned = extractTickerFromContent(compose);
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: compose.trim(), mentioned_ticker: mentioned }),
      });
      if (res.ok) {
        setCompose('');
        fetchFeed();
      }
    } finally {
      setPosting(false);
    }
  };

  const showEmptyFeed = !feedLoading && feedPosts.length === 0;
  const spotlight = lbRows;

  const legendaryCards = useMemo(
    () =>
      LEGENDARY_INVESTOR_LIST.map((inv) => ({
        id: inv.id,
        initials: getInitials(inv.name),
        name: inv.name,
        nw: inv.netWorth,
        style: inv.style,
      })),
    []
  );

  return (
    <div className="comm-page dashboard-page-inset db-page">
      <LeaderboardModal isOpen={lbModalOpen} onClose={() => setLbModalOpen(false)} period={lbPeriod} />

      <header className="comm-header-top">
        <h1 className="comm-page-title">Community</h1>
        <div className="comm-header-tabs" role="tablist" aria-label="Community filter">
          {FILTER_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={filter === t.key}
              className={`db-tf-btn ${filter === t.key ? 'active' : ''}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="comm-search-wrap">
        <i className="bi bi-search" aria-hidden />
        <input
          className="comm-search-input"
          placeholder="Search users, partners, creators, or money managers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search community"
        />
      </div>

      <div className="comm-row-1">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="db-card comm-stat-card">
            <div className="comm-stat-top">
              <span className="comm-stat-emoji" aria-hidden>
                {s.emoji}
              </span>
              <div className="comm-stat-body">
                <span className="comm-stat-label">{s.label}</span>
                <span className="comm-stat-value">{s.value}</span>
                <span
                  className={`comm-stat-sub ${s.subTone === 'positive' ? 'positive' : s.subTone === 'negative' ? 'negative' : ''}`}
                >
                  {s.sub}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="comm-row-2">
        <div className="db-card comm-feed-card">
          <div className="db-card-header">
            <h3>Community Feed</h3>
            <div className="comm-feed-tabs">
              {['Trending', 'Following', 'Latest', 'My Posts'].map((label) => {
                const key = label.toLowerCase().replace(/\s+/g, '-');
                return (
                  <button
                    key={key}
                    type="button"
                    className={`db-tf-btn-sm ${feedTab === key ? 'active' : ''}`}
                    onClick={() => setFeedTab(key)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="comm-feed-scroll">
            {feedLoading && <p className="comm-empty">Loading posts…</p>}
            {!feedLoading && feedMessage && <p className="comm-empty">{feedMessage}</p>}
            {showEmptyFeed && !feedMessage && <p className="comm-empty">No posts yet. Be the first to share!</p>}
            {!feedLoading &&
              feedPosts.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
                  expanded={expandedId === post.id}
                  onToggle={toggleExpand}
                  onLike={handleLike}
                  onSave={handleSave}
                  quote={post.tickerSym ? quoteMap[post.tickerSym] : null}
                />
              ))}
          </div>
          <div className="comm-compose">
            <input
              className="comm-compose-input"
              placeholder={user ? 'Write a post...' : 'Sign in to post'}
              aria-label="Write a post"
              value={compose}
              onChange={(e) => setCompose(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && user && submitPost()}
              disabled={!user || posting}
            />
            {user && (
              <button
                type="button"
                className="comm-btn-sm"
                style={{ marginTop: '0.5rem' }}
                onClick={submitPost}
                disabled={posting || !compose.trim()}
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
            )}
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <div className="comm-lb-head">
              <h3>🏆 Leaderboard</h3>
              <select
                className="comm-lb-select"
                value={lbPeriod}
                onChange={(e) => setLbPeriod(e.target.value)}
                aria-label="Leaderboard period"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="all">All-Time</option>
              </select>
            </div>
          </div>
          <p className="comm-lb-sub" style={{ padding: '0 1.25rem' }}>
            This Week&apos;s Top Performers
          </p>
          <div className="comm-lb-scroll">
            {lbRows.map((row) => (
              <div key={row.id}>
                <Link href={`/community/profile/${row.id}`} className="comm-lb-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="comm-lb-rank">
                    {row.rank <= 3 ? ['🥇', '🥈', '🥉'][row.rank - 1] : row.rank}
                  </span>
                  <span className="comm-lb-name">{row.name}</span>
                  <span className="comm-lb-pct">+{row.return?.toFixed(1)}%</span>
                  <div className="comm-lb-bar-wrap">
                    <div className="comm-lb-bar-fill" style={{ width: `${row.bar}%` }} />
                  </div>
                </Link>
                {row.rank <= 3 && row.trades != null && (
                  <div className="comm-lb-meta">
                    {row.trades} trades · {row.winRate}% win rate
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="comm-lb-you" style={{ padding: '0 1.25rem 1rem' }}>
            {user ? (
              <Link href={`/community/profile/${user.id}`} className="comm-lb-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className="comm-lb-rank">127</span>
                <span className="comm-lb-name">You</span>
                <span className="comm-lb-pct">+12.4%</span>
                <div className="comm-lb-bar-wrap">
                  <div className="comm-lb-bar-fill" style={{ width: '28%' }} />
                </div>
              </Link>
            ) : (
              <div className="comm-lb-row">
                <span className="comm-lb-rank">—</span>
                <span className="comm-lb-name">Sign in for your rank</span>
                <span className="comm-lb-pct" />
                <div className="comm-lb-bar-wrap" />
              </div>
            )}
            <p className="comm-lb-change">▲ 14 spots from last week</p>
            <button type="button" className="comm-card-link" style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }} onClick={() => setLbModalOpen(true)}>
              View Full Rankings <i className="bi bi-arrow-right" />
            </button>
          </div>
        </div>
      </div>

      <div className="comm-row-3">
        <div className="db-card">
          <div className="db-card-header">
            <h3>🎯 Active Challenges</h3>
          </div>
          <div className="comm-inner-scroll">
            {CHALLENGES.map((c) => (
              <div key={c.id} className={`comm-challenge ${c.done ? 'done' : ''}`}>
                <p className="comm-challenge-title">{c.title}</p>
                <div className="comm-progress-track">
                  <div className="comm-progress-fill" style={{ width: `${(c.current / c.total) * 100}%` }} />
                </div>
                <p className="comm-challenge-meta">
                  {c.current}/{c.total} {c.done && <strong> ✅</strong>}
                  <br />
                  Reward: {c.reward}
                  <br />
                  {c.ends}
                </p>
              </div>
            ))}
            <Link href="/learning-center" className="comm-card-link" style={{ marginLeft: '1.25rem' }}>
              View All Challenges <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>🔥 Trending Now</h3>
          </div>
          <div className="comm-inner-scroll">
            {TRENDING_TOPICS.map((t) => (
              <div key={t.rank} className="comm-trend-item" role="button" tabIndex={0}>
                <span className="comm-trend-rank">{t.rank}</span>
                <span className="comm-trend-title">{t.title}</span>
                <div className="comm-trend-meta">
                  💬 {t.replies} replies ·{' '}
                  {t.kind === 'hot' && <span className="comm-badge-hot">🔥 Hot</span>}
                  {t.kind === 'rise' && <span className="comm-badge-rise">📈 Rising</span>}
                  {t.kind === 'pop' && <span className="comm-badge-pop">⭐ Popular</span>}
                  {t.kind === 'act' && <span className="comm-badge-act">💬 Active</span>}
                </div>
              </div>
            ))}
            <Link href="/community" className="comm-card-link" style={{ marginLeft: '1.25rem' }}>
              Start a Discussion <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>👥 Your Circle</h3>
          </div>
          <div className="comm-inner-scroll">
            <p className="comm-circle-head">Following: 23 · Followers: 47</p>
            <p
              style={{
                fontSize: '0.5625rem',
                fontWeight: 700,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 0.5rem',
              }}
            >
              Recent Activity
            </p>
            {CIRCLE_ACTIVITY.map((row) => (
              <div key={row.name + row.time} className="comm-circle-row">
                <div className="comm-avatar" aria-hidden>
                  {row.initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <CommunityUserLink userId={row.userId} className="comm-name-link" style={{ fontSize: '0.8125rem' }}>
                    {row.name}
                  </CommunityUserLink>
                  <div style={{ fontSize: '0.5625rem', color: '#6b7280' }}>{row.time}</div>
                  <div style={{ fontSize: '0.75rem', color: '#e2e8f0', marginTop: '0.15rem' }}>{row.action}</div>
                </div>
              </div>
            ))}
            <div className="comm-suggest">
              <div>
                <div className="comm-suggest-txt">
                  Suggested:{' '}
                  {lbRows[0] ? (
                    <CommunityUserLink userId={lbRows[0].id} className="comm-name-link">
                      {lbRows[0].name}
                    </CommunityUserLink>
                  ) : (
                    'Mike Torres'
                  )}
                </div>
                <div className="comm-suggest-sub">92% portfolio overlap with you</div>
              </div>
              {lbRows[0] && user && lbRows[0].id !== user.id ? (
                <button
                  type="button"
                  className="comm-btn-sm"
                  onClick={async () => {
                    await fetch('/api/community/follow', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ target_user_id: lbRows[0].id, action: 'follow' }),
                    });
                  }}
                >
                  Follow
                </button>
              ) : (
                <button type="button" className="comm-btn-sm" disabled>
                  Follow
                </button>
              )}
            </div>
            <Link href="/community" className="comm-card-link" style={{ marginLeft: '1.25rem' }}>
              Find People <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>

      <div className="comm-row-4">
        <div className="db-card">
          <div className="db-card-header">
            <h3>🏅 Legendary Investors</h3>
          </div>
          <p style={{ fontSize: '0.6875rem', color: '#6b7280', margin: '0 1.25rem 0.75rem', lineHeight: 1.45 }}>
            Learn from the best traders in history
          </p>
          <div className="comm-legend-scroll">
            {legendaryCards.map((inv) => (
              <Link key={inv.id} href={`/community/legendary/${inv.id}`} className="comm-legend-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="comm-legend-av">{inv.initials}</div>
                <div className="comm-legend-name">{inv.name}</div>
                <div className="comm-legend-nw">{inv.nw}</div>
                <div className="comm-legend-style">{inv.style}</div>
              </Link>
            ))}
          </div>
          <div style={{ padding: '0 1.25rem 1rem' }}>
            <Link href="/learning-center" className="comm-card-link">
              Explore strategies <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>📊 Community Insights</h3>
          </div>
          <p style={{ fontSize: '0.6875rem', color: '#6b7280', margin: '0 1.25rem 0.5rem', lineHeight: 1.45 }}>
            What 12,456 members are doing
          </p>
          <div className="comm-insight-row">
            <div className="comm-insight-label">Most Discussed Stock</div>
            <div className="comm-insight-val">NVDA — 847 mentions this week</div>
            <div className="comm-insight-bar">
              <div className="comm-insight-bar-fill" style={{ width: '85%' }} />
            </div>
          </div>
          <div className="comm-insight-row">
            <div className="comm-insight-label">Trending Topic</div>
            <div className="comm-insight-val">AI Stocks — 154 discussions</div>
          </div>
          <div className="comm-insight-row">
            <div className="comm-insight-label">Community Sentiment</div>
            <div className="comm-sentiment-row">
              <div className="comm-insight-bar" style={{ flex: 1, marginTop: 0 }}>
                <div className="comm-insight-bar-fill" style={{ width: '72%' }} />
              </div>
              <span className="comm-sentiment-pct">Bullish 72%</span>
            </div>
          </div>
          <div className="comm-insight-row">
            <div className="comm-insight-label">Most Followed Politician</div>
            <div className="comm-insight-val">Nancy Pelosi — 3,420 followers</div>
          </div>
          <div className="comm-insight-row">
            <div className="comm-insight-label">Top Badge This Week</div>
            <div className="comm-insight-val">🔥 7-Day Streak — earned by 234 members</div>
          </div>
        </div>
      </div>

      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div className="db-card-header">
          <h3>⭐ This Week&apos;s Spotlight</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <div className="comm-spotlight-row">
            <div className="comm-spot-card">
              <div className="comm-spot-tag">🏆 Top Performer</div>
              {spotlight[0] ? (
                <CommunityUserLink userId={spotlight[0].id} className="comm-spot-title" style={{ display: 'block', textDecoration: 'none' }}>
                  {spotlight[0].name}
                </CommunityUserLink>
              ) : (
                <div className="comm-spot-title">Emma Wilson</div>
              )}
              <p className="comm-spot-meta">
                {spotlight[0] ? `+${spotlight[0].return?.toFixed(1)}% this week` : '+34.5% this week'}
                <br />
                {spotlight[0] ? `${spotlight[0].trades} trades · ${spotlight[0].winRate}% win rate` : '12 trades · 89% win rate'}
              </p>
              {spotlight[0] ? (
                <Link href={`/community/profile/${spotlight[0].id}`} className="comm-card-link" style={{ marginTop: 0 }}>
                  View Profile <i className="bi bi-arrow-right" />
                </Link>
              ) : (
                <Link href="/community" className="comm-card-link" style={{ marginTop: 0 }}>
                  View Profile <i className="bi bi-arrow-right" />
                </Link>
              )}
            </div>
            <div className="comm-spot-card">
              <div className="comm-spot-tag">📝 Best Post</div>
              <div className="comm-spot-title">&quot;Why I&apos;m bullish on semiconductors in 2026&quot;</div>
              <p className="comm-spot-meta">
                89 likes · 23 comments
                <br />
                {spotlight[1] ? (
                  <>
                    by{' '}
                    <CommunityUserLink userId={spotlight[1].id} className="comm-name-link">
                      {spotlight[1].name}
                    </CommunityUserLink>
                  </>
                ) : (
                  'by David Kim'
                )}
              </p>
              <Link href="/community" className="comm-card-link" style={{ marginTop: 0 }}>
                Read Post <i className="bi bi-arrow-right" />
              </Link>
            </div>
            <div className="comm-spot-card">
              <div className="comm-spot-tag">🌟 Rising Star</div>
              {spotlight[2] ? (
                <CommunityUserLink userId={spotlight[2].id} className="comm-spot-title" style={{ display: 'block', textDecoration: 'none' }}>
                  {spotlight[2].name}
                </CommunityUserLink>
              ) : (
                <div className="comm-spot-title">Maria Garcia</div>
              )}
              <p className="comm-spot-meta">
                New member
                <br />
                Completed 15 tasks in first week
              </p>
              {spotlight[2] ? (
                <Link href={`/community/profile/${spotlight[2].id}`} className="comm-card-link" style={{ marginTop: 0 }}>
                  Follow <i className="bi bi-arrow-right" />
                </Link>
              ) : (
                <Link href="/community" className="comm-card-link" style={{ marginTop: 0 }}>
                  Follow <i className="bi bi-arrow-right" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
