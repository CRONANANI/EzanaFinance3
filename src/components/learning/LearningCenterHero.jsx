'use client';

import { getInitials } from '@/lib/community-utils';
import { LearningTrackBadgeChips } from '@/components/learning/LearningTrackBadgeChips';
import { learningTrackBiClass } from '@/lib/dashboard-bi-icons';

export function LearningCenterHero({ viewer, overall, tracks, badges }) {
  const name = viewer?.displayName || 'Learner';
  const first = name.split(/\s+/)[0] || name;
  const initials = getInitials(name, '');
  const currentTrack = tracks?.find((t) => t.id === viewer?.currentTrackId) || tracks?.[0];
  const trackPct = currentTrack?.summary?.pct ?? 0;

  return (
    <div className="lc2-hero db-card">
      <div className="lc2-hero-glow" aria-hidden />
      <div className="lc2-hero-avatar-wrap">
        {viewer?.avatarUrl ? (
          <div className="lc2-hero-avatar">
            <img src={viewer.avatarUrl} alt="" />
          </div>
        ) : (
          <div className="lc2-hero-avatar">
            <span className="lc2-hero-avatar-initials">{initials}</span>
          </div>
        )}
      </div>
      <div className="lc2-hero-main">
        <h2 className="lc2-hero-kicker">Welcome back, {first}</h2>
        <p className="lc2-hero-sub">Your learning journey</p>
        <p className="lc2-hero-progress-line">
          {overall.completed}/{overall.total} courses completed · {overall.pct}% overall
        </p>
        <p className="lc2-hero-track-line">
          Current track:{' '}
          {currentTrack ? (
            <>
              <i className={`bi ${learningTrackBiClass(currentTrack.id)}`} style={{ marginRight: '0.35rem' }} aria-hidden />
              {currentTrack.shortLabel}
            </>
          ) : (
            '—'
          )}
        </p>
        <div className="lc2-hero-track-bar">
          <div className="lc2-hero-track-fill" style={{ width: `${trackPct}%` }} />
        </div>
        <div className="lc2-hero-badges-block">
          <div className="lc2-hero-badges-label">Your badges:</div>
          {badges?.length > 0 ? (
            <LearningTrackBadgeChips badgeKeys={badges.map((b) => b.badge_key)} />
          ) : (
            <span className="lc2-hero-badges-empty">Complete courses to earn track badges.</span>
          )}
        </div>
      </div>
    </div>
  );
}
