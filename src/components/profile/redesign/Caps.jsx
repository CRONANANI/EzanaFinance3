'use client';

import { page, type as typeTokens } from './profile-design-tokens';

export function Caps({
  children,
  color,
  size = 10,
  letterSpacing = 0.6,
  className = '',
  style = {},
}) {
  return (
    <span
      className={className}
      style={{
        fontFamily: typeTokens.sans,
        fontSize: size,
        fontWeight: 600,
        letterSpacing,
        textTransform: 'uppercase',
        color: color || page.inkMuted,
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
