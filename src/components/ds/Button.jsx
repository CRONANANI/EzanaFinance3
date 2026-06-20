'use client';

import { cx } from './tokens';

const VARIANTS = {
  primary: 'ds-btn--primary',
  secondary: 'ds-btn--secondary',
  ghost: 'ds-btn--ghost',
  danger: 'ds-btn--danger',
};

const SIZES = { sm: 'ds-btn--sm', md: '', lg: 'ds-btn--lg' };

/**
 * The one button. Variants: primary (emerald), secondary, ghost, danger.
 * Handles loading (spinner + disabled), icon (Bootstrap class), iconOnly,
 * block, and focus-visible/hover/disabled states via the .ds-btn layer.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  icon,
  iconOnly = false,
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      className={cx(
        'ds-btn',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size],
        block && 'ds-btn--block',
        iconOnly && 'ds-btn--icon',
        loading && 'is-loading',
        className,
      )}
      {...rest}
    >
      {loading && <span className="ds-btn-spinner" aria-hidden="true" />}
      {!loading && icon && <i className={`bi ${icon}`} aria-hidden="true" />}
      {children}
    </button>
  );
}
