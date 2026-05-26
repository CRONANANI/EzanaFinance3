'use client';

import { getTier } from '@/lib/elo-tier-colors';

export function Avatar({ user, size = 32, ring = true }) {
  const t = getTier(user.tier);
  const fontSize = Math.round(size * 0.38);
  const ringWidth = size > 40 ? 4 : 3.5;

  return (
    <div
      className="elo-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(180deg, ${t.base} 0%, ${t.ink} 100%)`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize,
        letterSpacing: '-0.2px',
        flexShrink: 0,
        boxShadow: ring ? `0 0 0 2px #fff, 0 0 0 ${ringWidth}px ${t.ring}` : 'none',
        fontFamily: 'var(--font-display, Nunito, system-ui, sans-serif)',
      }}
    >
      {user.initials}
    </div>
  );
}
