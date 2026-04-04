'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  LEARNING_BADGE_TIER_STYLES,
  LEARNING_COMMUNITY_CATEGORY_ORDER,
} from '@/lib/learning-community-badges';

const TIER_LEGEND = [
  { name: 'Bronze', color: '#cd7f32' },
  { name: 'Silver', color: '#c0c0c0' },
  { name: 'Gold', color: '#d4a853' },
  { name: 'Platinum', color: '#e5e4e2' },
  { name: 'Diamond', color: '#b9f2ff' },
];

export function LearningCommunityBadgesPanel() {
  const { user } = useAuth();
  const [categories, setCategories] = useState({});
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(25);
  const [badgeFilter, setBadgeFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/learning/community-badges', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setCategories(data.categories || {});
      setTotalEarned(data.totalEarned ?? 0);
      setTotalAvailable(data.totalAvailable ?? 25);
    } catch (e) {
      setErr(e.message);
      setCategories({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setCategories({});
      setTotalEarned(0);
      setTotalAvailable(25);
      return;
    }
    load();
  }, [user?.id, load]);

  if (!user?.id) {
    return (
      <div className="comm-lc-badges-page">
        <div className="db-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#8b949e', fontSize: '0.875rem', margin: '0 0 1rem' }}>
            Sign in to see your course topic badges and progress.
          </p>
          <Link
            href="/auth/login"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1.25rem',
              borderRadius: 10,
              background: '#10b981',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.8125rem',
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const filterTabs = ['All', ...LEARNING_COMMUNITY_CATEGORY_ORDER.filter((c) => categories[c]?.length)];

  const visibleBadges =
    badgeFilter === 'All'
      ? LEARNING_COMMUNITY_CATEGORY_ORDER.flatMap((c) => categories[c] || [])
      : categories[badgeFilter] || [];

  const pct = totalAvailable ? Math.round((totalEarned / totalAvailable) * 100) : 0;

  return (
    <div className="comm-lc-badges-page">
      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div className="db-card-header">
          <div>
            <h3 style={{ margin: 0 }}>Course topic badges</h3>
            <p style={{ color: '#6b7280', fontSize: '0.6875rem', margin: '0.15rem 0 0' }}>
              Same tier style as partner achievements — earn by completing Learning Center tracks
            </p>
          </div>
          <Link href="/learning-center" style={{ color: '#10b981', fontSize: '0.6875rem', fontWeight: 600, textDecoration: 'none' }}>
            Learning Center →
          </Link>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b949e' }}>
              {totalEarned} of {totalAvailable} earned
            </span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#d4a853' }}>{pct}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div
              style={{
                flex: 1,
                height: 6,
                background: 'rgba(212,168,83,0.08)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #cd7f32, #d4a853, #b9f2ff)',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {TIER_LEGEND.map((t) => (
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
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
                <span>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="comm-lc-badges-filter-row">
        {filterTabs.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`comm-lc-badges-filter-tab ${badgeFilter === cat ? 'comm-lc-badges-filter-tab--active' : ''}`}
            onClick={() => setBadgeFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {err && (
        <div className="db-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ color: '#f87171', fontSize: '0.8125rem', margin: 0 }}>{err}</p>
          <button type="button" onClick={load} style={{ marginTop: '0.5rem', color: '#10b981', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="db-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>Loading badges…</p>
        </div>
      ) : (
        <div className="comm-lc-badges-grid">
          {visibleBadges.map((badge) => {
            const style = LEARNING_BADGE_TIER_STYLES[badge.tier] || LEARNING_BADGE_TIER_STYLES[1];
            return (
              <div
                key={badge.id}
                className="comm-lc-badge-card db-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '1.25rem 0.75rem',
                  opacity: badge.earned ? 1 : 0.5,
                  transition: 'all 0.2s',
                  margin: 0,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
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
                  <i className={`bi ${badge.badge_icon}`} style={{ color: badge.earned ? badge.tier_color : '#4b5563' }} />
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
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem' }}>{badge.badge_name}</div>
                <div style={{ fontSize: '0.625rem', color: '#6b7280', lineHeight: 1.4, marginBottom: '0.375rem' }}>{badge.badge_description}</div>
                {badge.earned && badge.earnedAt ? (
                  <div style={{ fontSize: '0.5rem', color: '#4b5563' }}>Earned {new Date(badge.earnedAt).toLocaleDateString()}</div>
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
  );
}
