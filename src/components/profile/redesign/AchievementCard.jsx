'use client';

import { useEffect, useState } from 'react';
import {
  page,
  shape,
  achievementCategoryAccents,
  type as typeTokens,
} from './profile-design-tokens';

export function AchievementCard({ achievement }) {
  const earned = !!achievement.earnedAt;
  const inProgress = !earned && (achievement.progress ?? 0) > 0;
  const accent = achievementCategoryAccents[achievement.category] || page.inkMuted;

  const [animBar, setAnimBar] = useState(0);
  useEffect(() => {
    if (inProgress) {
      const id = requestAnimationFrame(() => setAnimBar(achievement.progress ?? 0));
      return () => cancelAnimationFrame(id);
    }
  }, [inProgress, achievement.progress]);

  const earnedDate = earned
    ? new Date(achievement.earnedAt).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
      })
    : '';

  const surface = earned ? page.surface : page.surfaceMuted;
  const opacity = !earned && (achievement.progress ?? 0) === 0 ? 0.55 : 1;

  return (
    <div
      role="article"
      aria-label={`${achievement.name} — ${earned ? 'earned' : inProgress ? `${Math.round((achievement.progress ?? 0) * 100)}% progress` : 'locked'}`}
      style={{
        background: surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.inner,
        padding: '12px 12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity,
        fontFamily: typeTokens.sans,
        transition: 'transform 120ms ease-out, box-shadow 120ms ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = shape.shadow.hero;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: shape.radius.chip,
            background: earned ? `${accent}14` : page.surfaceAlt,
            color: earned ? accent : page.inkMuted,
            border: earned ? `1px solid ${accent}33` : `1px solid ${page.border}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
          }}
          aria-hidden
        >
          {achievement.iconGlyph}
        </span>
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.5, color: accent }}>
          {achievement.category}
        </span>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: page.ink, lineHeight: 1.2 }}>
        {achievement.name}
      </div>
      <div style={{ fontSize: 11, color: page.inkMuted }}>
        {earned
          ? `Earned ${earnedDate}`
          : inProgress
            ? `${Math.round((achievement.progress ?? 0) * 100)}% progress`
            : 'Locked'}
      </div>
      {inProgress && (
        <div
          style={{
            height: 3,
            background: page.surfaceAlt,
            borderRadius: shape.radius.pill,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${animBar * 100}%`,
              height: '100%',
              background: accent,
              transition: 'width 400ms ease-out',
            }}
          />
        </div>
      )}
    </div>
  );
}
