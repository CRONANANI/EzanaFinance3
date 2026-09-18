'use client';

const TIERS = [
  { name: 'Bronze', min: 0, max: 499 },
  { name: 'Silver', min: 500, max: 1499 },
  { name: 'Gold', min: 1500, max: 2519 },
  { name: 'Platinum', min: 2520, max: 99999 },
];

/**
 * Tier thresholds as a hairline-ruled list beside the chart. The tier the
 * viewer currently sits in is the green row.
 */
export function LcEloLadder({ rating }) {
  const current = TIERS.find((t) => rating >= t.min && rating <= t.max) || TIERS[0];

  return (
    <div>
      <div className="lc3-sub-head">
        <h3 className="lc3-sub-title">Tiers</h3>
        <span className="lc3-sec-meta">Thresholds</span>
      </div>
      {TIERS.map((t) => (
        <div
          key={t.name}
          className={`lc3-ladder-row${t.name === current.name ? ' is-current' : ''}`}
        >
          <span className="lc3-ladder-name">{t.name}</span>
          <span className="lc3-ladder-min">{t.min.toLocaleString()}+</span>
        </div>
      ))}
    </div>
  );
}
