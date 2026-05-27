'use client';

import { AchievementCard } from './AchievementCard';
import { page, shape, density, type as typeTokens } from './profile-design-tokens';

export function Achievements({ achievements = [] }) {
  const safeList = achievements.slice(0, 9);
  while (safeList.length < 9) {
    safeList.push({
      key: `placeholder-${safeList.length}`,
      name: '—',
      category: 'TRADING',
      iconGlyph: '·',
      earnedAt: null,
      progress: 0,
    });
  }
  const earnedCount = safeList.filter((a) => a.earnedAt).length;

  return (
    <div
      style={{
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        padding: density.cardPaddingY,
        fontFamily: typeTokens.sans,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: shape.radius.chip,
              background: 'var(--warning-bg, #fef3c7)',
              color: 'var(--warning, #92400e)',
              border: '1px solid var(--warning-bg, #fde68a)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
            }}
            aria-hidden
          >
            ♛
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.1px', color: page.ink }}>
            Achievements
          </span>
          <span
            style={{
              padding: '1px 7px',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.4,
              color: page.inkSoft,
              background: page.surfaceAlt,
              border: `1px solid ${page.border}`,
              borderRadius: shape.radius.chip,
            }}
          >
            {earnedCount} / 9 EARNED
          </span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--emerald, #15803d)' }}>
          View all →
        </span>
      </div>
      <div
        className="profile-stripe-achievements-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          gap: 8,
        }}
      >
        {safeList.map((a) => (
          <AchievementCard key={a.key} achievement={a} />
        ))}
      </div>
    </div>
  );
}
