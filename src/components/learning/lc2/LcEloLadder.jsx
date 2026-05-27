'use client';

import { NumberText } from './NumberText';

const TIERS = [
  { name: 'Bronze', min: 0, max: 499 },
  { name: 'Silver', min: 500, max: 1499 },
  { name: 'Gold', min: 1500, max: 2519 },
  { name: 'Platinum', min: 2520, max: 99999 },
];

export function LcEloLadder({ rating, max = 2520 }) {
  const currentTier = TIERS.find((t) => rating >= t.min && rating <= t.max) || TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1] || TIERS[TIERS.length - 1];
  const fillPct = Math.min(100, (rating / max) * 100);
  const hintEnd = Math.min(100, (nextTier.min / max) * 100);
  const hintWidth = Math.max(0, hintEnd - fillPct);

  return (
    <div className="lc-ladder">
      <div className="lc-ladder-bar">
        <div className="lc-ladder-fill" style={{ width: `${fillPct}%` }} />
        <div className="lc-ladder-hint" style={{ left: `${fillPct}%`, width: `${hintWidth}%` }} />
        <div className="lc-ladder-marker" style={{ left: `${fillPct}%` }}>
          <div className="lc-ladder-tooltip">
            <span style={{ marginRight: 4 }}>YOU ·</span>
            <NumberText size={11} weight={600} color="var(--lc-accent)">
              {rating}
            </NumberText>
          </div>
        </div>
      </div>
      <div className="lc-ladder-ticks">
        {TIERS.map((t) => {
          const isNext = t.name === nextTier.name && nextTier.name !== currentTier.name;
          return (
            <div key={t.name} className={`lc-ladder-tick ${isNext ? 'lc-ladder-tick--next' : ''}`}>
              <span className="lc-ladder-tick-num">{t.min.toLocaleString()}</span>
              <span className="lc-ladder-tick-name">{t.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
