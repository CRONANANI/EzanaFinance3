'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getInitials } from '@/lib/community-utils';
import { LearningTrackBadgeChips } from '@/components/learning/LearningTrackBadgeChips';
import { learningTrackBiClass } from '@/lib/dashboard-bi-icons';

/** When `friends` is omitted, loads from `/api/learning/friends-activity`. */
export function FriendsLearningCard({ friends: friendsProp, loading: loadingProp }) {
  const [internalFriends, setInternalFriends] = useState([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const controlled = friendsProp !== undefined;
  const friends = controlled ? friendsProp : internalFriends;
  const loading = controlled ? Boolean(loadingProp) : internalLoading;

  const load = useCallback(async () => {
    setInternalLoading(true);
    try {
      const res = await fetch('/api/learning/friends-activity', { cache: 'no-store' });
      const json = await res.json();
      setInternalFriends(json.friends || []);
    } catch {
      setInternalFriends([]);
    } finally {
      setInternalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (controlled) return;
    load();
  }, [controlled, load]);

  return (
    <section className="db-card lc3-friends-card" aria-label="Friends learning activity">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-people-fill" style={{ marginRight: '.35rem', color: '#10b981' }} aria-hidden />
          Friends Learning
        </h3>
        <Link href="/community" style={{ color: '#10b981', fontSize: '.6875rem', fontWeight: 600, textDecoration: 'none' }}>
          See All
        </Link>
      </div>
      <div style={{ padding: '0 1.25rem 1rem' }}>
        {loading ? (
          <p style={{ color: '#6b7280', fontSize: '.8125rem', padding: '.75rem 0' }}>Loading…</p>
        ) : !friends?.length ? (
          <p style={{ color: '#6b7280', fontSize: '.8125rem', padding: '.75rem 0' }}>
            Follow people in Community to see what they&apos;re learning.
          </p>
        ) : (
          friends.map((f) => (
            <div
              key={f.userId}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '.65rem',
                padding: '.65rem 0',
                borderBottom: '1px solid rgba(16,185,129,0.04)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  fontSize: '.6rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {getInitials(f.displayName, '')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
                  <span className="lc3-friend-name" style={{ fontSize: '.8125rem', fontWeight: 700 }}>
                    {f.displayName}
                  </span>
                  <span style={{ color: '#10b981', fontSize: '.625rem', fontWeight: 700 }}>{f.progressPct}%</span>
                </div>
                <p style={{ color: '#6b7280', fontSize: '.625rem', margin: '.2rem 0 0' }}>
                  Taking: &quot;{f.currentCourseTitle}&quot;
                </p>
                <p style={{ color: '#6b7280', fontSize: '.55rem', margin: '.15rem 0 0', display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                  <i className={`bi ${learningTrackBiClass(f.trackId)}`} aria-hidden />
                  {f.trackLabel}
                </p>
                {f.badgeKeys?.length ? (
                  <div style={{ marginTop: '.35rem' }}>
                    <LearningTrackBadgeChips badgeKeys={f.badgeKeys} />
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
