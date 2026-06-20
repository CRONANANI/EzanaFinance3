'use client';

import { cx } from './tokens';

const TONES = {
  brand: '',
  gold: 'ds-badge--gold',
  positive: 'ds-badge--positive',
  negative: 'ds-badge--negative',
  warning: 'ds-badge--warning',
  info: 'ds-badge--info',
  neutral: 'ds-badge--neutral',
};

/**
 * Pill / badge. tone: brand (emerald) | gold | positive | negative | warning |
 * info | neutral. positive/negative render in mono for inline figures.
 */
export function Badge({ tone = 'brand', icon, className, children, ...rest }) {
  return (
    <span className={cx('ds-badge', TONES[tone] || '', className)} {...rest}>
      {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
      {children}
    </span>
  );
}
