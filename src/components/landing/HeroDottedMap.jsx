import Image from 'next/image';

/**
 * Static dotted-continents layer for the landing hero.
 *
 * The two variants are PREGENERATED STATIC ASSETS in
 * /public/images/landing/hero-dotted-map-{sparse,dense}.svg, not runtime
 * output. They used to be built in the browser with the `dotted-map`
 * package at module scope, which cost this page dearly twice over:
 *   - the encoded data URL weighed 3.35MB and was inlined into the SSR
 *     HTML TWICE (the <img src> plus the priority preload <link>),
 *     ballooning the document to ~6.9MB, and
 *   - getSVG() + encodeURIComponent() ran again on hydration, a
 *     main-thread block measured in hundreds of ms.
 * Serving the same SVG as a cacheable file removes both costs and the
 * whole `dotted-map` dependency from the client bundle.
 *
 * The assets are deterministic output of:
 *   new DottedMap({ height: 170, grid: 'diagonal' }).getSVG({
 *     radius: 0.18, color, shape: 'circle', backgroundColor: 'transparent' })
 * with colors rgba(5, 150, 105, 0.7) (sparse) / rgba(4, 120, 87, 0.92)
 * (dense), then losslessly compacted (the identical per-circle fill hoisted
 * onto one parent <g>; coordinates and radius unchanged). To regenerate,
 * run that snippet with the `dotted-map` package (still in package.json)
 * and re-apply the compaction.
 */
const MAP_WIDTH = 337;
const MAP_HEIGHT = 170;

const DOT_SPARSE = 'rgba(5, 150, 105, 0.7)';
const DOT_DENSE = 'rgba(4, 120, 87, 0.92)';

const MAP_SRC = {
  [DOT_SPARSE]: '/images/landing/hero-dotted-map-sparse.svg',
  [DOT_DENSE]: '/images/landing/hero-dotted-map-dense.svg',
};

export function HeroDottedMap({ dotColor = DOT_SPARSE }) {
  // Unknown colors fall back to the sparse asset: the two call-site colors
  // are the only variants that exist as files.
  const src = MAP_SRC[dotColor] || MAP_SRC[DOT_SPARSE];

  return (
    <div className="world-map-container">
      <div className="world-map-inner">
        <Image
          className="world-map-image"
          src={src}
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
