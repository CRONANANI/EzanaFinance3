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
 * VARIANT SELECTION IS PURE CSS ART DIRECTION. Phones (<=480px) get the
 * darker dense variant, everything wider the sparse one, via a <picture>
 * <source media> query. The previous JS route (a `mapDense` matchMedia
 * state in LandingHero driving a dotColor prop) never actually delivered
 * dense on phones in production: the server rendered the sparse src, the
 * client's FIRST render already computed mapDense=true, so hydration
 * adopted the server attribute (React does not patch attribute mismatches
 * in production) and the effect's setMapDense(true) was a same-value
 * bailout - no render ever wrote the dense src. <picture> has none of
 * those failure modes: identical markup on server and client (no state,
 * no hydration risk), the browser picks the matching source BEFORE first
 * paint (no src flash, no post-mount repaint), only the matching file is
 * fetched, and a viewport resize across 480px switches automatically.
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

const MAP_SPARSE = '/images/landing/hero-dotted-map-sparse.svg';
const MAP_DENSE = '/images/landing/hero-dotted-map-dense.svg';

/* Must stay in sync with the old mapDense matchMedia query in LandingHero
   (phones read the lighter dots too faintly, so <=480px darkens them). */
const DENSE_MEDIA = '(max-width: 480px)';

export function HeroDottedMap() {
  return (
    <div className="world-map-container">
      <div className="world-map-inner">
        {/* Plain <picture>, not next/image: the asset is an unoptimizable
            local SVG, and only <source media> gives per-viewport variants
            with a correct first paint and a single fetch. Sizing comes from
            .world-map-image (width/height 100%, object-fit contain); the
            width/height attributes only preserve the intrinsic ratio. It is
            the page's LCP element, so it loads eager and high-priority. */}
        <picture>
          <source media={DENSE_MEDIA} srcSet={MAP_DENSE} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="world-map-image"
            src={MAP_SPARSE}
            alt=""
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            draggable={false}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      </div>
    </div>
  );
}
