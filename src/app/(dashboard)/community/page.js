'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import '../home-dashboard/home-dashboard.css';
import './community.css';

/* ── Mock data (replace with API / props later) ── */
const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'users', label: 'Users' },
  { key: 'partners', label: 'Partners' },
];

const STAT_CARDS = [
  {
    emoji: '👥',
    label: 'Members',
    value: '12,456',
    sub: '+342 this month',
    subTone: 'positive',
  },
  {
    emoji: '💬',
    label: 'Discussions',
    value: '89 active',
    sub: '+14 today',
    subTone: 'positive',
  },
  {
    emoji: '🏆',
    label: 'Your Rank',
    value: '#127',
    sub: 'Top 8%',
    subTone: 'neutral',
  },
  {
    emoji: '🔥',
    label: 'Your Streak',
    value: '12 days',
    sub: 'Best: 31 days',
    subTone: 'neutral',
  },
];

const FEED_POSTS = [
  {
    id: 'p1',
    initials: 'AS',
    name: 'Aakash Sharma',
    time: '2h ago',
    badge: null,
    text: "Just opened a position in NVDA after seeing Pelosi's latest trade. Thoughts?",
    ticker: { sym: 'NVDA', price: 954.7, pct: 3.12 },
    likes: 24,
    comments: 8,
    reposts: 3,
  },
  {
    id: 'p2',
    initials: 'JL',
    name: 'Jessica Lee',
    time: '5h ago',
    badge: '🏆 Top 10',
    text: "My portfolio is up 34% this quarter. Here's what I'm holding and why...",
    ticker: null,
    likes: 89,
    comments: 23,
    reposts: 12,
  },
  {
    id: 'p3',
    initials: 'MB',
    name: 'Mike Brown',
    time: '1d ago',
    badge: null,
    text: "Has anyone set up automated alerts for congressional trading? I'd love to get notified when filings hit.",
    ticker: null,
    likes: 12,
    comments: 34,
    reposts: 5,
  },
];

const LEADERBOARD = [
  { rank: 1, name: 'Emma Wilson', pct: 34.5, bar: 100, trades: 12, win: 89 },
  { rank: 2, name: 'David Kim', pct: 28.2, bar: 82, trades: 8, win: 75 },
  { rank: 3, name: 'Lisa Park', pct: 25.7, bar: 74, trades: 15, win: 80 },
  { rank: 4, name: 'Alex Chen', pct: 22.1, bar: 64 },
  { rank: 5, name: 'Sarah Johnson', pct: 19.8, bar: 58 },
  { rank: 6, name: 'Michael Brown', pct: 17.3, bar: 50 },
  { rank: 7, name: 'Emily Davis', pct: 15.6, bar: 48 },
  { rank: 8, name: 'James Wilson', pct: 14.2, bar: 42 },
  { rank: 9, name: 'Maria Garcia', pct: 12.9, bar: 38 },
  { rank: 10, name: 'Chris Taylor', pct: 11.5, bar: 34 },
];

const YOU_ROW = { rank: 127, name: 'You', pct: 12.4, bar: 28, change: 14, up: true };

const CHALLENGES = [
  {
    id: 'c1',
    title: '7-Day Trading Streak',
    current: 5,
    total: 7,
    reward: '🔥 Streak Badge',
    ends: 'Ends in 2 days',
    done: false,
  },
  {
    id: 'c2',
    title: 'Research 5 Companies',
    current: 2,
    total: 5,
    reward: '📊 Analyst Badge',
    ends: 'Ends in 5 days',
    done: false,
  },
  {
    id: 'c3',
    title: 'Follow 3 Politicians',
    current: 3,
    total: 3,
    reward: '🏛️ Capitol Badge',
    ends: 'COMPLETED',
    done: true,
  },
];

const TRENDING_TOPICS = [
  { rank: 1, title: 'NVDA earnings play?', replies: 47, kind: 'hot' },
  { rank: 2, title: 'Congressional insider trades are getting out of hand', replies: 34, kind: 'rise' },
  { rank: 3, title: 'Best dividend stocks for 2026', replies: 28, kind: 'pop' },
  { rank: 4, title: 'Is the market overvalued?', replies: 21, kind: 'act' },
  { rank: 5, title: 'Portfolio review: roast mine', replies: 56, kind: 'hot' },
];

const CIRCLE_ACTIVITY = [
  { initials: 'EW', name: 'Emma Wilson', time: 'just now', action: 'Bought TSLA' },
  { initials: 'DK', name: 'David Kim', time: '12m ago', action: 'Posted: "NVDA to $1000?"' },
  { initials: 'LP', name: 'Lisa Park', time: '1h ago', action: 'Completed 7-day streak 🔥' },
  { initials: 'AC', name: 'Alex Chen', time: '2h ago', action: 'Added AMZN to watchlist' },
];

const LEGENDARY = [
  { initials: 'WB', name: 'Warren Buffett', nw: '$120B', style: 'Value' },
  { initials: 'RD', name: 'Ray Dalio', nw: '$14B', style: 'Macro' },
  { initials: 'CW', name: 'Cathy Wood', nw: '$250M', style: 'Growth' },
  { initials: 'PT', name: 'Paul Tudor Jones', nw: '$8.1B', style: 'Macro' },
  { initials: 'SC', name: 'Steve Cohen', nw: '$21.3B', style: 'Quant' },
];

function Avatar({ initials }) {
  return (
    <div className="comm-avatar" aria-hidden>
      {initials}
    </div>
  );
}

function FeedPost({ post, expanded, onToggle }) {
  const previewLen = 120;
  const long = post.text.length > previewLen;
  const shown = expanded || !long ? post.text : `${post.text.slice(0, previewLen).trim()}…`;

  return (
    <div className="comm-post-block">
      <button type="button" className="comm-post" onClick={() => onToggle(post.id)}>
        <div className="comm-post-head">
          <div className="comm-post-meta">
            <Avatar initials={post.initials} />
            <div>
              <span className="comm-post-name">{post.name}</span>
              <span className="comm-post-time"> · {post.time}</span>
            </div>
          </div>
          {post.badge && <span className="comm-post-badge">{post.badge}</span>}
        </div>
        <p className="comm-post-text">
          {shown}
          {long && !expanded && (
            <span className="comm-post-expand"> read more</span>
          )}
        </p>
        {post.ticker && (
          <div className="comm-ticker-embed">
            <span className="comm-ticker-sym">{post.ticker.sym}</span>
            <span className="comm-ticker-price">${post.ticker.price.toFixed(2)}</span>
            <span className={`comm-ticker-chg ${post.ticker.pct >= 0 ? 'up' : 'dn'}`}>
              {post.ticker.pct >= 0 ? '▲' : '▼'} {post.ticker.pct >= 0 ? '+' : ''}
              {post.ticker.pct.toFixed(2)}%
            </span>
          </div>
        )}
      </button>
      <div className="comm-engage">
        <button type="button" className="comm-engage-btn" aria-label="Like">
          <span aria-hidden>❤️</span> {post.likes}
        </button>
        <button type="button" className="comm-engage-btn" aria-label="Comment">
          <span aria-hidden>💬</span> {post.comments}
        </button>
        <button type="button" className="comm-engage-btn" aria-label="Repost">
          <span aria-hidden>🔄</span> {post.reposts}
        </button>
        <button type="button" className="comm-engage-btn" aria-label="Save">
          <span aria-hidden>📌</span> Save
        </button>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const [filter, setFilter] = useState('all');
  const [feedTab, setFeedTab] = useState('trending');
  const [lbPeriod, setLbPeriod] = useState('weekly');
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const feedPosts = useMemo(() => {
    // Placeholder: same mock for all tabs
    return FEED_POSTS;
  }, []);

  const showEmptyFeed = feedPosts.length === 0;

  return (
    <div className="comm-page dashboard-page-inset db-page">
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

      {/* Row 1 — stat cards */}
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

      {/* Row 2 — feed + leaderboard */}
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
            {showEmptyFeed ? (
              <p className="comm-empty">No posts yet. Be the first to share!</p>
            ) : (
              feedPosts.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
                  expanded={expandedId === post.id}
                  onToggle={toggleExpand}
                />
              ))
            )}
          </div>
          <div className="comm-compose">
            <input className="comm-compose-input" placeholder="Write a post..." aria-label="Write a post" />
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
            {LEADERBOARD.map((row) => (
              <div key={row.rank}>
                <div className="comm-lb-row">
                  <span className="comm-lb-rank">
                    {row.rank <= 3 ? ['🥇', '🥈', '🥉'][row.rank - 1] : row.rank}
                  </span>
                  <span className="comm-lb-name">{row.name}</span>
                  <span className="comm-lb-pct">+{row.pct.toFixed(1)}%</span>
                  <div className="comm-lb-bar-wrap">
                    <div className="comm-lb-bar-fill" style={{ width: `${row.bar}%` }} />
                  </div>
                </div>
                {row.rank <= 3 && row.trades != null && (
                  <div className="comm-lb-meta">
                    {row.trades} trades · {row.win}% win rate
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="comm-lb-you" style={{ padding: '0 1.25rem 1rem' }}>
            <div className="comm-lb-row">
              <span className="comm-lb-rank">{YOU_ROW.rank}</span>
              <span className="comm-lb-name">{YOU_ROW.name}</span>
              <span className="comm-lb-pct">+{YOU_ROW.pct.toFixed(1)}%</span>
              <div className="comm-lb-bar-wrap">
                <div className="comm-lb-bar-fill" style={{ width: `${YOU_ROW.bar}%` }} />
              </div>
            </div>
            <p className={`comm-lb-change ${YOU_ROW.up ? '' : 'dn'}`}>
              {YOU_ROW.up ? '▲' : '▼'} {YOU_ROW.change} spots from last week
            </p>
            <Link href="/community" className="comm-card-link">
              View Full Rankings <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="comm-row-3">
        <div className="db-card">
          <div className="db-card-header">
            <h3>🎯 Active Challenges</h3>
          </div>
          <div className="comm-inner-scroll">
            {CHALLENGES.length === 0 ? (
              <p className="comm-empty">No active challenges this week</p>
            ) : (
              CHALLENGES.map((c) => (
                <div key={c.id} className={`comm-challenge ${c.done ? 'done' : ''}`}>
                  <p className="comm-challenge-title">{c.title}</p>
                  <div className="comm-progress-track">
                    <div
                      className="comm-progress-fill"
                      style={{ width: `${(c.current / c.total) * 100}%` }}
                    />
                  </div>
                  <p className="comm-challenge-meta">
                    {c.current}/{c.total} {c.done && <strong> ✅</strong>}
                    <br />
                    Reward: {c.reward}
                    <br />
                    {c.ends}
                  </p>
                </div>
              ))
            )}
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
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
              Recent Activity
            </p>
            {CIRCLE_ACTIVITY.length === 0 ? (
              <p className="comm-empty">Follow users to see their activity</p>
            ) : (
              CIRCLE_ACTIVITY.map((row) => (
                <div key={row.name + row.time} className="comm-circle-row">
                  <Avatar initials={row.initials} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f0f6fc' }}>{row.name}</div>
                    <div style={{ fontSize: '0.5625rem', color: '#6b7280' }}>{row.time}</div>
                    <div style={{ fontSize: '0.75rem', color: '#e2e8f0', marginTop: '0.15rem' }}>{row.action}</div>
                  </div>
                </div>
              ))
            )}
            <div className="comm-suggest">
              <div>
                <div className="comm-suggest-txt">Suggested: Mike Torres</div>
                <div className="comm-suggest-sub">92% portfolio overlap with you</div>
              </div>
              <button type="button" className="comm-btn-sm">
                Follow
              </button>
            </div>
            <Link href="/community" className="comm-card-link" style={{ marginLeft: '1.25rem' }}>
              Find People <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 4 */}
      <div className="comm-row-4">
        <div className="db-card">
          <div className="db-card-header">
            <h3>🏅 Legendary Investors</h3>
          </div>
          <p style={{ fontSize: '0.6875rem', color: '#6b7280', margin: '0 1.25rem 0.75rem', lineHeight: 1.45 }}>
            Learn from the best traders in history
          </p>
          <div className="comm-legend-scroll">
            {LEGENDARY.map((inv) => (
              <div key={inv.name} className="comm-legend-card" role="button" tabIndex={0}>
                <div className="comm-legend-av">{inv.initials}</div>
                <div className="comm-legend-name">{inv.name}</div>
                <div className="comm-legend-nw">{inv.nw}</div>
                <div className="comm-legend-style">{inv.style}</div>
              </div>
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

      {/* Row 5 */}
      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div className="db-card-header">
          <h3>⭐ This Week&apos;s Spotlight</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <div className="comm-spotlight-row">
            <div className="comm-spot-card">
              <div className="comm-spot-tag">🏆 Top Performer</div>
              <div className="comm-spot-title">Emma Wilson</div>
              <p className="comm-spot-meta">
                +34.5% this week
                <br />
                12 trades · 89% win rate
              </p>
              <Link href="/community" className="comm-card-link" style={{ marginTop: 0 }}>
                View Profile <i className="bi bi-arrow-right" />
              </Link>
            </div>
            <div className="comm-spot-card">
              <div className="comm-spot-tag">📝 Best Post</div>
              <div className="comm-spot-title">&quot;Why I&apos;m bullish on semiconductors in 2026&quot;</div>
              <p className="comm-spot-meta">
                89 likes · 23 comments
                <br />
                by David Kim
              </p>
              <Link href="/community" className="comm-card-link" style={{ marginTop: 0 }}>
                Read Post <i className="bi bi-arrow-right" />
              </Link>
            </div>
            <div className="comm-spot-card">
              <div className="comm-spot-tag">🌟 Rising Star</div>
              <div className="comm-spot-title">Maria Garcia</div>
              <p className="comm-spot-meta">
                New member
                <br />
                Completed 15 tasks in first week
              </p>
              <Link href="/community" className="comm-card-link" style={{ marginTop: 0 }}>
                Follow <i className="bi bi-arrow-right" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
