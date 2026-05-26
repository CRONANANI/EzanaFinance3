'use client';

import { NumberText } from './NumberText';
import { type as typeTokens } from './elo-design-tokens';
import { useEloTheme } from './EloThemeContext';

export function StatsStrip({ stats }) {
  const { page, delta: deltaTokens, shape } = useEloTheme();

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
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        fontFamily: typeTokens.sans,
      }}
    >
      {cells.flatMap((c, i) => {
        const elements = [];
        if (i > 0) {
          elements.push(
            <div
              key={`div-${i}`}
              style={{
                width: 1,
                alignSelf: 'stretch',
                background: page.border,
                margin: '0 24px',
              }}
            />,
          );
        }
        elements.push(<StatCell key={c.label} cell={c} />);
        return elements;
      })}
    </div>
  );
}

function StatCell({ cell }) {
  const { page, delta: deltaTokens } = useEloTheme();

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: 0.8,
          color: page.inkMuted,
          marginBottom: 4,
          textTransform: 'uppercase',
        }}
      >
        {cell.label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <NumberText size={16} weight={600}>
          {cell.value}
        </NumberText>
        {cell.delta && (
          <span
            style={{
              fontFamily: 'inherit',
              fontSize: 10.5,
              fontWeight: 500,
              color: cell.deltaNeutral ? page.inkMuted : deltaTokens.pos,
            }}
          >
            {cell.delta}
          </span>
        )}
      </div>
    </div>
  );
}
