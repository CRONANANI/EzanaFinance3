'use client';

import { type as typeTokens, page } from './profile-design-tokens';

export function NumberText({
  children,
  size = 13,
  weight = 600,
  color,
  align,
  mono = false,
  className = '',
  style = {},
}) {
  return (
    <span
      className={className}
      style={{
        fontFamily: mono ? typeTokens.mono : typeTokens.sans,
        fontVariantNumeric: typeTokens.numericFeatures,
        fontSize: size,
        fontWeight: weight,
        color: color || page.ink,
        letterSpacing: '-0.1px',
        textAlign: align,
        display: align ? 'block' : 'inline',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
