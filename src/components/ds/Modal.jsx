'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './tokens';
import { Button } from './Button';

/**
 * Accessible dialog. Closes on overlay click and Escape, locks body scroll,
 * and portals to <body>. Provide `footer` for action buttons.
 *
 * Nov 2026: focus moves into the dialog when it opens, Tab and Shift+Tab stay inside it,
 * and focus returns to whatever had it before when it closes.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, footer, size, className }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  /* Held in a ref so a parent passing a fresh onClose each render does not re-run the
     effect (which would move focus back into the dialog on every render). */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const before = typeof document !== 'undefined' ? document.activeElement : null;
    /* Focus the dialog itself, unless something inside it (an autoFocus input) already has it. */
    const raf = requestAnimationFrame(() => {
      const d = dialogRef.current;
      if (d && !d.contains(document.activeElement)) d.focus();
    });
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === dialogRef.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      if (before && typeof before.focus === 'function' && document.contains(before)) before.focus();
    };
  }, [open]);

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
        ref={dialogRef}
        tabIndex={-1}
        className={cx('ds-modal', className)}
        style={size ? { maxWidth: size } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {title && (
          <div className="ds-modal-header">
            <h2 className="ds-modal-title" id={titleId}>
              {title}
            </h2>
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
