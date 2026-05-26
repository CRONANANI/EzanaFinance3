'use client';

import { zones } from './elo-design-tokens';

export function ZoneDivider({ kind, count }) {
  const z = zones[kind];
  const labels = {
    promo: `PROMOTION ZONE — TOP ${count ?? 3} MOVE UP`,
    safe: 'SAFE ZONE',
    demo: `DEMOTION ZONE — BOTTOM ${count ?? 2} DROP`,
  };

  return (
    <div
      className="elo-zone-divider"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 8px 6px',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: z.dot,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          color: z.text,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 0.6,
          whiteSpace: 'nowrap',
        }}
      >
        {labels[kind]}
      </span>
      <span
        style={{
          flex: 1,
          height: 2,
          background: z.line,
          borderRadius: 999,
        }}
      />
    </div>
  );
}
