'use client';

import { type as typeTokens } from './elo-design-tokens';
import { useEloTheme } from './EloThemeContext';

export function NumberText({
  children,
  size = 13,
  weight = 600,
  color,
  align,
  style = {},
  className = '',
}) {
  const { page } = useEloTheme();

  return (
    <span
      className={className}
      style={{
        fontFamily: typeTokens.mono,
        fontVariantNumeric: typeTokens.numericFeatures,
        fontSize: size,
        fontWeight: weight,
        color: color || page.ink,
        textAlign: align,
        display: align ? 'block' : 'inline',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
