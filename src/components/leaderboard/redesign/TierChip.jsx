'use client';

import { getTier } from '@/lib/elo-tier-colors';

export function TierChip({ tier, size = 'md' }) {
  const t = getTier(tier);
  const isSmall = size === 'sm';

  return (
    <span
      className="elo-tier-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: isSmall ? '2px 8px 2px 6px' : '3px 10px 3px 8px',
        borderRadius: 999,
        background: t.soft,
        color: t.ink,
        fontSize: isSmall ? 10 : 11,
        fontWeight: 800,
        border: `1.5px solid ${t.ring}88`,
        letterSpacing: '0.2px',
        fontFamily: 'var(--font-display, Nunito, system-ui, sans-serif)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: isSmall ? 6 : 7,
          height: isSmall ? 6 : 7,
          borderRadius: '50%',
          background: t.base,
        }}
      />
      {t.label.toUpperCase()}
    </span>
  );
}
