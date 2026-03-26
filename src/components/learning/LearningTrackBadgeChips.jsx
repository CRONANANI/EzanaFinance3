'use client';

import { LEVEL_COLORS, parseLearningBadgeKey, sortBadgeKeysForDisplay, trackIconForId } from '@/lib/learning-badge-ui';

export function LearningTrackBadgeChips({ badgeKeys, className = '', style = {} }) {
  const sorted = sortBadgeKeysForDisplay(badgeKeys || []);
  if (sorted.length === 0) return null;

  return (
    <span className={className} style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', ...style }}>
      {sorted.map((key) => {
        const parsed = parseLearningBadgeKey(key);
        if (!parsed) return null;
        const lc = LEVEL_COLORS[parsed.levelKey];
        if (!lc) return null;
        const icon = trackIconForId(parsed.trackId);
        return (
          <span
            key={key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.7rem',
              fontWeight: '600',
              background: lc.bg,
              color: lc.color,
              border: `1px solid ${lc.color}33`,
            }}
          >
            {icon} {lc.label}
          </span>
        );
      })}
    </span>
  );
}
