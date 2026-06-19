'use client';

import { getInitials } from '@/lib/community-utils';

export function Avatar({ author, size = 36, ring = false, ringColor }) {
  const displayName = author?.display_name || 'Member';
  const initials =
    author?.initials || getInitials(displayName, author?.username || author?.avatar_url);
  const [a, b] = author?.gradient || ['#10b981', '#047857'];
  const ringTone = ringColor || 'var(--emerald)';
  const ringShadow = ring ? `0 0 0 2px var(--bg-primary), 0 0 0 3.5px ${ringTone}` : 'none';

  if (author?.avatar_url) {
    return (
      <img
        src={author.avatar_url}
        alt=""
        className="ez-avatar"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          boxShadow: ringShadow,
        }}
      />
    );
  }

  return (
    <div
      className="ez-avatar"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${a} 0%, ${b} 100%)`,
        fontSize: Math.max(10, size * 0.36),
        boxShadow: ringShadow,
      }}
    >
      {initials}
    </div>
  );
}

export function VerifiedTick({ size = 14, gold = false }) {
  return (
    <span
      title="Verified"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        background: gold ? 'var(--gold)' : 'var(--emerald)',
        borderRadius: 999,
        color: 'white',
        flexShrink: 0,
      }}
    >
      <i className="bi bi-check" style={{ fontSize: size * 0.9, lineHeight: 1 }} />
    </span>
  );
}

export function EzanaLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M4 22 L14 8 L18 14 L22 10 L28 22 L20 22 L17 18 L13 22 Z" fill="var(--emerald)" />
      <path
        d="M14 8 L18 14 L17 18 L13 22"
        stroke="var(--emerald-dark)"
        strokeWidth="0.5"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
