'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BadgeRow } from '@/components/partner/BadgeDisplay';
import '../partner.css';
import '@/components/partner/badges.css';

const MAX_CHARS = 280;
const EMOJIS = ['😀','😊','👍','❤️','🔥','📈','💰','🎯','✅','🚀','💡','📊','⭐','🙌','💪','🎉','🤝','📉','💎','🏆'];

function EmojiPicker({ onPick, anchorRef }) {
  const [open, setOpen] = useState(false);
  const popRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (!popRef.current?.contains(e.target) && !anchorRef?.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [anchorRef]);

  return (
    <div className="ptr-emoji-wrap" ref={anchorRef}>
      <button type="button" className="ptr-compose-tool" title="Emoji" onClick={() => setOpen(!open)}>
        <i className="bi bi-emoji-smile" />
      </button>
      {open && (
        <div className="ptr-emoji-picker" ref={popRef} onClick={(e) => e.stopPropagation()}>
          {EMOJIS.map((e, i) => (
            <button key={i} type="button" className="ptr-emoji-btn" onClick={() => { onPick(e); setOpen(false); }}>{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}

const ENGAGEMENT_STATS = {
  followers: 847,
  followersChange: 34,
  posts: 156,
  likes: 4230,
  comments: 892,
  shares: 341,
  avgEngagement: 8.7,
};

const RECENT_POSTS = [
  { id: 1, text: 'Just opened a position in NVDA ahead of earnings. Heres my thesis...', likes: 124, comments: 38, shares: 15, time: '2 hours ago', pinned: true },
  { id: 2, text: 'Weekly portfolio update: +3.2% this week. Top mover was MSFT after the Azure numbers.', likes: 89, comments: 22, shares: 8, time: '1 day ago', pinned: false },
  { id: 3, text: 'New course dropping next week: Advanced Options Strategies. Pre-register now.', likes: 156, comments: 47, shares: 31, time: '3 days ago', pinned: false },
  { id: 4, text: 'Why Im bullish on energy stocks in 2026 — a contrarian take. Thread', likes: 201, comments: 63, shares: 42, time: '5 days ago', pinned: false },
];

const FOLLOWER_ACTIVITY = [
  { name: 'Alex M.', action: 'started copying your portfolio', time: '12 min ago', avatar: 'A' },
  { name: 'Sarah K.', action: 'commented on your NVDA thesis', time: '1 hour ago', avatar: 'S' },
  { name: 'James L.', action: 'liked your weekly update', time: '2 hours ago', avatar: 'J' },
  { name: 'Maria R.', action: 'enrolled in your Options course', time: '4 hours ago', avatar: 'M' },
  { name: 'David W.', action: 'shared your energy thread', time: '6 hours ago', avatar: 'D' },
  { name: 'Lisa T.', action: 'followed you', time: '8 hours ago', avatar: 'L' },
];

const COPIER_MESSAGES = [
  { from: 'Alex M.', text: 'Hey, love the NVDA call. Whats your stop loss?', time: '30 min ago', unread: true },
  { from: 'Sarah K.', text: 'Can you do a video on your position sizing strategy?', time: '2 hours ago', unread: true },
  { from: 'Mark R.', text: 'Thanks for the dividend picks — already up 8%!', time: '1 day ago', unread: false },
];

const SAMPLE_BADGES = [
  { id: '1', badge_name: 'Verified Partner', badge_icon: 'bi-patch-check-fill', tier: 1, tier_name: 'Bronze', tier_color: '#cd7f32' },
  { id: '2', badge_name: 'Echo Writer', badge_icon: 'bi-pencil-square', tier: 2, tier_name: 'Silver', tier_color: '#c0c0c0' },
];

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
  const emojiAnchorRef = useRef(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
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

  useEffect(() => {
    if (activeTab === 'badges') {
      const fetchBadges = async () => {
        setBadgesLoading(true);
        try {
          const token = await getToken();
          const res = await fetch('/api/partner/badges', { headers: { Authorization: `Bearer ${token}` } });
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
  const displayBadges = earnedBadges.length ? earnedBadges : SAMPLE_BADGES;

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
            <button key={t.key} className={`ptr-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              <i className={`bi ${t.icon}`} /> {t.label}
              {t.key === 'messages' && COPIER_MESSAGES.filter(m => m.unread).length > 0 && (
                <span className="ptr-tab-badge">{COPIER_MESSAGES.filter(m => m.unread).length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="ptr-stats-row ptr-stats-compact">
        <div className="ptr-stat-mini"><span className="ptr-stat-mini-value">{ENGAGEMENT_STATS.followers}</span><span className="ptr-stat-mini-label">Followers <span className="positive">+{ENGAGEMENT_STATS.followersChange}</span></span></div>
        <div className="ptr-stat-mini"><span className="ptr-stat-mini-value">{ENGAGEMENT_STATS.likes.toLocaleString()}</span><span className="ptr-stat-mini-label">Total Likes</span></div>
        <div className="ptr-stat-mini"><span className="ptr-stat-mini-value">{ENGAGEMENT_STATS.comments}</span><span className="ptr-stat-mini-label">Comments</span></div>
        <div className="ptr-stat-mini"><span className="ptr-stat-mini-value">{ENGAGEMENT_STATS.avgEngagement}%</span><span className="ptr-stat-mini-label">Engagement Rate</span></div>
      </div>

      {activeTab === 'feed' && (
        <div className="ptr-row-2">
          <div className="ptr-card" style={{ flex: 1.5 }}>
            <div className="ptr-compose">
              <textarea className="ptr-compose-input" value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Share a market insight, trade idea, or update with your followers..." maxLength={MAX_CHARS} />
              <div className="ptr-compose-actions">
                <div className="ptr-compose-tools">
                  <EmojiPicker onPick={insertEmoji} anchorRef={emojiAnchorRef} />
                  <button className="ptr-compose-tool" title="Image"><i className="bi bi-image" /></button>
                  <button className="ptr-compose-tool" title="Poll"><i className="bi bi-bar-chart-steps" /></button>
                  <button className="ptr-compose-tool" title="Schedule"><i className="bi bi-clock" /></button>
                </div>
                <div className="ptr-compose-right">
                  <span className={`ptr-char-count ${charClass}`}>{len}/{MAX_CHARS}</span>
                  <button className="ptr-btn-primary" disabled={!newPost.trim()}>Post</button>
                </div>
              </div>
            </div>

            {RECENT_POSTS.map((post) => (
              <div key={post.id} className="ptr-post">
                {post.pinned && <span className="ptr-post-pinned"><i className="bi bi-pin-fill" /> Pinned</span>}
                <div className="ptr-post-author">
                  <span className="ptr-post-author-name">{displayName}</span>
                  <BadgeRow badges={displayBadges} />
                </div>
                <p className="ptr-post-text">{post.text}</p>
                <div className="ptr-post-meta">
                  <span className="ptr-post-time">{post.time}</span>
                  <div className="ptr-post-stats">
                    <span><i className="bi bi-heart" /> {post.likes}</span>
                    <span><i className="bi bi-chat" /> {post.comments}</span>
                    <span><i className="bi bi-share" /> {post.shares}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="ptr-card">
            <div className="ptr-card-header"><h3>Follower Activity</h3></div>
            <div className="ptr-activity-list">
              {FOLLOWER_ACTIVITY.map((f, i) => (
                <div key={i} className="ptr-activity-item">
                  <div className="ptr-follower-avatar">{f.avatar}</div>
                  <div className="ptr-activity-body">
                    <span className="ptr-activity-text"><strong>{f.name}</strong> {f.action}</span>
                    <span className="ptr-activity-time">{f.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="ptr-card">
          <div className="ptr-card-header"><h3>Copier Messages</h3></div>
          {COPIER_MESSAGES.map((m, i) => (
            <div key={i} className={`ptr-message-item ${m.unread ? 'unread' : ''}`}>
              <div className="ptr-message-avatar">{m.from[0]}</div>
              <div className="ptr-message-body">
                <div className="ptr-message-header">
                  <span className="ptr-message-from">{m.from}</span>
                  <span className="ptr-message-time">{m.time}</span>
                </div>
                <p className="ptr-message-text">{m.text}</p>
              </div>
              {m.unread && <span className="ptr-unread-dot" />}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="ptr-analytics-grid">
          <div className="ptr-card ptr-analytics-card">
            <h4>Post Performance</h4>
            <div className="ptr-analytics-big">{ENGAGEMENT_STATS.posts}</div>
            <span className="ptr-analytics-label">Total Posts</span>
            <div className="ptr-analytics-sub">Avg. {Math.round(ENGAGEMENT_STATS.likes / ENGAGEMENT_STATS.posts)} likes per post</div>
          </div>
          <div className="ptr-card ptr-analytics-card">
            <h4>Follower Growth</h4>
            <div className="ptr-analytics-big">+{ENGAGEMENT_STATS.followersChange}</div>
            <span className="ptr-analytics-label">New This Month</span>
            <div className="ptr-analytics-sub">{ENGAGEMENT_STATS.followers} total followers</div>
          </div>
          <div className="ptr-card ptr-analytics-card">
            <h4>Engagement Rate</h4>
            <div className="ptr-analytics-big">{ENGAGEMENT_STATS.avgEngagement}%</div>
            <span className="ptr-analytics-label">Avg. Engagement</span>
            <div className="ptr-analytics-sub">Industry avg: 3.2%</div>
          </div>
          <div className="ptr-card ptr-analytics-card">
            <h4>Top Content</h4>
            <div className="ptr-analytics-big">201</div>
            <span className="ptr-analytics-label">Most Likes on a Post</span>
            <div className="ptr-analytics-sub">Energy stocks 2026 thread</div>
          </div>
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="ptr-badges-page">
          <div className="ptr-card" style={{ marginBottom: '1.25rem' }}>
            <div className="ptr-card-header">
              <h3>Badges & Achievements</h3>
              <span className="ptr-card-count">{totalEarned} of {totalAvailable} earned</span>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, height: '6px', background: 'rgba(212,168,83,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${totalAvailable ? (totalEarned / totalAvailable) * 100 : 0}%`, background: 'linear-gradient(90deg, #cd7f32, #d4a853, #b9f2ff)', borderRadius: '3px', transition: 'width 0.5s' }} />
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
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.5625rem', color: '#6b7280', fontWeight: 600 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.color }} />
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ptr-tab-group" style={{ marginBottom: '1.25rem' }}>
            {['All', ...Object.keys(badgeCategories)].map((cat) => (
              <button key={cat} type="button" className={`ptr-tab ${badgeFilter === cat ? 'active' : ''}`} onClick={() => setBadgeFilter(cat)}>
                {cat}
              </button>
            ))}
          </div>

          {badgesLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading badges...</div>
          ) : (
            <div className="ptr-badges-grid">
              {(badgeFilter === 'All'
                ? Object.values(badgeCategories).flat()
                : badgeCategories[badgeFilter] || []
              ).map((badge) => {
                const tierStyles = {
                  1: { border: '#cd7f32', bg: 'rgba(205,127,50,0.08)', glow: 'rgba(205,127,50,0.2)' },
                  2: { border: '#c0c0c0', bg: 'rgba(192,192,192,0.08)', glow: 'rgba(192,192,192,0.2)' },
                  3: { border: '#d4a853', bg: 'rgba(212,168,83,0.08)', glow: 'rgba(212,168,83,0.2)' },
                  4: { border: '#e5e4e2', bg: 'rgba(229,228,226,0.08)', glow: 'rgba(229,228,226,0.25)' },
                  5: { border: '#b9f2ff', bg: 'rgba(185,242,255,0.08)', glow: 'rgba(185,242,255,0.3)' },
                };
                const style = tierStyles[badge.tier] || tierStyles[1];

                return (
                  <div key={badge.id} className="ptr-card ptr-badge-card" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    textAlign: 'center', padding: '1.25rem 0.75rem',
                    opacity: badge.earned ? 1 : 0.5,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '14px',
                      border: `2px solid ${badge.earned ? style.border : 'rgba(107,114,128,0.2)'}`,
                      background: badge.earned ? style.bg : 'rgba(107,114,128,0.04)',
                      boxShadow: badge.earned ? `0 0 16px ${style.glow}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem', marginBottom: '0.75rem',
                    }}>
                      <i className={`bi ${badge.badge_icon}`} style={{ color: badge.earned ? badge.tier_color : '#4b5563' }} />
                    </div>
                    <div style={{
                      fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.1em', marginBottom: '0.25rem',
                      color: badge.earned ? badge.tier_color : '#4b5563',
                    }}>
                      {badge.tier_name}
                    </div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem' }}>
                      {badge.badge_name}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: '#6b7280', lineHeight: 1.4, marginBottom: '0.375rem' }}>
                      {badge.badge_description}
                    </div>
                    {badge.earned && badge.earnedAt ? (
                      <div style={{ fontSize: '0.5rem', color: '#4b5563' }}>
                        Earned {new Date(badge.earnedAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.5625rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
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
