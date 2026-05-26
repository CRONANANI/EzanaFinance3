'use client';

import Link from 'next/link';
import { Caps } from './Caps';
import { NumberText } from './NumberText';
import { TierChip } from './TierChip';
import { getTier, TIER_LIST } from '@/lib/elo-tier-colors';
import {
  page,
  brand,
  shape,
  density,
  type as typeTokens,
  categoryAccents,
} from './profile-design-tokens';

function nextTier(tierKey) {
  const i = TIER_LIST.findIndex((t) => t.key === tierKey);
  return i >= 0 && i < TIER_LIST.length - 1 ? TIER_LIST[i + 1] : null;
}

export function EloRatingCard({ user }) {
  const t = getTier(user.tier);
  const next = nextTier(user.tier);
  const nextMin = next ? next.min : t.max + 1;
  const eloToNext = Math.max(0, nextMin - user.rating);
  const pct = Math.max(0, Math.min(1, (user.rating - t.min) / (nextMin - t.min)));

  const history = user.ratingHistory || [];

  const sparklinePath = (() => {
    if (history.length < 2) return '';
    const w = 360;
    const h = 60;
    const min = Math.min(...history);
    const max = Math.max(...history);
    const r = max - min || 1;
    const step = w / (history.length - 1);
    const points = history.map((v, i) => `${i * step},${h - ((v - min) / r) * h}`).join(' L ');
    return `M ${points}`;
  })();

  const earnedByCat = user.earnedByCategory || { LEARNING: 0, TRADING: 0, COMMUNITY: 0 };
  const totalEarned =
    (earnedByCat.LEARNING || 0) + (earnedByCat.TRADING || 0) + (earnedByCat.COMMUNITY || 0) || 1;
  const catOrder = [
    { label: 'Learning', key: 'LEARNING', color: categoryAccents.LEARNING },
    { label: 'Trading', key: 'TRADING', color: categoryAccents.TRADING },
    { label: 'Community', key: 'COMMUNITY', color: categoryAccents.COMMUNITY },
  ];

  return (
    <div
      style={{
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        padding: density.cardPaddingY,
        fontFamily: typeTokens.sans,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Caps>ELO Rating</Caps>
        <Link
          href="/leaderboard/elo"
          style={{ fontSize: 11, fontWeight: 600, color: brand.dark, textDecoration: 'none' }}
        >
          Leaderboard ↗
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 12 }}>
        <div>
          <NumberText size={36} weight={600}>
            {user.rating?.toLocaleString() ?? '—'}
          </NumberText>
          <div>
            <Caps>Current</Caps>
          </div>
        </div>
        <div>
          <NumberText size={20} weight={500} color={page.inkSoft}>
            {user.peak?.toLocaleString() ?? '—'}
          </NumberText>
          <div>
            <Caps>Peak</Caps>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', paddingBottom: 6 }}>
          <TierChip tier={user.tier} />
        </div>
      </div>

      {next && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              height: 6,
              background: page.surfaceAlt,
              border: `1px solid ${page.border}`,
              borderRadius: shape.radius.pill,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${t.base}, ${t.ring})`,
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
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
            <span style={{ color: page.inkMuted }}>
              <NumberText size={11} weight={500} color={page.inkMuted}>
                {t.min.toLocaleString()}
              </NumberText>
              –
              <NumberText size={11} weight={500} color={page.inkMuted}>
                {t.max.toLocaleString()}
              </NumberText>{' '}
              band
            </span>
          </div>
        </div>
      )}

      {history.length >= 2 && (
        <div style={{ marginBottom: 12 }}>
          <Caps>Recent History</Caps>
          <svg viewBox="0 0 360 90" style={{ width: '100%', display: 'block', marginTop: 6 }}>
            <defs>
              <linearGradient id={`eloHistFill-${t.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.base} stopOpacity="0.14" />
                <stop offset="100%" stopColor={t.base} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${sparklinePath} L 360 90 L 0 90 Z`} fill={`url(#eloHistFill-${t.key})`} />
            <path
              d={sparklinePath}
              stroke={t.base}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      <div>
        <Caps>Earned by Category</Caps>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {catOrder.map((c) => {
            const v = earnedByCat[c.key] || 0;
            const w = (v / totalEarned) * 100;
            return (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 88, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: v > 0 ? 600 : 500,
                      color: v > 0 ? page.inkSoft : page.inkMuted,
                    }}
                  >
                    {c.label}
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: page.surfaceAlt,
                    border: `1px solid ${page.border}`,
                    borderRadius: shape.radius.pill,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ width: `${w}%`, height: '100%', background: c.color }} />
                </div>
                <NumberText
                  size={11}
                  weight={v > 0 ? 600 : 500}
                  color={v > 0 ? brand.dark : page.inkMuted}
                >
                  +{v}
                </NumberText>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
