'use client';

import { getTier } from '@/lib/elo-tier-colors';
import { page, type as typeTokens } from './elo-design-tokens';

export function TierChip({ tier, size = 'md' }) {
  const t = getTier(tier);
  const isSmall = size === 'sm';

  return (
    <span
      className="elo-tier-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isSmall ? '2px 7px 2px 6px' : '3px 9px 3px 7px',
        borderRadius: 5,
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
