'use client';

import { cx } from './tokens';

const PADS = { none: '', md: 'ds-card--pad', lg: 'ds-card--pad-lg' };

/**
 * Surface card. pad: none | md | lg. `interactive` adds hover affordance,
 * `elevated` adds a shadow. Renders as <div> or any `as` element.
 */
export function Card({
  as: Tag = 'div',
  pad = 'md',
  interactive = false,
  elevated = false,
  className,
  children,
  ...rest
}) {
  return (
    <Tag
      className={cx(
        'ds-card',
        PADS[pad],
        interactive && 'ds-card--interactive',
        elevated && 'ds-card--elevated',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Card header row: optional Bootstrap icon + title + trailing slot. */
export function CardHeader({ icon, title, trailing, className, children }) {
  return (
    <div className={cx('ds-card-header', className)}>
      {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
      {title && <span>{title}</span>}
      {children}
      {trailing && <span style={{ marginLeft: 'auto' }}>{trailing}</span>}
    </div>
  );
}
