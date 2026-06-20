'use client';

import { useEffect, useState } from 'react';
import { XPRing } from './XPRing';
import { TierChip } from './TierChip';
import { TopPercentileChip } from './TopPercentileChip';
import { NumberText } from './NumberText';
import { Caps } from './Caps';
import { getTier } from '@/lib/elo-tier-colors';
import { TIER_LIST } from '@/lib/elo-tier-colors';
import { CreatorBadge } from '@/components/community/redesign_v2/CreatorBadge';
import { page, brand, shape, type as typeTokens, density } from './profile-design-tokens';

function nextTier(tierKey) {
  const i = TIER_LIST.findIndex((t) => t.key === tierKey);
  return i >= 0 && i < TIER_LIST.length - 1 ? TIER_LIST[i + 1] : null;
}

export function IdentityHero({ user }) {
  const t = getTier(user.tier);
  const next = nextTier(user.tier);
  const nextMin = next ? next.min : t.max + 1;
  const eloToNext = Math.max(0, nextMin - user.rating);
  const pct = Math.max(0, Math.min(1, (user.rating - t.min) / (nextMin - t.min)));

  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimPct(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const joinedDate = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  return (
    <div
      className="profile-stripe-hero"
      style={{
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.hero,
        padding: density.cardPaddingY,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        fontFamily: typeTokens.sans,
      }}
    >
      <XPRing user={user} size={88} strokeWidth={6} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <TierChip tier={user.tier} />
          {user.rankPercentile != null && <TopPercentileChip pct={user.rankPercentile} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.4px',
              color: page.ink,
            }}
          >
            {user.name}
          </h1>
          {user.isPartner && (
            <CreatorBadge tierKey={user.creatorTier} type={user.partnerType} size={16} />
          )}
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: page.inkSoft }}>
          <NumberText size={12} weight={500}>
            {user.followerCount}
          </NumberText>{' '}
          {user.followerCount === 1 ? 'follower' : 'followers'}
          {user.rank > 0 && (
            <>
              {' · Rank '}
              <NumberText size={12} weight={600}>
                #{user.rank.toLocaleString()}
              </NumberText>
              {' of '}
              <NumberText size={12} weight={500}>
                {(user.totalTraders ?? 0).toLocaleString()}
              </NumberText>
            </>
          )}
          {joinedDate && ` · Joined ${joinedDate}`}
        </p>
      </div>

      {next && (
        <div
          className="profile-stripe-hero-progress"
          style={{
            minWidth: 280,
            borderLeft: `1px solid ${page.border}`,
            paddingLeft: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Caps>Next · {next.label}</Caps>
            <span
              style={{ color: page.inkMuted, fontSize: 10, fontWeight: 600, letterSpacing: 0.6 }}
            >
              <NumberText size={10} weight={600} color={page.inkMuted}>
                {(user.rating - t.min).toLocaleString()}
              </NumberText>
              {' / '}
              <NumberText size={10} weight={600} color={page.inkMuted}>
                {(nextMin - t.min).toLocaleString()}
              </NumberText>
            </span>
          </div>
          <div
            style={{
              height: 8,
              background: page.surfaceAlt,
              border: `1px solid ${page.border}`,
              borderRadius: shape.radius.pill,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${animPct * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${t.base}, ${t.ring})`,
                transition: 'width 480ms ease-out',
                borderRadius: shape.radius.pill,
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
              fontSize: 11,
              color: page.inkSoft,
            }}
          >
            <span>
              <NumberText size={11} weight={600}>
                {eloToNext.toLocaleString()}
              </NumberText>{' '}
              ELO to {next.label}
            </span>
            {user.weeklyDelta != null && user.weeklyDelta !== 0 && (
              <span
                style={{
                  background: brand.soft,
                  color: brand.dark,
                  border: `1px solid ${brand.ring}`,
                  borderRadius: shape.radius.pill,
                  padding: '2px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 9 }}>{user.weeklyDelta > 0 ? '▲' : '▼'}</span>
                <NumberText size={10} weight={600} color={brand.dark}>
                  {user.weeklyDelta > 0 ? '+' : ''}
                  {user.weeklyDelta}
                </NumberText>
                <span style={{ color: page.inkMuted, fontWeight: 500 }}>this week</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
