'use client';

import { cx } from './tokens';

const TONES = {
  info: { cls: 'ds-alert--info', icon: 'bi-info-circle' },
  success: { cls: 'ds-alert--success', icon: 'bi-check-circle' },
  warning: { cls: 'ds-alert--warning', icon: 'bi-exclamation-triangle' },
  error: { cls: 'ds-alert--error', icon: 'bi-exclamation-octagon' },
};

/**
 * Inline status / feedback message. Announces to assistive tech: errors are
 * assertive (role=alert), everything else polite (role=status). The icon both
 * reinforces and never replaces the text, so status is never color-only.
 */
export function Alert({ tone = 'info', icon, title, className, children, ...rest }) {
  const t = TONES[tone] || TONES.info;
  const isError = tone === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={cx('ds-alert', t.cls, className)}
      {...rest}
    >
      <i className={`bi ${icon || t.icon}`} aria-hidden="true" />
      <div>
        {title && <div className="ds-alert-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
