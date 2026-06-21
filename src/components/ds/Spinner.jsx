'use client';

import { cx } from './tokens';

const SIZES = { sm: 'ds-spinner--sm', md: '', lg: 'ds-spinner--lg' };

/** Accessible loading spinner — announces via role=status + label. */
export function Spinner({ size = 'md', label = 'Loading', className, ...rest }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cx('ds-spinner', SIZES[size], className)}
      {...rest}
    />
  );
}
