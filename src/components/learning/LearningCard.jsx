'use client';

import { createContext, useContext } from 'react';

/**
 * Surface-context card system for the Learning Center.
 *
 * Rather than hard-coded text colors, every card declares a `surface` once,
 * and every <CardPrimary>, <CardSecondary>, <CardMuted>, <CardBadge> inside
 * it resolves to a contrasting foreground automatically — in both light and
 * dark mode, because each surface maps to CSS variables set on the card
 * (see learning-center.css → `.lc-surface-*`).
 *
 * Available surfaces:
 *   default    — normal card on the page background
 *   tinted     — emerald-washed card (slightly accented)
 *   accent     — fully brand-colored card (white text)
 *   muted      — secondary-tier card (recommended sidebar)
 *   completed  — green wash for completed courses
 *   locked     — de-emphasized but still readable
 */
const SurfaceContext = createContext('default');

export const useSurface = () => useContext(SurfaceContext);

const VALID = new Set([
  'default',
  'tinted',
  'accent',
  'muted',
  'completed',
  'locked',
]);

export function LearningCard({
  surface = 'default',
  as: Tag = 'section',
  className = '',
  children,
  style,
  ...rest
}) {
  const safeSurface = VALID.has(surface) ? surface : 'default';
  const classes = `lc-surface lc-surface-${safeSurface} ${className}`.trim();
  return (
    <SurfaceContext.Provider value={safeSurface}>
      <Tag
        data-learning-card=""
        data-surface={safeSurface}
        className={classes}
        style={style}
        {...rest}
      >
        {children}
      </Tag>
    </SurfaceContext.Provider>
  );
}

/* ── Text helpers ──────────────────────────────────────────────────────── */

export function CardPrimary({
  as: Tag = 'span',
  className = '',
  children,
  ...p
}) {
  return (
    <Tag className={`lc-fg-primary ${className}`} {...p}>
      {children}
    </Tag>
  );
}

export function CardSecondary({
  as: Tag = 'span',
  className = '',
  children,
  ...p
}) {
  return (
    <Tag className={`lc-fg-secondary ${className}`} {...p}>
      {children}
    </Tag>
  );
}

export function CardMuted({
  as: Tag = 'span',
  className = '',
  children,
  ...p
}) {
  return (
    <Tag className={`lc-fg-muted ${className}`} {...p}>
      {children}
    </Tag>
  );
}

export function CardBadge({
  as: Tag = 'span',
  className = '',
  children,
  tone,
  ...p
}) {
  // `tone` optionally forces a specific tone (positive, warning, negative, info)
  // otherwise the surface context supplies badge bg/fg.
  const toneClass = tone ? `lc-badge-tone-${tone}` : '';
  return (
    <Tag className={`lc-badge ${toneClass} ${className}`.trim()} {...p}>
      {children}
    </Tag>
  );
}
