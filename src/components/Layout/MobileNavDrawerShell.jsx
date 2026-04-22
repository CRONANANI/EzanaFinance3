'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * Reusable right-edge drawer: backdrop, body scroll lock, panel shell.
 * Main app nav (`Navbar.js`) already implements a full mobile menu; use this
 * for secondary surfaces (e.g. filters, help, partner mini-menus) or new flows
 * that need the same interaction pattern.
 */
export function MobileNavDrawerShell({ open, onOpenChange, title = 'Menu', className, children, side = 'right' }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] flex md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close menu"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'absolute top-0 flex h-full w-[min(100%,20rem)] max-w-sm flex-col border-border bg-card shadow-xl',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default MobileNavDrawerShell;
