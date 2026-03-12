'use client';

import { usePin } from '@/contexts/PinContext';
import Link from 'next/link';

export function PinnableCard({
  cardId,
  title,
  sourcePage,
  sourceLabel,
  children,
  className = '',
  defaultW = 2,
  defaultH = 1,
}) {
  const { addPinned, removePinned, isPinned } = usePin();
  const pinned = isPinned(cardId);

  const handlePinClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (pinned) {
      removePinned(cardId);
    } else {
      addPinned({
        id: cardId,
        title,
        sourcePage,
        sourceLabel,
        w: defaultW,
        h: defaultH,
      });
    }
  };

  return (
    <div className={`pinnable-card-wrapper relative ${className}`}>
      <button
        type="button"
        onClick={handlePinClick}
        className="pin-btn absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-black/40 hover:bg-black/60 text-white/80 hover:text-emerald-400 transition-colors border border-white/10"
        title={pinned ? 'Unpin from Home' : 'Pin to Home'}
        aria-label={pinned ? 'Unpin from Home' : 'Pin to Home'}
      >
        <i className={`bi ${pinned ? 'bi-pin-fill' : 'bi-pin'}`} />
      </button>
      {children}
    </div>
  );
}
