'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PitchDetailClient } from './PitchDetailClient';

/**
 * Large in-place pitch modal (spec Part 4). Opens on the Pipeline page via the
 * shallow `?pitch=<id>` route. Esc / backdrop close. Does not scroll the page
 * behind it. Below `lg` it becomes effectively full-screen (CSS).
 *
 * Portaled to <body> so no page ancestor's transform/filter can turn its
 * `position: fixed` into a containing-block-relative box (which is what trapped
 * it inside the kanban area). Overlay close is on mousedown-on-the-overlay only,
 * so a text-selection drag that ends on the overlay never closes it.
 */
export function PitchModal({ pitchId, onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);

    // Lock background scroll WITHOUT a layout shift. Scrollbars are globally
    // zero-width (globals.css), so no compensation is normally needed — but if a
    // real scrollbar ever exists, pad by its width so the page doesn't jump.
    const { style } = document.body;
    const prevOverflow = style.overflow;
    const prevPadRight = style.paddingRight;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    style.overflow = 'hidden';
    if (sbw > 0) style.paddingRight = `${sbw}px`;

    return () => {
      document.removeEventListener('keydown', onKey);
      style.overflow = prevOverflow;
      style.paddingRight = prevPadRight;
    };
  }, [onClose]);

  if (!pitchId || !mounted) return null;

  return createPortal(
    <div
      className="pmodal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="pmodal"
        role="dialog"
        aria-modal="true"
        aria-label="Pitch detail"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="pmodal-close" aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden />
        </button>
        <div className="pmodal-body">
          <PitchDetailClient pitchId={pitchId} inModal onClose={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
