'use client';

import { page, shape, delta as deltaTokens } from './elo-design-tokens';

export function StatsStrip({ stats }) {
  if (!stats) return null;

  const formatTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toISOString().substr(11, 8);
    } catch {
      return '—';
    }
  };

  const cells = [
    {
      label: 'TOTAL TRADERS',
      value: stats.totalTraders?.toLocaleString() ?? '—',
      delta: stats.totalTradersDelta > 0 ? `+${stats.totalTradersDelta}` : null,
    },
    {
      label: 'AVG ELO',
      value: stats.avgElo?.toLocaleString() ?? '—',
      delta: stats.avgEloDelta > 0 ? `+${stats.avgEloDelta}` : null,
    },
    {
      label: 'MEDIAN',
      value: stats.medianElo?.toLocaleString() ?? '—',
      delta: stats.medianEloDelta > 0 ? `+${stats.medianEloDelta}` : null,
    },
    {
      label: 'TOP 1%',
      value: stats.top1PctThreshold?.toLocaleString() ?? '—',
      delta: null,
    },
    {
      label: 'LAST UPDATE',
      value: formatTime(stats.lastUpdate),
      delta: 'UTC',
      deltaNeutral: true,
    },
  ];

  return (
    <div
      className="elo-stats-strip"
      style={{
        background: page.card,
        border: `2px solid ${page.cardLine}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadowSubtle,
        padding: '12px 24px',
        display: 'flex',
        gap: 28,
        alignItems: 'center',
        marginBottom: 14,
        flexWrap: 'wrap',
      }}
    >
      {cells.map((c) => (
        <div key={c.label} style={{ minWidth: 90 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 0.8,
              color: page.inkMuted,
              marginBottom: 4,
            }}
          >
            {c.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontSize: 17,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: page.ink,
                fontFamily: 'var(--font-display, Nunito, system-ui, sans-serif)',
              }}
            >
              {c.value}
            </span>
            {c.delta && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: c.deltaNeutral ? page.inkMuted : deltaTokens.pos,
                }}
              >
                {c.delta}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
