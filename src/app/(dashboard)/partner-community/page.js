'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { BadgeRow } from '@/components/partner/BadgeDisplay';
import { CommunitySocialConnectCard } from '@/components/community/CommunitySocialConnectCard';
import { PartnerPreviewEmpty } from '@/components/partner/PartnerPreviewEmpty';
import '../partner.css';
import '@/components/partner/badges.css';

const MAX_CHARS = 280;
const EMOJIS = [
  '😀',
  '😊',
  '👍',
  '❤️',
  '🔥',
  '📈',
  '💰',
  '🎯',
  '✅',
  '🚀',
  '💡',
  '📊',
  '⭐',
  '🙌',
  '💪',
  '🎉',
  '🤝',
  '📉',
  '💎',
  '🏆',
];

function EmojiPicker({ onPick, anchorRef }) {
  const [open, setOpen] = useState(false);
  const popRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (!popRef.current?.contains(e.target) && !anchorRef?.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [anchorRef]);

  return (
    <div className="ptr-emoji-wrap" ref={anchorRef}>
      <button
        type="button"
        className="ptr-compose-tool"
        title="Emoji"
        onClick={() => setOpen(!open)}
      >
        <i className="bi bi-emoji-smile" />
      </button>
      {open && (
        <div className="ptr-emoji-picker" ref={popRef} onClick={(e) => e.stopPropagation()}>
          {EMOJIS.map((e, i) => (
            <button
              key={i}
              type="button"
              className="ptr-emoji-btn"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* QA PAR-8: the feed, composer and analytics run on the partner's real
   community posts (GET/POST /api/community/posts). Follower activity and
   copier messages have no data source yet and show a preview state. */

function fmtPostTime(v) {
  if (!v) return '';
  const diff = Date.now() - new Date(v).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PartnerCommunityPage() {
  const [newPost, setNewPost] = useState('');
  const [activeTab, setActiveTab] = useState('feed');
  const [profile, setProfile] = useState(null);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [badgeCategories, setBadgeCategories] = useState({});
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [badgeFilter, setBadgeFilter] = useState('All');
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);
  const emojiAnchorRef = useRef(null);

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  useEffect(() => {
    const fetchPartnerData = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const [profileRes, badgesRes] = await Promise.all([
          fetch('/api/partner/profile', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/partner/badges', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const profileData = await profileRes.json();
        const badgesData = await badgesRes.json();
        if (profileData.profile) setProfile(profileData.profile);
        if (badgesData.earned?.length) setEarnedBadges(badgesData.earned);
      } catch (err) {
        console.error('Failed to load partner data:', err);
      }
    };
    fetchPartnerData();
  }, [getToken]);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch('/api/community/posts?tab=my-posts', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load your posts');
      // Only the partner's own top-level posts (never sample or demo rows).
      const me = session.user?.id;
      setPosts((data.posts || []).filter((p) => p.user_id === me && !p.parent_post_id));
    } catch (e) {
      setPostsError(e.message || 'Could not load your posts');
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const submitPost = async () => {
    const content = newPost.trim();
    if (!content || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Your post could not be published.');
      setNewPost('');
      if (data.post) setPosts((prev) => [data.post, ...prev]);
      else await loadPosts();
    } catch (e) {
      setPostError(e.message || 'Your post could not be published.');
    } finally {
      setPosting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'badges') {
      const fetchBadges = async () => {
        setBadgesLoading(true);
        try {
          const token = await getToken();
          const res = await fetch('/api/partner/badges', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          setBadgeCategories(data.categories || {});
          setTotalEarned(data.totalEarned || 0);
          setTotalAvailable(data.totalAvailable || 0);
        } catch (err) {
          console.error('Failed to load badges:', err);
        } finally {
          setBadgesLoading(false);
        }
      };
      fetchBadges();
    }
  }, [activeTab, getToken]);

  const displayName = profile?.username || profile?.display_name || 'You';
  const displayBadges = earnedBadges;
  const totalLikes = posts.reduce((n, p) => n + (p.likes_count || 0), 0);
  const totalComments = posts.reduce((n, p) => n + (p.comments_count || 0), 0);
  const topPost = posts.reduce(
    (best, p) => ((p.likes_count || 0) > (best?.likes_count || 0) ? p : best),
    posts[0] || null,
  );
  const statValue = (v) => (postsLoading || postsError ? '-' : v.toLocaleString());

  const len = newPost.length;
  const pct = (len / MAX_CHARS) * 100;
  const charClass = pct >= 95 ? 'danger' : pct >= 80 ? 'warning' : '';

  const insertEmoji = (emoji) => {
    setNewPost((p) => p + emoji);
  };

  return (
    <div className="ptr-page">
      <div className="ptr-page-header">
        <h1 className="ptr-page-title">Community Hub</h1>
        <div className="ptr-tab-group">
          {[
            { key: 'feed', label: 'Feed', icon: 'bi-newspaper' },
            { key: 'messages', label: 'Messages', icon: 'bi-chat-dots' },
            { key: 'analytics', label: 'Analytics', icon: 'bi-bar-chart' },
            { key: 'badges', label: 'Badges', icon: 'bi-award' },
          ].map((t) => (
            <button
              key={t.key}
              className={`ptr-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <i className={`bi ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ptr-stats-row ptr-stats-compact">
        <div className="ptr-stat-mini">
          <span className="ptr-stat-mini-value">{statValue(posts.length)}</span>
          <span className="ptr-stat-mini-label">Posts</span>
        </div>
        <div className="ptr-stat-mini">
          <span className="ptr-stat-mini-value">{statValue(totalLikes)}</span>
          <span className="ptr-stat-mini-label">Total Likes</span>
        </div>
        <div className="ptr-stat-mini">
          <span className="ptr-stat-mini-value">{statValue(totalComments)}</span>
          <span className="ptr-stat-mini-label">Comments</span>
        </div>
      </div>

      {activeTab === 'feed' && (
        <div className="ptr-row-2">
          <div className="ptr-card" style={{ flex: 1.5 }}>
            <div className="ptr-compose">
              <textarea
                className="ptr-compose-input"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share a market insight, trade idea, or update with your followers..."
                maxLength={MAX_CHARS}
              />
              <div className="ptr-compose-actions">
                <div className="ptr-compose-tools">
                  <EmojiPicker onPick={insertEmoji} anchorRef={emojiAnchorRef} />
                </div>
                <div className="ptr-compose-right">
                  <span className={`ptr-char-count ${charClass}`}>
                    {len}/{MAX_CHARS}
                  </span>
                  <button
                    type="button"
                    className="ptr-btn-primary"
                    disabled={!newPost.trim() || posting}
                    onClick={submitPost}
                  >
                    {posting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
              {postError ? (
                <p className="ptr-inline-error" role="alert">
                  {postError}
                </p>
              ) : null}
            </div>

            {postsError ? (
              <p className="ptr-inline-error" role="alert">
                {postsError}
              </p>
            ) : null}
            {!postsLoading && !postsError && posts.length === 0 ? (
              <PartnerPreviewEmpty icon="bi-chat-square-text" title="No posts yet">
                Your posts appear here and in the community feed.
              </PartnerPreviewEmpty>
            ) : null}

            {posts.map((post) => (
              <div key={post.id} className="ptr-post">
                <div className="ptr-post-author">
                  <span className="ptr-post-author-name">{displayName}</span>
                  {displayBadges.length ? <BadgeRow badges={displayBadges} /> : null}
                </div>
                <p className="ptr-post-text">{post.content}</p>
                <div className="ptr-post-meta">
                  <span className="ptr-post-time">{fmtPostTime(post.created_at)}</span>
                  <div className="ptr-post-stats">
                    <span>
                      <i className="bi bi-heart" aria-hidden /> {post.likes_count || 0}
                    </span>
                    <span>
                      <i className="bi bi-chat" aria-hidden /> {post.comments_count || 0}
                    </span>
                    <span>
                      <i className="bi bi-repeat" aria-hidden /> {post.reposts_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              flex: 1,
              minWidth: 0,
            }}
          >
            <div className="ptr-card">
              <div className="ptr-card-header">
                <h3>Follower Activity</h3>
              </div>
              <PartnerPreviewEmpty icon="bi-people">
                New followers, copies and enrollments will show up here.
              </PartnerPreviewEmpty>
            </div>
            <CommunitySocialConnectCard variant="partner" />
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Copier Messages</h3>
          </div>
          <PartnerPreviewEmpty icon="bi-chat-dots">
            Messages from the members copying your strategies.
          </PartnerPreviewEmpty>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="ptr-analytics-grid">
          <div className="ptr-card ptr-analytics-card">
            <h4>Post Performance</h4>
            <div className="ptr-analytics-big">{statValue(posts.length)}</div>
            <span className="ptr-analytics-label">Total Posts</span>
            <div className="ptr-analytics-sub">
              {posts.length
                ? `Avg. ${Math.round(totalLikes / posts.length)} likes per post`
                : 'No posts yet'}
            </div>
          </div>
          <div className="ptr-card ptr-analytics-card">
            <h4>Top Content</h4>
            <div className="ptr-analytics-big">{statValue(topPost?.likes_count || 0)}</div>
            <span className="ptr-analytics-label">Most Likes on a Post</span>
            <div className="ptr-analytics-sub">
              {topPost?.content ? topPost.content.slice(0, 60) : 'No posts yet'}
            </div>
          </div>
          <div className="ptr-card ptr-analytics-card">
            <h4>Follower Growth</h4>
            <PartnerPreviewEmpty icon="bi-graph-up" />
          </div>
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="ptr-badges-page">
          <div className="ptr-card" style={{ marginBottom: '1.25rem' }}>
            <div className="ptr-card-header">
              <h3>Badges & Achievements</h3>
              <span className="ptr-card-count">
                {totalEarned} of {totalAvailable} earned
              </span>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: '6px',
                    background: 'rgba(212,168,83,0.08)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${totalAvailable ? (totalEarned / totalAvailable) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #cd7f32, #d4a853, #b9f2ff)',
                      borderRadius: '3px',
                      transition: 'width 0.5s',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#d4a853' }}>
                  {totalAvailable ? Math.round((totalEarned / totalAvailable) * 100) : 0}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {[
                  { name: 'Bronze', color: '#cd7f32' },
                  { name: 'Silver', color: '#c0c0c0' },
                  { name: 'Gold', color: '#d4a853' },
                  { name: 'Platinum', color: '#e5e4e2' },
                  { name: 'Diamond', color: '#b9f2ff' },
                ].map((t) => (
                  <div
                    key={t.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.5625rem',
                      color: '#6b7280',
                      fontWeight: 600,
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: t.color,
                      }}
                    />
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ptr-tab-group" style={{ marginBottom: '1.25rem' }}>
            {['All', ...Object.keys(badgeCategories)].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`ptr-tab ${badgeFilter === cat ? 'active' : ''}`}
                onClick={() => setBadgeFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {badgesLoading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#6b7280',
                fontSize: '0.875rem',
              }}
            >
              Loading badges...
            </div>
          ) : (
            <div className="ptr-badges-grid">
              {(badgeFilter === 'All'
                ? Object.values(badgeCategories).flat()
                : badgeCategories[badgeFilter] || []
              ).map((badge) => {
                const tierStyles = {
                  1: {
                    border: '#cd7f32',
                    bg: 'rgba(205,127,50,0.08)',
                    glow: 'rgba(205,127,50,0.2)',
                  },
                  2: {
                    border: '#c0c0c0',
                    bg: 'rgba(192,192,192,0.08)',
                    glow: 'rgba(192,192,192,0.2)',
                  },
                  3: {
                    border: '#d4a853',
                    bg: 'rgba(212,168,83,0.08)',
                    glow: 'rgba(212,168,83,0.2)',
                  },
                  4: {
                    border: '#e5e4e2',
                    bg: 'rgba(229,228,226,0.08)',
                    glow: 'rgba(229,228,226,0.25)',
                  },
                  5: {
                    border: '#b9f2ff',
                    bg: 'rgba(185,242,255,0.08)',
                    glow: 'rgba(185,242,255,0.3)',
                  },
                };
                const style = tierStyles[badge.tier] || tierStyles[1];

                return (
                  <div
                    key={badge.id}
                    className="ptr-card ptr-badge-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      padding: '1.25rem 0.75rem',
                      opacity: badge.earned ? 1 : 0.5,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        border: `2px solid ${badge.earned ? style.border : 'rgba(107,114,128,0.2)'}`,
                        background: badge.earned ? style.bg : 'rgba(107,114,128,0.04)',
                        boxShadow: badge.earned ? `0 0 16px ${style.glow}` : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <i
                        className={`bi ${badge.badge_icon}`}
                        style={{ color: badge.earned ? badge.tier_color : '#4b5563' }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: '0.5rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '0.25rem',
                        color: badge.earned ? badge.tier_color : '#4b5563',
                      }}
                    >
                      {badge.tier_name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: '#e2e8f0',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {badge.badge_name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.625rem',
                        color: '#6b7280',
                        lineHeight: 1.4,
                        marginBottom: '0.375rem',
                      }}
                    >
                      {badge.badge_description}
                    </div>
                    {badge.earned && badge.earnedAt ? (
                      <div style={{ fontSize: '0.5rem', color: '#4b5563' }}>
                        Earned {new Date(badge.earnedAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: '0.5625rem',
                          color: '#4b5563',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          justifyContent: 'center',
                        }}
                      >
                        <i className="bi bi-lock-fill" /> Locked
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
