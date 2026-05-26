'use client';

import { useRouter } from 'next/navigation';
import { getTier } from '@/lib/elo-tier-colors';
import { NumberText } from './NumberText';
import { type as typeTokens } from './elo-design-tokens';
import { useEloTheme } from './EloThemeContext';

export function LeagueHeader({ league, onEarnXp }) {
  const { page, brand } = useEloTheme();
  const router = useRouter();
  const handleClick = onEarnXp || (() => router.push('/learning-center'));

  const promoTierKey = (league.promoteTo || '').toLowerCase();
  const demoTierKey = (league.demoteTo || '').toLowerCase();
  const promoTier = getTier(promoTierKey);
  const demoTier = getTier(demoTierKey);

  return (
    <header
      className="elo-league-header"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
        marginBottom: 6,
      }}
    >
      <div style={{ flex: 1, minWidth: 280 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontFamily: typeTokens.sans,
            marginBottom: 6,
          }}
        >
          <span style={{ color: page.inkMuted }}>Community</span>
          <span style={{ color: page.borderStrong }}>/</span>
          <span style={{ color: page.ink, fontWeight: 600 }}>Leaderboard</span>
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: typeTokens.sans,
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: '-0.6px',
            color: page.ink,
            lineHeight: 1.1,
          }}
        >
          ELO Leaderboard
        </h1>

        <p
          style={{
            margin: '6px 0 0',
            fontSize: 13,
            color: page.inkSoft,
            fontWeight: 400,
          }}
        >
          Top{' '}
          <NumberText size={13} weight={600}>
            {league.promotionCount}
          </NumberText>{' '}
          promote to{' '}
          <span style={{ color: promoTier.ink, fontWeight: 600 }}>{league.promoteTo}</span> · Bottom{' '}
          <NumberText size={13} weight={600}>
            {league.demotionCount}
          </NumberText>{' '}
          drop to <span style={{ color: demoTier.ink, fontWeight: 600 }}>{league.demoteTo}</span> ·
          Resets in{' '}
          <NumberText size={13} weight={600}>
            {league.endsIn}
          </NumberText>
        </p>
      </div>

      <button
        type="button"
        onClick={handleClick}
        style={{
          background: brand.base,
          color: '#fff',
          border: 'none',
          padding: '8px 16px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: typeTokens.sans,
          transition: 'background 120ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = brand.dark;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = brand.base;
        }}
      >
        Earn XP
      </button>
    </header>
  );
}
