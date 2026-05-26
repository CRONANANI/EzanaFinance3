'use client';

import { useEloTheme } from './EloThemeContext';

export function ZoneDivider({ kind, count }) {
  const { zones, page } = useEloTheme();
  const z = zones[kind];
  const labels = {
    promo: `Promotion · top ${count ?? 3} move up`,
    safe: 'Safe zone',
    demo: `Demotion · bottom ${count ?? 2} drop`,
  };

  return (
    <div
      className="elo-zone-divider"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 16px',
        background: z.bg,
        borderBottom: `1px solid ${page.border}`,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: z.dot,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          color: z.text,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {labels[kind]}
      </span>
    </div>
  );
}
