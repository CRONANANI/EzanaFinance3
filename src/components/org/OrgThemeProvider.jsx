'use client';

import { useMemo } from 'react';
import { useOrg } from '@/contexts/OrgContext';

/* Relative luminance (WCAG) of a #rrggbb color, 0 (black) … 1 (white). */
function luminance(hex) {
  const c = String(hex || '').replace('#', '');
  if (c.length < 6) return 0.5;
  const ch = (i) => {
    const x = parseInt(c.slice(i, i + 2), 16) / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
}

/**
 * Runtime per-university theming. Reads the member's org colors from
 * useOrg().orgTheme and exposes them as CSS custom properties so any org UI
 * surface can use them with Ezana emerald as the fallback:
 *   --org-primary      raw brand color (fills, borders, rails)
 *   --org-accent       secondary/accent brand color
 *   --org-on-primary   legible text ON a primary-colored fill (auto black/white)
 *   --org-ink          brand color that stays legible as TEXT on the dark org
 *                      canvas — falls back to the accent for very dark primaries
 *                      (e.g. UBC navy, Dalhousie black) so it never disappears
 * Data-driven: recoloring a school is a single org row, no code change. Non-org
 * users get no variables, so consumer UI keeps Ezana emerald.
 */
export function OrgThemeProvider({ children }) {
  const { isOrgUser, orgTheme } = useOrg();

  const vars = useMemo(() => {
    if (!orgTheme) return null;
    const { primary, secondary, accent } = orgTheme;
    const onPrimary = luminance(primary) > 0.5 ? '#0b0d10' : '#ffffff';
    // Brand text on the near-black org canvas: use the primary unless it's too
    // dark to read, then prefer the lighter of secondary/accent.
    const candidates = [primary, secondary, accent].filter(Boolean);
    const ink =
      luminance(primary) >= 0.16
        ? primary
        : candidates.sort((a, b) => luminance(b) - luminance(a))[0] || primary;
    return {
      '--org-primary': primary,
      '--org-secondary': secondary,
      '--org-accent': accent,
      '--org-on-primary': onPrimary,
      '--org-ink': ink,
    };
  }, [orgTheme]);

  if (!isOrgUser || !vars) {
    return children;
  }

  return (
    <div data-org-theme="" style={{ display: 'contents', ...vars }}>
      {children}
    </div>
  );
}
