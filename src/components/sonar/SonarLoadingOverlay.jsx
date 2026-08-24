'use client';

import { useEffect, useRef, useState } from 'react';
import { SonarLoader } from '@/components/sonar/SonarLoader';

import './sonar-loading-overlay.css';

/**
 * Fullscreen takeover shown while a ping is in flight. The nav is rendered by
 * the root layout ABOVE this page, so the takeover is a fixed overlay painted
 * over it (z-index above the nav's 1001) rather than layout surgery: nothing
 * unmounts, and the page beneath restores instantly on dismiss.
 *
 * Behavior:
 *   - `open` mirrors the page's in-flight phase. Errors / quota states flip
 *     it false and render in the normal page, never in here.
 *   - Body scroll locks while open and restores on dismiss.
 *   - Focus moves into the overlay on open and returns to the search pill on
 *     dismiss. Escape is deliberately inert: a ping is not cancelable in v1.
 *   - Motion-allowed: 150ms fade in, 200ms fade out with the dossier already
 *     rendering beneath. Reduced motion: mounts and unmounts instantly.
 */
export function SonarLoadingOverlay({ open }) {
  const [closing, setClosing] = useState(false);
  const boxRef = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      setClosing(false);
      document.body.classList.add('snro-lock');
      boxRef.current?.focus();
      return () => document.body.classList.remove('snro-lock');
    }
    if (!wasOpen.current) return undefined;
    // Dismiss: give focus back to the pill so the user can refine the ping.
    wasOpen.current = false;
    document.querySelector('.sonar-qbar-input')?.focus();
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      setClosing(true);
      const t = setTimeout(() => setClosing(false), 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  if (!open && !closing) return null;

  return (
    <div
      ref={boxRef}
      className={`snro-overlay${closing ? ' snro-overlay--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Loading briefing"
      tabIndex={-1}
    >
      <div className="snro-glow" aria-hidden="true" />
      <SonarLoader caption="Sweeping the field..." />
    </div>
  );
}

export default SonarLoadingOverlay;
