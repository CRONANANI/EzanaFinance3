'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LeaderRow } from './LeaderRow';
import { ZoneDivider } from './ZoneDivider';
import { page, shape } from './elo-design-tokens';

const HEADERS = [
  { key: 'rank', label: '#', sortable: false, align: 'left' },
  { key: 'trader', label: 'TRADER', sortable: false, align: 'left' },
  { key: 'tier', label: 'TIER', sortable: false, align: 'left' },
  { key: 'rating', label: 'ELO', sortable: true, align: 'right' },
  { key: 'd7', label: 'Δ 7D', sortable: true, align: 'right' },
  { key: 'd30', label: 'Δ 30D', sortable: true, align: 'right' },
  { key: 'peak', label: 'PEAK', sortable: true, align: 'right' },
  { key: 'trend', label: 'TREND', sortable: false, align: 'right' },
  { key: 'active', label: 'ACTIVE', sortable: false, align: 'right' },
];

export function LeaderboardTable({
  rows,
  currentUserId,
  league,
  sort,
  sortDir,
  onSortChange,
  focusedIndex = -1,
  rowRefs,
}) {
  const promotionCount = league?.promotionCount ?? 3;
  const demotionCount = league?.demotionCount ?? 2;
  const total = rows.length;

  const partitioned = rows.map((row, idx) => {
    let zone = 'safe';
    if (idx < promotionCount) zone = 'promo';
    else if (idx >= total - demotionCount) zone = 'demo';
    return { row, zone, idx };
  });

  const youRow = rows.find((r) => r.id === currentUserId);

  const renderSection = (zoneKind) => {
    const items = partitioned.filter((p) => p.zone === zoneKind);
    return (
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map(({ row, zone, idx }) => (
          <motion.div
            key={row.id}
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <ZonedRow
              user={row}
              zone={zone}
              isYou={row.id === currentUserId}
              isFocused={idx === focusedIndex}
              setRowRef={(el) => {
                if (rowRefs?.current) rowRefs.current[idx] = el;
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    );
  };

  return (
    <div
      className="elo-table-card"
      style={{
        background: page.card,
        border: `2px solid ${page.cardLine}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadowCard,
        padding: '8px 12px 12px',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: LeaderRow.COLUMN_GRID,
          padding: '12px 14px 10px',
          borderBottom: `1px solid ${page.cardLine}`,
          marginBottom: 4,
        }}
      >
        {HEADERS.map((h) => {
          const isActive = sort === h.key;
          const Tag = h.sortable ? 'button' : 'div';
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
                fontWeight: 800,
                letterSpacing: 0.6,
                color: isActive ? page.ink : page.inkMuted,
                cursor: h.sortable ? 'pointer' : 'default',
                fontFamily: 'inherit',
              }}
            >
              {h.label}
              {isActive ? ' ▼' : ''}
            </Tag>
          );
        })}
      </div>

      <ZoneDivider kind="promo" count={promotionCount} />
      {renderSection('promo')}

      <ZoneDivider kind="safe" />
      {renderSection('safe')}

      <ZoneDivider kind="demo" count={demotionCount} />
      {renderSection('demo')}

      {youRow && (
        <div
          className="elo-sticky-you"
          style={{
            position: 'sticky',
            bottom: 0,
            background: page.brandSoft,
            margin: '12px -12px -12px',
            padding: '8px 12px',
            borderTop: `2px solid ${page.brand}`,
            borderBottomLeftRadius: shape.radius.card,
            borderBottomRightRadius: shape.radius.card,
          }}
        >
          <LeaderRow user={youRow} isYou zone="safe" tabIndex={0} />
        </div>
      )}
    </div>
  );
}

function ZonedRow({ user, zone, isYou, isFocused, setRowRef }) {
  if (zone === 'safe') {
    return (
      <LeaderRow
        ref={setRowRef}
        user={user}
        isYou={isYou}
        zone={zone}
        isFocused={isFocused}
        tabIndex={isFocused ? 0 : -1}
      />
    );
  }

  const bg = zone === 'promo' ? '#f0fdf4' : '#fef2f2';
  const ring = zone === 'promo' ? '#16a34a40' : '#dc262640';

  return (
    <div
      style={{
        background: bg,
        borderRadius: 10,
        boxShadow: `inset 0 0 0 1px ${ring}`,
        marginBottom: 4,
      }}
    >
      <LeaderRow
        ref={setRowRef}
        user={user}
        isYou={isYou}
        zone={zone}
        isFocused={isFocused}
        tabIndex={isFocused ? 0 : -1}
      />
    </div>
  );
}
