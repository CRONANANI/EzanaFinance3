'use client';

export function Pill({ children, tone = 'default', className = '' }) {
  const tones = {
    default: { bg: 'var(--surface-2)', border: 'var(--border)', color: 'var(--fg-muted)' },
    emerald: {
      bg: 'var(--emerald-soft)',
      border: 'var(--emerald-border)',
      color: 'var(--emerald)',
    },
    amber: { bg: 'var(--amber-soft)', border: 'rgba(245,158,11,0.35)', color: 'var(--amber)' },
    you: { bg: 'var(--emerald)', border: 'var(--emerald)', color: '#001512' },
  };
  const t = tones[tone] || tones.default;
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.color,
      }}
    >
      {children}
    </span>
  );
}

export function TierChip({ tier = 'Bronze' }) {
  const colors = {
    Bronze: 'var(--tier-bronze)',
    Silver: 'var(--tier-silver)',
    Gold: 'var(--tier-gold)',
    Platinum: 'var(--tier-platinum)',
    Diamond: 'var(--tier-diamond)',
  };
  const c = colors[tier] || colors.Bronze;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: 'var(--surface-2)',
        border: `1px solid ${c}`,
        color: 'var(--fg)',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
      {tier}
    </span>
  );
}

export function ProgressBar({ value = 0, max = 100, tone = 'emerald' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const fill = tone === 'amber' ? 'var(--amber)' : 'var(--emerald)';
  return (
    <div
      style={{
        height: 6,
        borderRadius: 999,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: fill,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

const TRACK_ICONS = {
  stocks: '📈',
  crypto: '₿',
  betting: '🎯',
  commodities: '🛢️',
  risk: '🧠',
};

export function TrackIcon({ trackId, size = 18 }) {
  return (
    <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
      {TRACK_ICONS[trackId] || '📚'}
    </span>
  );
}

export function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M4 22 L14 8 L18 14 L22 10 L28 22 L20 22 L17 18 L13 22 Z" fill="var(--emerald)" />
    </svg>
  );
}
