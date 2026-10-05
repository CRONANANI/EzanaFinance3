'use client';

import { useEffect } from 'react';

/* One belt speed for every dataset page, in pixels per second, calibrated to
   the Politician Tracker belt (its track at the old 124s duration: a
   2,554px loop / 124s = 20.6 px/s with the live feed). A fixed duration made
   longer tracks run faster; a fixed px/s keeps them level. */
export const TICKER_PX_PER_SEC = 21;

/**
 * Sets the track's animation-duration from its measured width. The track is
 * the duplicated list, and the keyframes move it -50%, so one loop is half
 * the scrollWidth. Re-measures on resize and once web fonts settle.
 */
export function useTickerSpeed(trackRef, deps = []) {
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const apply = () => {
      const loop = el.scrollWidth / 2;
      if (loop > 0) el.style.animationDuration = `${(loop / TICKER_PX_PER_SEC).toFixed(2)}s`;
    };
    apply();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    document.fonts?.ready?.then(apply).catch(() => {});
    return () => ro?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
