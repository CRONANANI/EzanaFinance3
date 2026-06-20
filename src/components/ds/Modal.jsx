'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './tokens';
import { Button } from './Button';

/**
 * Accessible dialog. Closes on overlay click and Escape, locks body scroll,
 * and portals to <body>. Provide `footer` for action buttons.
 */
export function Modal({ open, onClose, title, children, footer, size, className }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="ds-modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={cx('ds-modal', className)}
        style={size ? { maxWidth: size } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        {title && (
          <div className="ds-modal-header">
            <h2 className="ds-modal-title">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon="bi-x-lg"
              aria-label="Close"
              onClick={onClose}
            />
          </div>
        )}
        <div className="ds-modal-body">{children}</div>
        {footer && <div className="ds-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
