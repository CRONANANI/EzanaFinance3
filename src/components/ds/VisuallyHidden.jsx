'use client';

import { cx } from './tokens';

/** Visible to screen readers, hidden visually. For sr-only labels/text. */
export function VisuallyHidden({ as: Tag = 'span', className, children, ...rest }) {
  return (
    <Tag className={cx('ds-sr-only', className)} {...rest}>
      {children}
    </Tag>
  );
}
