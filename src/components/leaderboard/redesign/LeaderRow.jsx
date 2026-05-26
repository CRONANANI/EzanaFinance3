'use client';

import Link from 'next/link';
import { Avatar } from './Avatar';
import { TierChip } from './TierChip';
import { Sparkline } from './Sparkline';
import { NumberText } from './NumberText';
import { getTier } from '@/lib/elo-tier-colors';
import {
  page,
  brand,
  delta as deltaTokens,
  type as typeTokens,
  density,
} from './elo-design-tokens';

const COLUMN_GRID = '40px 1fr 130px 80px 60px 60px 64px 72px 72px';

export function LeaderRow({ user, isYou, zone }) {
  const t = getTier(user.tier);

  const rankColor = isYou
    ? brand.dark
    : zone === 'promo'
      ? deltaTokens.pos
      : zone === 'demo'
        ? deltaTokens.neg
        : page.inkSoft;

  const rowStyle = {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: COLUMN_GRID,
    alignItems: 'center',
    padding: `${density.rowPaddingY}px ${density.rowPaddingX}px`,
    background: isYou ? brand.soft : page.surface,
    borderBottom: `1px solid ${page.border}`,
    textDecoration: 'none',
    color: 'inherit',
    fontFamily: typeTokens.sans,
    transition: 'background 120ms ease',
    cursor: 'pointer',
  };

  return (
    <Link
      href={user.username ? `/profile/${encodeURIComponent(user.username)}` : '#'}
      style={rowStyle}
      onMouseEnter={(e) => {
        if (!isYou) e.currentTarget.style.background = page.surfaceAlt;
      }}
      onMouseLeave={(e) => {
        if (!isYou) e.currentTarget.style.background = page.surface;
      }}
    >
      {isYou && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: brand.base,
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <NumberText size={12} weight={500} color={rankColor}>
          {user.rank}
        </NumberText>
        {user.delta7d !== 0 && (
          <span
            style={{
              fontSize: 9,
              color: user.delta7d > 0 ? deltaTokens.posDot : deltaTokens.negDot,
              lineHeight: 1,
            }}
          >
            {user.delta7d > 0 ? '▲' : '▼'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar user={user} size={26} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
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
                  background: '#fff',
                  color: brand.dark,
                  border: `1px solid ${brand.ring}`,
                  fontFamily: typeTokens.mono,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  padding: '1px 5px',
                  borderRadius: 3,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                YOU
              </span>
            )}
          </div>
          {user.title && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: page.inkMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 1,
              }}
            >
              {user.title}
            </div>
          )}
        </div>
      </div>

      <div>
        <TierChip tier={user.tier} size="sm" />
      </div>

      <div style={{ textAlign: 'right' }}>
        <NumberText size={13} weight={600}>
          {user.rating.toLocaleString()}
        </NumberText>
      </div>

      <div style={{ textAlign: 'right' }}>
        <NumberText
          size={12}
          weight={500}
          color={
            user.delta7d > 0 ? deltaTokens.pos : user.delta7d < 0 ? deltaTokens.neg : page.inkMuted
          }
        >
          {user.delta7d > 0 ? '+' : ''}
          {user.delta7d}
        </NumberText>
      </div>

      <div style={{ textAlign: 'right' }}>
        <NumberText
          size={12}
          weight={500}
          color={
            user.delta30d > 0
              ? deltaTokens.pos
              : user.delta30d < 0
                ? deltaTokens.neg
                : page.inkMuted
          }
        >
          {user.delta30d > 0 ? '+' : ''}
          {user.delta30d}
        </NumberText>
      </div>

      <div style={{ textAlign: 'right' }}>
        <NumberText size={12} weight={500} color={page.inkSoft}>
          {user.peak.toLocaleString()}
        </NumberText>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Sparkline data={user.sparkline} w={62} h={14} color={t.base} />
      </div>

      <div
        style={{
          textAlign: 'right',
          fontSize: 11,
          fontWeight: 500,
          color: page.inkMuted,
        }}
      >
        {user.active}
      </div>
    </Link>
  );
}

LeaderRow.COLUMN_GRID = COLUMN_GRID;
