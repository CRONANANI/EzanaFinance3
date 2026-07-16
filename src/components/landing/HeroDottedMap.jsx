'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import DottedMap from 'dotted-map';

/**
 * Static dotted-continents layer for the landing hero.
 *
 * It renders the SAME DottedMap output the interactive `<WorldMap>` produces,
 * but none of its interactive machinery (proj4 country shapes, the power-map
 * hook, pan/zoom/hover). The hero only ever needed a static picture — it passes
 * `hideControls` + `hideFinancialDots`.
 *
 * Crucially it is imported NORMALLY (no `next/dynamic` + `ssr:false`), so the
 * dotted map is computed during render — including on the server — and ships in
 * the initial HTML. It paints the instant the page does, in step with the
 * inline signal-routes overlay, instead of popping in seconds later from a
 * separate `ssr:false` chunk that only computed after hydration.
 *
 * `dotColor` (including the mobile `mapDense` swap) is passed through unchanged,
 * and the markup reuses the same `.world-map-*` class names the interactive
 * component uses, so the existing hero CSS sizes it identically — no layout
 * shift, no visual change, only timing.
 */
// DottedMap({ height: 170, grid: 'diagonal' }) is deterministic; these fixed
// params always yield a 337×170 viewBox (the intrinsic size we hand next/image).
const MAP_WIDTH = 337;
const MAP_HEIGHT = 170;

export function HeroDottedMap({ dotColor = 'rgba(5, 150, 105, 0.7)' }) {
  const dataUrl = useMemo(() => {
    const svg = new DottedMap({ height: 170, grid: 'diagonal' }).getSVG({
      radius: 0.18,
      color: dotColor,
      shape: 'circle',
      backgroundColor: 'transparent',
    });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [dotColor]);

  return (
    <div className="world-map-container">
      <div className="world-map-inner">
        <Image
          className="world-map-image"
          src={dataUrl}
          alt=""
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          draggable={false}
          unoptimized
          loading="eager"
          style={{ objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}
