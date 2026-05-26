'use client';

import { useRouter } from 'next/navigation';
import { getTier } from '@/lib/elo-tier-colors';
import { page, shape } from './elo-design-tokens';

export function LeagueHeader({ league, onEarnXp }) {
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
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
        marginBottom: 18,
      }}
    >
      <div style={{ flex: 1, minWidth: 280 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display, Nunito, system-ui, sans-serif)',
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: '-0.8px',
            color: page.ink,
            lineHeight: 1.1,
          }}
        >
          Climb the ranks.
        </h1>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 13,
            fontWeight: 600,
            color: page.inkSoft,
          }}
        >
          Top <strong style={{ color: page.ink, fontWeight: 800 }}>{league.promotionCount}</strong>{' '}
          promote to{' '}
          <strong style={{ color: promoTier.ink, fontWeight: 700 }}>{league.promoteTo}</strong> ·
          Bottom{' '}
          <strong style={{ color: page.ink, fontWeight: 800 }}>{league.demotionCount}</strong> fall
          to <strong style={{ color: demoTier.ink, fontWeight: 700 }}>{league.demoteTo}</strong> ·
          Ends in <strong style={{ color: page.ink, fontWeight: 800 }}>{league.endsIn}</strong>
        </p>
      </div>

      <button
        type="button"
        onClick={handleClick}
        style={{
          background: page.brand,
          color: '#fff',
          border: 'none',
          padding: '12px 22px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.4,
          cursor: 'pointer',
          boxShadow: shape.shadowCTA,
          transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          fontFamily: 'var(--font-display, Nunito, system-ui, sans-serif)',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(2px)';
          e.currentTarget.style.boxShadow = `0 2px 0 ${page.brandDark}`;
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = shape.shadowCTA;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = shape.shadowCTA;
        }}
      >
        EARN XP
      </button>
    </header>
  );
}
