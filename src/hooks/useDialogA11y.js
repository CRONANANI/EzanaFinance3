'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Escape to close, focus moved into the dialog on open, Tab trapped inside it,
 * and focus returned to the trigger on close. Attach the returned ref to the
 * dialog element (the one with role="dialog").
 *
 *   const ref = useDialogA11y(open, onClose);
 *   <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="x-title" tabIndex={-1}>
 */
export function useDialogA11y(open, onClose) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const node = ref.current;
    const previouslyFocused = typeof document !== 'undefined' ? document.activeElement : null;
    const items = () => (node ? Array.from(node.querySelectorAll(FOCUSABLE)) : []);

    (items()[0] || node)?.focus?.();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return ref;
}
