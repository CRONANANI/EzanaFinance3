'use client';

/* Achievements collection (Nov 2026). No outline on the card; tiles flow in
   a responsive grid (at least 118px each) so names and categories fit
   instead of being squeezed into nine fixed columns. */

import { AchievementCard } from './AchievementCard';
import { page, shape, density, type as typeTokens } from './profile-design-tokens';

const SLOTS = 9;

export function Achievements({ achievements = [] }) {
  const list = achievements.slice(0, SLOTS);
  const earnedCount = list.filter((a) => a.earned ?? a.earnedAt).length;
  const tiles = [
    ...list,
    ...Array.from({ length: SLOTS - list.length }, (_, i) => ({
      key: `placeholder-${i}`,
      placeholder: true,
      category: 'TRADING',
      icon: 'bi-lock',
      earned: false,
      progress: 0,
    })),
  ];

  return (
    <div
      style={{
        background: page.surface,
        borderRadius: shape.radius.card,
        padding: density.cardPaddingY,
        fontFamily: typeTokens.sans,
      }}
    >
      <div className="pach-head">
        <div className="pach-head-id">
          <span className="pach-head-icon" aria-hidden="true">
            <i className="bi bi-trophy" />
          </span>
          <h2 className="pach-head-title">Achievements</h2>
          <span className="pach-head-count">
            {earnedCount} / {SLOTS} earned
          </span>
        </div>
      </div>
      <div className="pach-grid">
        {tiles.map((a) => (
          <AchievementCard key={a.key} achievement={a} />
        ))}
      </div>
    </div>
  );
}
