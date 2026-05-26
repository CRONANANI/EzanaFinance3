'use client';

import { LeaderRow, LEADER_ROW_COLUMN_GRID } from './LeaderRow';
import { ZoneDivider } from './ZoneDivider';
import { NumberText } from './NumberText';
import { useEloTheme } from './EloThemeContext';

const HEADERS = [
  { key: 'rank', label: '#', sortable: false, align: 'left' },
  { key: 'trader', label: 'Trader', sortable: false, align: 'left' },
  { key: 'tier', label: 'Tier', sortable: false, align: 'left' },
  { key: 'rating', label: 'ELO', sortable: true, align: 'right' },
  { key: 'd7', label: 'Δ 7D', sortable: true, align: 'right' },
  { key: 'd30', label: 'Δ 30D', sortable: true, align: 'right' },
  { key: 'peak', label: 'Peak', sortable: true, align: 'right' },
  { key: 'trend', label: 'Trend', sortable: false, align: 'right' },
  { key: 'active', label: 'Active', sortable: false, align: 'right' },
];

export function LeaderboardTable({
  rows,
  currentUserId,
  league,
  me,
  sort,
  sortDir,
  onSortChange,
  activeTierLabel,
  range,
  total,
}) {
  const { page, shape } = useEloTheme();
  const promotionCount = league?.promotionCount ?? 3;
  const demotionCount = league?.demotionCount ?? 2;
  const visibleTotal = rows.length;

  const partitioned = rows.map((row, idx) => {
    let zone = 'safe';
    if (idx < promotionCount) zone = 'promo';
    else if (idx >= visibleTotal - demotionCount) zone = 'demo';
    return { row, zone };
  });

  const youInView = rows.some((r) => r.id === currentUserId);
  const youRow = me && !youInView ? me : null;

  return (
    <div
      className="elo-table-card"
      style={{
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: LEADER_ROW_COLUMN_GRID,
          padding: '10px 16px',
          background: page.surfaceAlt,
          borderBottom: `1px solid ${page.border}`,
        }}
      >
        {HEADERS.map((h) => {
          const isActive = sort === h.key;
          const Tag = h.sortable ? 'button' : 'div';
          const arrow = isActive ? (sortDir === 'asc' ? '↑' : '↓') : '';
          return (
            <Tag
              key={h.key}
              {...(h.sortable
                ? {
                    type: 'button',
                    onClick: () => onSortChange(h.key),
                    'aria-sort': isActive
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none',
                  }
                : {})}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                textAlign: h.align,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: isActive ? page.ink : page.inkMuted,
                cursor: h.sortable ? 'pointer' : 'default',
                fontFamily: 'inherit',
                display: 'flex',
                justifyContent: h.align === 'right' ? 'flex-end' : 'flex-start',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {h.label}
              {arrow && <span style={{ fontSize: 10 }}>{arrow}</span>}
            </Tag>
          );
        })}
      </div>

      {promotionCount > 0 && partitioned.some((p) => p.zone === 'promo') && (
        <>
          <ZoneDivider kind="promo" count={promotionCount} />
          {partitioned
            .filter((p) => p.zone === 'promo')
            .map(({ row, zone }) => (
              <LeaderRow key={row.id} user={row} zone={zone} isYou={row.id === currentUserId} />
            ))}
        </>
      )}

      {partitioned.some((p) => p.zone === 'safe') && (
        <>
          <ZoneDivider kind="safe" />
          {partitioned
            .filter((p) => p.zone === 'safe')
            .map(({ row, zone }) => (
              <LeaderRow key={row.id} user={row} zone={zone} isYou={row.id === currentUserId} />
            ))}
        </>
      )}

      {demotionCount > 0 && partitioned.some((p) => p.zone === 'demo') && (
        <>
          <ZoneDivider kind="demo" count={demotionCount} />
          {partitioned
            .filter((p) => p.zone === 'demo')
            .map(({ row, zone }) => (
              <LeaderRow key={row.id} user={row} zone={zone} isYou={row.id === currentUserId} />
            ))}
        </>
      )}

      {youRow && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: page.surface,
            borderTop: `1px solid ${page.border}`,
          }}
        >
          <LeaderRow user={youRow} zone="safe" isYou={true} />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          background: page.surfaceAlt,
          borderTop: `1px solid ${page.border}`,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: page.inkMuted,
        }}
      >
        <div>
          Showing{' '}
          <NumberText size={10} weight={600} color={page.ink}>
            {visibleTotal}
          </NumberText>{' '}
          of{' '}
          <NumberText size={10} weight={600} color={page.ink}>
            {(total ?? visibleTotal).toLocaleString()}
          </NumberText>
        </div>
        <div>
          {activeTierLabel || 'All tiers'} · {range || '1W'}
        </div>
      </div>
    </div>
  );
}
