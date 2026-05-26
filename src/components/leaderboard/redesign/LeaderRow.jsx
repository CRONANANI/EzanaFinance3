'use client';

import Link from 'next/link';
import { forwardRef } from 'react';
import { Avatar } from './Avatar';
import { TierChip } from './TierChip';
import { Sparkline } from './Sparkline';
import { getTier } from '@/lib/elo-tier-colors';
import { page, delta as deltaTokens } from './elo-design-tokens';

const COLUMN_GRID = '48px 1fr 130px 84px 64px 64px 70px 84px 76px';

function profileHref(user) {
  if (user.username) return `/profile/${encodeURIComponent(user.username)}`;
  return '#';
}

export const LeaderRow = forwardRef(function LeaderRow(
  { user, isYou, zone, isFocused, tabIndex = -1 },
  ref,
) {
  const t = getTier(user.tier);
  const baseBg = isYou ? page.brandSoft : isFocused ? '#fafaf9' : 'transparent';
  const baseBorder = isYou
    ? `2px solid ${page.brand}`
    : isFocused
      ? `2px solid ${page.brand}88`
      : '2px solid transparent';

  const href = profileHref(user);

  return (
    <Link
      ref={ref}
      href={href}
      tabIndex={tabIndex}
      aria-current={isYou ? 'true' : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMN_GRID,
        alignItems: 'center',
        gap: 0,
        padding: '8px 14px',
        background: baseBg,
        border: baseBorder,
        borderRadius: 10,
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 120ms ease',
        marginBottom: 4,
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (!isYou) e.currentTarget.style.background = '#fafaf9';
      }}
      onMouseLeave={(e) => {
        if (!isYou && !isFocused) e.currentTarget.style.background = 'transparent';
        else if (isFocused && !isYou) e.currentTarget.style.background = '#fafaf9';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: page.ink,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'var(--font-display, Nunito, system-ui, sans-serif)',
          }}
        >
          {user.rank}
        </span>
        {user.delta7d !== 0 && (
          <span
            style={{
              fontSize: 9,
              color: user.delta7d > 0 ? deltaTokens.posLight : deltaTokens.neg,
            }}
          >
            {user.delta7d > 0 ? '▲' : '▼'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar user={user} size={32} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: page.ink,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.name}
            </span>
            {isYou && (
              <span
                style={{
                  background: page.brand,
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 999,
                  letterSpacing: 0.5,
                  flexShrink: 0,
                }}
              >
                YOU
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: page.inkMuted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 1,
            }}
          >
            {user.title || 'Trader'}
          </div>
        </div>
      </div>

      <div>
        <TierChip tier={user.tier} size="sm" />
      </div>

      <div
        style={{
          textAlign: 'right',
          fontSize: 14,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: page.ink,
          fontFamily: 'var(--font-display, Nunito, system-ui, sans-serif)',
        }}
      >
        {user.rating.toLocaleString()}
      </div>

      <div
        style={{
          textAlign: 'right',
          fontSize: 12,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color:
            user.delta7d > 0 ? deltaTokens.pos : user.delta7d < 0 ? deltaTokens.neg : page.inkMuted,
        }}
      >
        {user.delta7d > 0 ? '+' : ''}
        {user.delta7d}
      </div>

      <div
        style={{
          textAlign: 'right',
          fontSize: 12,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color:
            user.delta30d > 0
              ? deltaTokens.pos
              : user.delta30d < 0
                ? deltaTokens.neg
                : page.inkMuted,
        }}
      >
        {user.delta30d > 0 ? '+' : ''}
        {user.delta30d}
      </div>

      <div
        style={{
          textAlign: 'right',
          fontSize: 12,
          fontWeight: 700,
          color: page.inkMuted,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {user.peak.toLocaleString()}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Sparkline data={user.sparkline} w={70} h={18} color={t.base} />
      </div>

      <div
        style={{
          textAlign: 'right',
          fontSize: 11,
          fontWeight: 600,
          color: page.inkMuted,
        }}
      >
        {user.active}
      </div>
    </Link>
  );
});

LeaderRow.COLUMN_GRID = COLUMN_GRID;
