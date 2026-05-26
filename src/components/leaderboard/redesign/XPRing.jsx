'use client';

import { Avatar } from './Avatar';
import { getTier } from '@/lib/elo-tier-colors';
import { page } from './elo-design-tokens';

export function XPRing({ user, pct, size = 84 }) {
  const t = getTier(user.tier);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, pct)));
  const center = size / 2;

  return (
    <div
      className="elo-xp-ring"
      style={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={page.border}
          strokeWidth={6}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={t.base}
          strokeWidth={6}
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
          transform: 'translate(-50%, -50%)',
        }}
      >
        <Avatar user={user} size={Math.round(size * 0.66)} />
      </div>
    </div>
  );
}
