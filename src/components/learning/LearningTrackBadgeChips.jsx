'use client';

import { LEVEL_COLORS, parseLearningBadgeKey, sortBadgeKeysForDisplay } from '@/lib/learning-badge-ui';
import { learningTrackBiClass } from '@/lib/dashboard-bi-icons';

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
        const bi = learningTrackBiClass(parsed.trackId);
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
            <i className={`bi ${bi}`} style={{ fontSize: '0.75rem', opacity: 0.95 }} aria-hidden />
            {lc.label}
          </span>
        );
      })}
    </span>
  );
}
