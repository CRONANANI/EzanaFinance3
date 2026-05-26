'use client';

import { getTier } from '@/lib/elo-tier-colors';
import { type as typeTokens } from './profile-design-tokens';

export function Avatar({ user, size = 40 }) {
  const t = getTier(user.tier);
  const fontSize = Math.round(size * 0.36);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: user.avatarUrl ? `url(${user.avatarUrl}) center/cover` : t.soft,
        color: t.ink,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: typeTokens.sans,
        fontWeight: 600,
        fontSize,
        letterSpacing: '-0.2px',
        flexShrink: 0,
        boxShadow: `inset 0 0 0 1.5px ${t.ring}`,
      }}
    >
      {!user.avatarUrl && user.initials}
    </div>
  );
}
