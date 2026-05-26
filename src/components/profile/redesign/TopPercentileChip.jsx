'use client';

import { brand, shape, type as typeTokens } from './profile-design-tokens';

export function TopPercentileChip({ pct }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px 3px 8px',
        borderRadius: shape.radius.chip,
        background: brand.soft,
        color: brand.dark,
        fontFamily: typeTokens.sans,
        fontSize: 11,
        fontWeight: 600,
        border: `1px solid ${brand.ring}`,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: brand.base,
        }}
      />
      Top {pct}%
    </span>
  );
}
