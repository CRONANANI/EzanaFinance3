'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getInitials } from '@/lib/community-utils';
import { LearningTrackBadgeChips } from '@/components/learning/LearningTrackBadgeChips';
import { learningTrackBiClass } from '@/lib/dashboard-bi-icons';

export function FriendsLearningCard() {
  const [friends, setFriends] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/learning/friends-activity', { cache: 'no-store' });
      const json = await res.json();
      setFriends(json.friends || []);
    } catch {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="lc2-friends-card db-card" aria-label="Friends learning activity">
      <div className="lc2-sec-head">
        <h2 className="lc2-sec-title lc2-sec-title-with-bi">
          <i className="bi bi-people-fill" aria-hidden />
          Friends Learning Now
        </h2>
      </div>
      {loading ? (
        <p className="lc2-friends-empty">Loading…</p>
      ) : !friends?.length ? (
        <p className="lc2-friends-empty">Follow people in Community to see what they&apos;re learning.</p>
      ) : (
        <div className="lc2-friends-list">
          {friends.map((f) => (
            <div key={f.userId} className="lc2-friend-row">
              <div className="lc2-friend-avatar" aria-hidden>
                {getInitials(f.displayName, '')}
              </div>
              <div className="lc2-friend-body">
                <div className="lc2-friend-top">
                  <span className="lc2-friend-name">{f.displayName}</span>
                  <span className="lc2-friend-track-label">
                    <i className={`bi ${learningTrackBiClass(f.trackId)}`} aria-hidden /> {f.trackLabel}
                  </span>
                  <div className="lc2-friend-bar-wrap">
                    <div className="lc2-friend-bar">
                      <div className="lc2-friend-bar-fill" style={{ width: `${f.progressPct}%` }} />
                    </div>
                    <span className="lc2-friend-pct">{f.progressPct}%</span>
                  </div>
                </div>
                <div className="lc2-friend-course">
                  Taking: &quot;{f.currentCourseTitle}&quot;
                </div>
                <div className="lc2-friend-badges">
                  <LearningTrackBadgeChips badgeKeys={f.badgeKeys} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="lc2-friends-footer">
        <Link href="/community" className="lc2-sec-link">
          See All Friends →
        </Link>
      </div>
    </section>
  );
}
