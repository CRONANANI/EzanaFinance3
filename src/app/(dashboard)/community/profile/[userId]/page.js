'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getInitials, formatRelativeTime } from '@/lib/community-utils';
import '../../../home-dashboard/home-dashboard.css';
import '../../community.css';

export default function CommunityUserProfilePage() {
  const { userId } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`/api/community/profile/${userId}`);
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || 'Could not load profile');
        setData(null);
        return;
      }
      setData(json);

      const { data: postRows } = await supabase
        .from('community_posts')
        .select('id, content, mentioned_ticker, likes_count, comments_count, created_at')
        .eq('user_id', userId)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false })
        .limit(20);
      setPosts(postRows || []);
    } catch (e) {
      setErr(e.message || 'Error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFollow = async () => {
    if (!data?.viewer?.id || data.viewer.is_owner) return;
    setFollowBusy(true);
    try {
      const action = data.is_followed_by_viewer ? 'unfollow' : 'follow';
      await fetch('/api/community/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: userId, action }),
      });
      await load();
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page-inset db-page" style={{ paddingTop: '1rem' }}>
        <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>Loading profile…</p>
      </div>
    );
  }

  if (err || !data?.profile) {
    return (
      <div className="dashboard-page-inset db-page" style={{ paddingTop: '1rem' }}>
        <Link href="/community" className="comm-card-link" style={{ marginBottom: '1rem' }}>
          <i className="bi bi-arrow-left" /> Back to Community
        </Link>
        <p style={{ color: '#f87171' }}>{err || 'User not found'}</p>
      </div>
    );
  }

  const p = data.profile;
  const display = p.display_name || 'Member';
  const initials = getInitials(p.display_name);

  return (
    <div className="dashboard-page-inset db-page" style={{ paddingBottom: '2rem' }}>
      <button
        type="button"
        onClick={() => router.push('/community')}
        style={{
          background: 'none',
          border: 'none',
          color: '#10b981',
          cursor: 'pointer',
          marginBottom: '1.25rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <i className="bi bi-arrow-left" /> Back to Community
      </button>

      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-start' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#1a1a1a',
              border: '2px solid rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.5rem',
              fontWeight: 800,
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" width={80} height={80} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 className="db-greeting" style={{ fontSize: '1.5rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span>{display}</span>
              {p.is_partner ? (
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}
                >
                  {p.partner_type === 'creator' ? 'Creator' : 'Partner'}
                </span>
              ) : null}
            </h1>
            {p.bio ? (
              <p style={{ color: '#8b949e', fontSize: '0.8125rem', margin: 0, lineHeight: 1.45 }}>
                {p.bio}
              </p>
            ) : null}
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#e2e8f0', fontSize: '0.8125rem' }}>
                <strong>{data.counts.followers}</strong>{' '}
                <span style={{ color: '#6b7280' }}>followers</span>
              </span>
              <span style={{ color: '#e2e8f0', fontSize: '0.8125rem' }}>
                <strong>{data.counts.following}</strong>{' '}
                <span style={{ color: '#6b7280' }}>following</span>
              </span>
            </div>
          </div>
          {data.viewer && !data.viewer.is_owner ? (
            <button
              type="button"
              className={data.is_followed_by_viewer ? 'db-tf-btn' : 'comm-btn-sm'}
              style={
                data.is_followed_by_viewer
                  ? { padding: '0.5rem 1rem', fontSize: '0.75rem' }
                  : { padding: '0.5rem 1.25rem', fontSize: '0.75rem' }
              }
              onClick={handleFollow}
              disabled={followBusy}
            >
              {data.is_followed_by_viewer ? 'Following' : 'Follow'}
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="comm-row-1"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.25rem' }}
      >
        <div className="db-card comm-stat-card">
          <div className="comm-stat-body">
            <span className="comm-stat-label">Posts</span>
            <span className="comm-stat-value">{data.counts.posts}</span>
          </div>
        </div>
        <div className="db-card comm-stat-card">
          <div className="comm-stat-body">
            <span className="comm-stat-label">Followers</span>
            <span className="comm-stat-value">{data.counts.followers}</span>
          </div>
        </div>
        {p.privacy_show_portfolio ? (
          <div className="db-card comm-stat-card">
            <div className="comm-stat-body">
              <span className="comm-stat-label">Portfolio</span>
              <span className="comm-stat-value" style={{ fontSize: '1rem' }}>
                —
              </span>
              <span className="comm-stat-sub">Shown on profile</span>
            </div>
          </div>
        ) : (
          <div className="db-card comm-stat-card">
            <div className="comm-stat-body">
              <span className="comm-stat-label">Portfolio</span>
              <span className="comm-stat-sub">Private</span>
            </div>
          </div>
        )}
        {p.privacy_show_activity ? (
          <div className="db-card comm-stat-card">
            <div className="comm-stat-body">
              <span className="comm-stat-label">Activity</span>
              <span className="comm-stat-value" style={{ fontSize: '1rem' }}>
                Community
              </span>
              <span className="comm-stat-sub">Visible</span>
            </div>
          </div>
        ) : (
          <div className="db-card comm-stat-card">
            <div className="comm-stat-body">
              <span className="comm-stat-label">Activity</span>
              <span className="comm-stat-sub">Private</span>
            </div>
          </div>
        )}
      </div>

      {(data.badges || []).length > 0 && (
        <div className="db-card" style={{ marginBottom: '1.25rem' }}>
          <div className="db-card-header">
            <h3>Badges</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            {data.badges.map((b) => (
              <div
                key={b.id}
                title={b.description || b.name}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.12)',
                  fontSize: '0.75rem',
                  color: '#e2e8f0',
                }}
              >
                <i
                  className={typeof b.icon === 'string' && b.icon.startsWith('bi-') ? b.icon : 'bi bi-award'}
                  style={{ marginRight: '0.35rem' }}
                  aria-hidden
                />
                {b.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.performance && p.privacy_show_portfolio && (
        <div className="db-card" style={{ marginBottom: '1.25rem' }}>
          <div className="db-card-header">
            <h3>Performance summary</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
            <div>
              <span className="comm-stat-label">Return</span>
              <p style={{ color: '#f0f6fc', fontWeight: 800, margin: '0.25rem 0 0', fontSize: '1rem' }}>
                {data.performance.return_pct != null ? `${data.performance.return_pct}%` : '—'}
              </p>
            </div>
            <div>
              <span className="comm-stat-label">Trades</span>
              <p style={{ color: '#f0f6fc', fontWeight: 800, margin: '0.25rem 0 0', fontSize: '1rem' }}>
                {data.performance.total_trades ?? '—'}
              </p>
            </div>
            <div>
              <span className="comm-stat-label">Win rate</span>
              <p style={{ color: '#f0f6fc', fontWeight: 800, margin: '0.25rem 0 0', fontSize: '1rem' }}>
                {data.performance.win_rate != null ? `${data.performance.win_rate}%` : '—'}
              </p>
            </div>
            <div>
              <span className="comm-stat-label">Best stock</span>
              <p style={{ color: '#f0f6fc', fontWeight: 700, margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                {data.performance.best_stock || '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div className="db-card-header">
          <h3>Trading strategies</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {(data.strategies || []).length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#e2e8f0', fontSize: '0.8125rem' }}>
              {data.strategies.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: 0 }}>No strategies shared</p>
          )}
        </div>
      </div>

      {p.privacy_show_activity !== false && (
        <div className="db-card" style={{ marginBottom: '1.25rem' }}>
          <div className="db-card-header">
            <h3>Community activity</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem', color: '#8b949e', fontSize: '0.8125rem', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 0.5rem' }}>
              <strong style={{ color: '#e2e8f0' }}>{data.counts?.posts ?? 0}</strong> posts ·{' '}
              <strong style={{ color: '#e2e8f0' }}>{data.counts?.likes_given ?? 0}</strong> likes given
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem' }}>Recent posts are listed below.</p>
          </div>
        </div>
      )}

      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div className="db-card-header">
          <h3>Learning Center</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {(data.courses || []).length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#e2e8f0', fontSize: '0.8125rem' }}>
              {data.courses.map((c) => (
                <li key={c.id || c.name}>{c.name || c.title}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: 0 }}>No courses enrolled</p>
          )}
        </div>
      </div>

      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div className="db-card-header">
          <h3>Favorite research tools</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {(data.favorite_research_tools || []).length > 0 ? (
            <p style={{ color: '#e2e8f0', fontSize: '0.8125rem', margin: 0, lineHeight: 1.45 }}>
              Most used: {data.favorite_research_tools.join(', ')}
            </p>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: 0 }}>
              Activity-based insights coming soon. Explore Company Research, Market Analysis, and Congressional tools from the nav.
            </p>
          )}
        </div>
      </div>

      <div className="db-card">
        <div className="db-card-header">
          <h3>Posts</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {posts.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '0.8125rem' }}>No posts yet</p>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                style={{
                  padding: '0.75rem 0',
                  borderBottom: '1px solid rgba(16, 185, 129, 0.05)',
                }}
              >
                <p style={{ color: '#e2e8f0', fontSize: '0.8125rem', margin: '0 0 0.35rem', lineHeight: 1.45 }}>
                  {post.content}
                </p>
                <span style={{ color: '#6b7280', fontSize: '0.5625rem' }}>{formatRelativeTime(post.created_at)}</span>
                <span style={{ color: '#6b7280', fontSize: '0.5625rem', marginLeft: '0.75rem' }}>
                  <i className="bi bi-heart" style={{ marginRight: '0.2rem' }} aria-hidden />
                  {post.likes_count} · <i className="bi bi-chat-dots" style={{ marginRight: '0.2rem' }} aria-hidden />
                  {post.comments_count}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
