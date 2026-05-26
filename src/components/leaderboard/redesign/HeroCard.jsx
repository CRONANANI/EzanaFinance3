'use client';

import { TierChip } from './TierChip';
import { XPRing } from './XPRing';
import { getTier } from '@/lib/elo-tier-colors';
import { page, shape, statTiles } from './elo-design-tokens';

export function HeroCard({ user, weeklyDelta, streakDays }) {
  const currentTier = getTier(user.tier);
  const nextTier = user.nextTier ? getTier(user.nextTier) : null;
  const pct = user.progressToNext ?? 0;
  const nextMin = nextTier ? nextTier.min : currentTier.max;

  return (
    <div
      className="elo-hero-card"
      style={{
        background: page.card,
        border: `2px solid ${page.cardLine}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadowCard,
        padding: 24,
        display: 'flex',
        gap: 18,
        alignItems: 'center',
        flex: 1.6,
        minWidth: 0,
      }}
    >
      <XPRing user={user} pct={pct} size={110} />

      <div style={{ flex: 1.4, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <TierChip tier={user.tier} size="sm" />

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.4px',
              color: page.ink,
              fontFamily: 'var(--font-display, Nunito, system-ui, sans-serif)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {user.name}
          </h2>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 12,
              fontWeight: 600,
              color: page.inkSoft,
            }}
          >
            {user.title || 'Trader'} · Rank{' '}
            <strong style={{ color: page.ink, fontWeight: 800 }}>
              #{user.globalRank ?? user.rank}
            </strong>{' '}
            of{' '}
            <strong style={{ color: page.ink, fontWeight: 800 }}>
              {user.totalTraders?.toLocaleString() ?? '—'}
            </strong>
          </p>
        </div>

        {nextTier && (
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 0.6,
                color: page.inkMuted,
              }}
            >
              <span>NEXT: {nextTier.label.toUpperCase()}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: page.ink }}>
                {user.rating.toLocaleString()} / {nextMin.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                height: 12,
                background: '#f5f0e6',
                borderRadius: 999,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${Math.round(pct * 100)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${currentTier.base}, ${nextTier.base})`,
                  boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.08)',
                  transition: 'width 480ms ease',
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 96 }}>
        <StatTile number={streakDays} label="DAY STREAK" colors={statTiles.streak} />
        <StatTile
          number={`${weeklyDelta >= 0 ? '+' : ''}${weeklyDelta}`}
          label="THIS WEEK"
          colors={statTiles.weekly}
        />
      </div>
    </div>
  );
}

function StatTile({ number, label, colors }) {
  return (
    <div
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: 12,
        padding: '10px 12px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: colors.text,
          fontFamily: 'var(--font-display, Nunito, system-ui, sans-serif)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {number}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 0.8,
          color: colors.text,
          opacity: 0.85,
        }}
      >
        {label}
      </div>
    </div>
  );
}
