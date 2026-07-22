'use client';

import Image from 'next/image';
import DottedMap from 'dotted-map';

/**
 * Static dotted-continents layer for the landing hero.
 *
 * The DottedMap output is DETERMINISTIC: fixed height, fixed grid, two known
 * dot colors. So both variants are generated ONCE at module scope and cached,
 * rather than inside render.
 *
 * This matters because getSVG() emits thousands of <circle> nodes and then
 * encodeURIComponent()s the result — a main-thread block measured in hundreds
 * of ms. Previously it ran on the server, again on hydration, and a THIRD time
 * when `mapDense` flipped after mount on mobile (the dotColor prop invalidated
 * the useMemo mid-paint). That third run was the visible jank.
 *
 * Module scope evaluates once per process on the server and once per page load
 * in the browser, and the `mapDense` flip is now a cache hit rather than a
 * regeneration.
 */
const MAP_WIDTH = 337;
const MAP_HEIGHT = 170;

const DOT_SPARSE = 'rgba(5, 150, 105, 0.7)';
const DOT_DENSE = 'rgba(4, 120, 87, 0.92)';

function buildDataUrl(color) {
  const svg = new DottedMap({ height: 170, grid: 'diagonal' }).getSVG({
    radius: 0.18,
    color,
    shape: 'circle',
    backgroundColor: 'transparent',
  });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generated once, at module evaluation — never during render.
const CACHE = new Map([
  [DOT_SPARSE, buildDataUrl(DOT_SPARSE)],
  [DOT_DENSE, buildDataUrl(DOT_DENSE)],
]);

function getDataUrl(color) {
  let url = CACHE.get(color);
  if (!url) {
    // Defensive: an unexpected color still works, and is cached after the first
    // call rather than regenerating on every render.
    url = buildDataUrl(color);
    CACHE.set(color, url);
  }
  return url;
}

export function HeroDottedMap({ dotColor = DOT_SPARSE }) {
  const dataUrl = getDataUrl(dotColor);

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
          priority
          style={{ objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}
