'use client';

/**
 * Wrapper component for pinnable cards — pin functionality removed.
 */
export function PinnableCard({ cardId, section, children, className = '' }) {
  return (
    <div
      className={`pinnable-card-wrapper relative ${className}`.trim()}
    >
      {children}
    </div>
  );
}
