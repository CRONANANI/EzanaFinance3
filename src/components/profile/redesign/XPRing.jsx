'use client';

import { useEffect, useState } from 'react';
import { Avatar } from './Avatar';
import { getTier } from '@/lib/elo-tier-colors';
import { page } from './profile-design-tokens';

export function XPRing({ user, size = 88, strokeWidth = 6 }) {
  const t = getTier(user.tier);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const pct = Math.max(0, Math.min(1, (user.rating - t.min) / (t.max - t.min + 1)));

  const [arc, setArc] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setArc(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const dashOffset = circumference * (1 - arc);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
      aria-label={`Tier progress: ${user.rating} of ${t.max + 1}, ${Math.round(pct * 100)}% to next tier`}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={page.border}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={t.base}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 560ms ease-out' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Avatar user={user} size={Math.round(size * 0.68)} />
      </div>
    </div>
  );
}
