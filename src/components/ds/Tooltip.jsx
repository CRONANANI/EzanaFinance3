'use client';

import { cx } from './tokens';

/** Hover/focus tooltip. Wrap the trigger; `label` is the bubble text. */
export function Tooltip({ label, children, className }) {
  return (
    <span className={cx('ds-tooltip-wrap', className)}>
      {children}
      <span className="ds-tooltip" role="tooltip">
        {label}
      </span>
    </span>
  );
}
