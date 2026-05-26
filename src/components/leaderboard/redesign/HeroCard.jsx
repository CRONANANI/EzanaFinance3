'use client';

import { TierChip } from './TierChip';
import { XPRing } from './XPRing';
import { NumberText } from './NumberText';
import { getTier } from '@/lib/elo-tier-colors';
import {
  page,
  delta as deltaTokens,
  shape,
  type as typeTokens,
  density,
} from './elo-design-tokens';

export function HeroCard({ user, weeklyDelta, streakDays }) {
  const currentTier = getTier(user.tier);
  const nextTier = user.nextTier ? getTier(user.nextTier) : null;
  const pct = user.progressToNext ?? 0;
  const nextMin = nextTier ? nextTier.min : currentTier.max;

  return (
    <div
      className="elo-hero-card"
      style={{
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        padding: `${density.cardPaddingY}px ${density.cardPaddingX}px`,
        display: 'flex',
        alignItems: 'center',
        gap: density.cardPaddingX,
        flex: 1.6,
        minWidth: 0,
        fontFamily: typeTokens.sans,
      }}
    >
      <XPRing user={user} pct={pct} size={84} />

      <div style={{ width: 1, alignSelf: 'stretch', background: page.border }} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: page.inkMuted,
          }}
        >
          <TierChip tier={user.tier} size="sm" />
          {user.title && (
            <>
              <span>·</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.title}
              </span>
            </>
          )}
        </div>

        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.4px',
            color: page.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {user.name}
        </div>

        <div style={{ fontSize: 12, color: page.inkSoft }}>
          Rank{' '}
          <NumberText size={12} weight={600}>
            #{user.globalRank ?? user.rank}
          </NumberText>{' '}
          of{' '}
          <NumberText size={12} weight={600}>
            {user.totalTraders?.toLocaleString() ?? '—'}
          </NumberText>
        </div>

        {nextTier && (
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                color: page.inkMuted,
              }}
            >
              <span>Next · {nextTier.label}</span>
              <span>
                <NumberText size={10} weight={600} color={page.inkMuted}>
                  {user.rating.toLocaleString()}
                </NumberText>
                {' / '}
                <NumberText size={10} weight={600} color={page.inkMuted}>
                  {nextMin.toLocaleString()}
                </NumberText>
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: page.surfaceAlt,
                border: `1px solid ${page.border}`,
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round(pct * 100)}%`,
                  height: '100%',
                  background: currentTier.base,
                  transition: 'width 480ms ease',
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ width: 1, alignSelf: 'stretch', background: page.border }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, alignSelf: 'stretch' }}>
        <StatTile label="STREAK" number={streakDays} unit="days" numberColor={page.ink} />
        <div style={{ width: 1, alignSelf: 'stretch', background: page.border }} />
        <StatTile
          label="THIS WEEK"
          number={`${weeklyDelta >= 0 ? '+' : ''}${weeklyDelta}`}
          unit="ELO"
          numberColor={deltaTokens.pos}
        />
      </div>
    </div>
  );
}

function StatTile({ label, number, unit, numberColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 70 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: page.inkMuted,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <NumberText size={22} weight={600} color={numberColor}>
          {number}
        </NumberText>
        <span style={{ fontSize: 11, color: page.inkMuted, fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  );
}
