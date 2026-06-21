'use client';

import { cx } from './tokens';

/**
 * Empty state: icon + title + description + optional action(s). Use for "no
 * results", "nothing here yet", first-run, etc.
 */
export function EmptyState({
  icon = 'bi-inbox',
  title,
  description,
  action,
  className,
  children,
  ...rest
}) {
  return (
    <div className={cx('ds-empty', className)} {...rest}>
      {icon && <i className={`bi ${icon} ds-empty-icon`} aria-hidden="true" />}
      {title && <div className="ds-empty-title">{title}</div>}
      {description && <div className="ds-empty-desc">{description}</div>}
      {children}
      {action && <div className="ds-empty-actions">{action}</div>}
    </div>
  );
}

/**
 * Error state — an EmptyState tuned for failures. Announces via role=alert and
 * defaults to a warning icon + retry-friendly copy.
 */
export function ErrorState({
  icon = 'bi-exclamation-triangle',
  title = 'Something went wrong',
  description,
  action,
  ...rest
}) {
  return (
    <EmptyState
      role="alert"
      icon={icon}
      title={title}
      description={description}
      action={action}
      {...rest}
    />
  );
}
