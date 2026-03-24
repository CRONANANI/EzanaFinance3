'use client';

import { useState } from 'react';
import { usePinnedCards } from '@/hooks/usePinnedCards';

/**
 * Hover pin control — replaces always-visible pin on cards.
 * One pin per section is stored in profiles.pinned_cards (JSON).
 */
export function PinnableCard({ cardId, section, children, className = '' }) {
  const { togglePin, isCardPinned } = usePinnedCards();
  const isPinned = isCardPinned(cardId, section);
  const [hovered, setHovered] = useState(false);

  const showPin = hovered || isPinned;

  return (
    <div
      className={`pinnable-card-wrapper relative ${className}`.trim()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showPin && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePin(cardId, section);
          }}
          title={isPinned ? 'Unpin from Home' : 'Pin to Home'}
          aria-label={isPinned ? 'Unpin from Home' : 'Pin to Home'}
          className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-200"
          style={{
            background: isPinned ? '#10b981' : 'rgba(0, 0, 0, 0.65)',
            borderColor: isPinned ? '#10b981' : 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={isPinned ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
          </svg>
          {isPinned ? 'Pinned' : 'Pin'}
        </button>
      )}
      {children}
    </div>
  );
}
