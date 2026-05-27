'use client';

export function Pill({
  children,
  variant = 'neutral',
  mono = false,
  uppercase = false,
  className = '',
  style = {},
}) {
  const variantStyles = {
    'tier-bronze': { background: 'var(--lc-bronze-bg)', color: 'var(--lc-bronze)' },
    'tier-silver': { background: 'var(--lc-silver-bg)', color: 'var(--lc-silver)' },
    'tier-gold': { background: 'var(--lc-gold-bg)', color: 'var(--lc-gold)' },
    'tier-platinum': { background: 'var(--lc-plat-bg)', color: 'var(--lc-plat)' },
    accent: { background: 'var(--lc-accent-soft)', color: 'var(--lc-accent)' },
    indigo: { background: 'var(--lc-indigo-bg)', color: 'var(--lc-indigo)' },
    neutral: {
      background: 'var(--lc-panel-hover)',
      color: 'var(--lc-ink-3)',
      border: '1px solid var(--lc-line)',
    },
  };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 9px',
        borderRadius: 999,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontSize: mono ? 11 : 10,
        fontWeight: mono ? 500 : 600,
        letterSpacing: uppercase ? '0.10em' : 'normal',
        textTransform: uppercase ? 'uppercase' : 'none',
        fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
