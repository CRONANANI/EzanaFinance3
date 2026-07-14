'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { PitchDetailClient } from './PitchDetailClient';

/**
 * Large in-place pitch modal (spec Part 4). Opens on the Pipeline page via the
 * shallow `?pitch=<id>` route. Esc / backdrop close. Does not scroll the page
 * behind it. Below `lg` it becomes effectively full-screen (CSS).
 */
export function PitchModal({ pitchId, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!pitchId) return null;

  return (
    <div
      className="pmodal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label="Pitch detail"
    >
      <div className="pmodal">
        <button type="button" className="pmodal-close" aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden />
        </button>
        <div className="pmodal-body">
          <PitchDetailClient pitchId={pitchId} inModal onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
