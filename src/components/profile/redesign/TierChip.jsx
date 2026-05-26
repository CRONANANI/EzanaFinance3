'use client';

import { getTier } from '@/lib/elo-tier-colors';
import { page, type as typeTokens, shape } from './profile-design-tokens';

export function TierChip({ tier, size = 'md' }) {
  const t = getTier(tier);
  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isSmall ? '2px 8px 2px 6px' : '3px 10px 3px 8px',
        borderRadius: shape.radius.chip,
        background: page.surfaceAlt,
        color: t.ink,
        fontFamily: typeTokens.sans,
        fontSize: isSmall ? 10 : 11,
        fontWeight: 500,
        border: `1px solid ${page.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: isSmall ? 5 : 6,
          height: isSmall ? 5 : 6,
          borderRadius: '50%',
          background: t.base,
        }}
      />
      {t.label}
    </span>
  );
}
