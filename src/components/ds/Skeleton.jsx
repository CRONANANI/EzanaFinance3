'use client';

import { cx } from './tokens';

/** Shimmer placeholder. Sized via width/height; respects reduced-motion. */
export function Skeleton({ width = '100%', height = 16, radius, className, style, ...rest }) {
  return (
    <span
      aria-hidden="true"
      className={cx('ds-skeleton', className)}
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
      {...rest}
    />
  );
}
