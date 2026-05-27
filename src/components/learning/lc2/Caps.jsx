'use client';

export function Caps({
  children,
  size = 10,
  letterSpacing = 0.12,
  color,
  className = '',
  style = {},
}) {
  return (
    <span
      className={className}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: size,
        fontWeight: 600,
        letterSpacing: `${letterSpacing}em`,
        textTransform: 'uppercase',
        color: color || 'var(--lc-ink-3)',
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
