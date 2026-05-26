'use client';

import { Avatar } from './Avatar';
import { getTier } from '@/lib/elo-tier-colors';

export function XPRing({ user, pct, size = 110 }) {
  const t = getTier(user.tier);
  const radius = (size - 9) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, pct)));
  const center = size / 2;

  return (
    <div
      className="elo-xp-ring"
      style={{
        width: size,
        height: size + 18,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#f5f0e6" strokeWidth={9} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={t.base}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 480ms ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, calc(-50% - 9px))',
        }}
      >
        <Avatar user={user} size={size * 0.62} ring={false} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          background: t.base,
          color: '#fff',
          fontSize: 11,
          fontWeight: 800,
          padding: '3px 10px',
          borderRadius: 999,
          letterSpacing: 0.2,
          fontFamily: 'var(--font-display, Nunito, system-ui, sans-serif)',
          boxShadow: '0 2px 0 rgba(0,0,0,0.08)',
        }}
      >
        {Math.round(pct * 100)}%
      </div>
    </div>
  );
}
