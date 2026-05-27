'use client';

export function NumberText({
  children,
  size = 13,
  weight = 500,
  color,
  className = '',
  style = {},
}) {
  return (
    <span
      className={className}
      style={{
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: size,
        fontWeight: weight,
        color: color || 'var(--lc-ink)',
        letterSpacing: '-0.01em',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
