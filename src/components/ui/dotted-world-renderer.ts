/**
 * Canvas renderer for the dotted world (Market Analysis map). Nov 2026.
 *
 * Replaces the old pair of layers (a next/image of the lattice SVG, plus
 * ~24k SVG <circle>s with blur filters for the power map) that sat inside a
 * CSS-scaled, GPU-promoted div. That setup resampled a raster on every zoom
 * and drew a perfectly regular lattice at sub-pixel sizes, which is what
 * produced the rows, diagonals and moire.
 *
 * Here:
 *   - One <canvas> sized to cssSize * devicePixelRatio, drawn with
 *     ctx.setTransform(dpr...). Pan and zoom redraw with the transform
 *     applied to the coordinates; nothing is CSS-scaled.
 *   - Dots come from `sampleDots` (fixed-seed jitter over the land mask) at a
 *     spacing chosen in SCREEN pixels: ~4.2 CSS px apart, diameter 40% of
 *     the spacing (never under 1.6 CSS px). The sample set changes only when
 *     the effective scale crosses a quarter-octave bucket.
 *   - Heat layers colour the same dots per country (scoreToColor via the
 *     caller), with a cheap glow (a larger low-alpha circle) for the top
 *     tier instead of per-dot SVG filters.
 *   - Colours come from tokens read off the container: --emerald (dots),
 *     --map-dot-alpha, --map-dot-muted (unscored land under a heat layer)
 *     and --map-power-bg.
 *   - The top and bottom 10% of the map fade out, as the old CSS mask did.
 */
import { sampleDots, type buildWorld } from '@/lib/geo/dotted-world';

export type DottedWorld = ReturnType<typeof buildWorld>;

export type MapView = { x: number; y: number; scale: number };

/** Box of the map inside the container, in CSS px, before the transform. */
export type MapLayout = {
  width: number;
  height: number;
  /** Offset of the transformed layer (transform-origin 0 0). */
  innerLeft: number;
  innerTop: number;
  /** The wrapper box inside that layer (the viewBox is fitted into it). */
  wrapLeft: number;
  wrapTop: number;
  wrapWidth: number;
  wrapHeight: number;
};

export type HeatStyle = { color: string; opacity: number; score: number };

const TARGET_SPACING_PX = 4.2;
const DOT_RATIO = 0.4; // diameter / spacing
const MIN_RADIUS_PX = 0.8;
const FADE = 0.1; // top and bottom fade band, fraction of the wrapper height
const FADE_STEPS = 8;
/** Largest field bitmap kept for panning (device px); past it, draw direct. */
const MAX_CACHE_PIXELS = 16_000_000;

type Tokens = { dot: string; dotAlpha: number; muted: string; powerBg: string };

function readTokens(el: Element, dotColor?: string): Tokens {
  const cs = getComputedStyle(el);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  const alpha = parseFloat(v('--map-dot-alpha'));
  return {
    dot: dotColor || v('--emerald') || cs.color,
    dotAlpha: dotColor ? 1 : Number.isFinite(alpha) ? alpha : 0.5,
    muted: v('--map-dot-muted') || cs.color,
    powerBg: v('--map-power-bg') || 'transparent',
  };
}

/** Quarter-octave bucket so the sample set is stable across small resizes. */
function spacingBucket(pxPerUnit: number): number {
  const s = TARGET_SPACING_PX / pxPerUnit;
  if (s <= 1) return 1;
  return Math.round(2 ** (Math.round(Math.log2(s) * 4) / 4) * 1000) / 1000;
}

export class DottedWorldRenderer {
  private ctx: CanvasRenderingContext2D | null;
  private dpr = 1;
  private layout: MapLayout | null = null;
  private tokens: Tokens | null = null;
  private heat: ((cell: number) => HeatStyle | null) | null = null;
  private powerActive = false;
  private dotColor: string | undefined;
  private lastView: MapView = { x: 0, y: 0, scale: 1 };
  private frame = 0;
  /** Bumped whenever colours or heat change (invalidates the cache). */
  private version = 0;
  private cache: HTMLCanvasElement | null = null;
  private cacheKey = '';
  private cacheTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private world: DottedWorld,
  ) {
    this.ctx = canvas.getContext('2d');
  }

  /** Re-measure the canvas (resize, DPR change). */
  setLayout(layout: MapLayout) {
    this.layout = layout;
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const w = Math.max(1, Math.round(layout.width * this.dpr));
    const h = Math.max(1, Math.round(layout.height * this.dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.canvas.style.width = `${layout.width}px`;
    this.canvas.style.height = `${layout.height}px`;
    this.version++;
  }

  /** Re-read colour tokens (theme change, or a new dotColor override). */
  setStyle(el: Element, dotColor?: string) {
    this.dotColor = dotColor;
    this.tokens = readTokens(el, dotColor);
    this.version++;
  }

  /**
   * Heat colouring per land cell, or null for the plain dot field.
   * `powerActive` paints the power-map ground even before the country table
   * is ready.
   */
  setHeat(heat: ((cell: number) => HeatStyle | null) | null, powerActive: boolean) {
    this.heat = heat;
    this.powerActive = powerActive;
    this.version++;
  }

  /** Coalesce redraws into one per animation frame. */
  requestDraw(view: MapView = this.lastView) {
    this.lastView = view;
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.draw(this.lastView);
    });
  }

  destroy() {
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.cacheTimer) clearTimeout(this.cacheTimer);
    this.frame = 0;
    this.cache = null;
  }

  /**
   * Draw the view. While the scale holds still (panning), the whole field is
   * a cached bitmap at that exact scale, blitted on whole device pixels, so
   * a pan frame is one drawImage. Changing the scale draws directly (culled
   * to the screen) and rebuilds the cache once the scale settles.
   */
  draw(view: MapView) {
    this.lastView = view;
    const { ctx, layout, tokens, world, dpr } = this;
    if (!ctx || !layout || !tokens) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, layout.width, layout.height);
    if (layout.wrapWidth <= 0 || layout.wrapHeight <= 0) return;

    const s = view.scale;
    // viewBox fitted into the wrapper ("xMidYMid meet", like the SVG layer).
    const k = Math.min(layout.wrapWidth / world.width, layout.wrapHeight / world.height);
    const ox = (layout.wrapWidth - world.width * k) / 2;
    const oy = (layout.wrapHeight - world.height * k) / 2;
    // The wrapper box on screen, after the transform.
    const Wx = layout.innerLeft + view.x + s * layout.wrapLeft;
    const Wy = layout.innerTop + view.y + s * layout.wrapTop;
    const Ww = s * layout.wrapWidth;
    const Wh = s * layout.wrapHeight;

    const key = `${s}|${this.version}|${dpr}|${layout.wrapWidth}x${layout.wrapHeight}`;
    if (this.cache && this.cacheKey === key) {
      const dx = Math.round(Wx * dpr) / dpr;
      const dy = Math.round(Wy * dpr) / dpr;
      ctx.drawImage(this.cache, dx, dy, this.cache.width / dpr, this.cache.height / dpr);
      return;
    }

    this.paintField(ctx, {
      originX: Wx,
      originY: Wy,
      boxW: Ww,
      boxH: Wh,
      A: s * k,
      ox: s * ox,
      oy: s * oy,
      cullW: layout.width,
      cullH: layout.height,
    });

    // Rebuild the cache for this scale once it has held for a moment.
    if (this.cacheTimer) clearTimeout(this.cacheTimer);
    const devW = Math.ceil(Ww * dpr);
    const devH = Math.ceil(Wh * dpr);
    if (devW * devH > MAX_CACHE_PIXELS) {
      this.cache = null;
      this.cacheKey = '';
      return;
    }
    this.cacheTimer = setTimeout(() => {
      this.cacheTimer = null;
      const c =
        this.cache && this.cache.width === devW && this.cache.height === devH
          ? this.cache
          : Object.assign(document.createElement('canvas'), { width: devW, height: devH });
      const cctx = c.getContext('2d');
      if (!cctx) return;
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.clearRect(0, 0, devW / dpr, devH / dpr);
      // Origin snapped the same way the blit will snap it.
      const fx = Wx - Math.round(Wx * dpr) / dpr;
      const fy = Wy - Math.round(Wy * dpr) / dpr;
      this.paintField(cctx, {
        originX: fx,
        originY: fy,
        boxW: Ww,
        boxH: Wh,
        A: s * k,
        ox: s * ox,
        oy: s * oy,
        cullW: devW / dpr,
        cullH: devH / dpr,
      });
      this.cache = c;
      this.cacheKey = key;
    }, 120);
  }

  /**
   * Paint the ground (power map) and the dots for a wrapper box whose top
   * left sits at (originX, originY) in the target's CSS px. `A` is CSS px
   * per grid unit, (ox, oy) the fitted viewBox offset inside the box.
   */
  private paintField(
    ctx: CanvasRenderingContext2D,
    g: {
      originX: number;
      originY: number;
      boxW: number;
      boxH: number;
      A: number;
      ox: number;
      oy: number;
      cullW: number;
      cullH: number;
    },
  ) {
    const { tokens, world } = this;
    if (!tokens) return;
    const { A } = g;
    const Bx = g.originX + g.ox;
    const By = g.originY + g.oy;

    if (this.powerActive && tokens.powerBg !== 'transparent') {
      ctx.fillStyle = tokens.powerBg;
      ctx.fillRect(g.originX, g.originY, g.boxW, g.boxH);
    }

    const spacing = spacingBucket(A);
    const dots = sampleDots(world, spacing);
    const baseR = Math.max(MIN_RADIUS_PX, (DOT_RATIO / 2) * spacing * A);
    const margin = baseR * 3;

    // Visible range in grid units (cull what falls outside the target).
    const minX = (-margin - Bx) / A;
    const maxX = (g.cullW + margin - Bx) / A;
    const minY = (-margin - By) / A;
    const maxY = (g.cullH + margin - By) / A;

    // Fade by position inside the wrapper box (moves with the map), as the
    // old CSS mask did: the top and bottom 10% fade out.
    const fadeLevel = (gy: number) => {
      const f = (g.oy + gy * A) / g.boxH;
      const t = f < FADE ? f / FADE : f > 1 - FADE ? (1 - f) / FADE : 1;
      return Math.max(0, Math.min(FADE_STEPS, Math.round(t * FADE_STEPS)));
    };

    // Batch dots into one path per (colour, alpha, radius) group.
    type Group = { color: string; alpha: number; r: number; pts: number[] };
    const groups = new Map<string, Group>();
    const glows = new Map<string, Group>();
    const push = (
      bucket: Map<string, Group>,
      color: string,
      alpha: number,
      r: number,
      x: number,
      y: number,
    ) => {
      const key = `${color}|${alpha}|${r}`;
      let grp = bucket.get(key);
      if (!grp) {
        grp = { color, alpha, r, pts: [] };
        bucket.set(key, grp);
      }
      grp.pts.push(x, y);
    };

    const heat = this.heat;
    const rTop = Math.round(baseR * 1.35 * 100) / 100;
    const rHigh = Math.round(baseR * 1.15 * 100) / 100;
    for (let i = 0; i < dots.count; i++) {
      const gx = dots.x[i];
      const gy = dots.y[i];
      if (gx < minX || gx > maxX || gy < minY || gy > maxY) continue;
      const level = fadeLevel(gy);
      if (level === 0) continue;
      const fade = level / FADE_STEPS;
      const sx = Bx + gx * A;
      const sy = By + gy * A;
      if (!heat) {
        push(groups, tokens.dot, tokens.dotAlpha * fade, baseR, sx, sy);
        continue;
      }
      const h = heat(dots.cell[i]);
      if (!h) {
        push(groups, tokens.muted, 0.9 * fade, baseR, sx, sy);
        continue;
      }
      const r = h.score >= 90 ? rTop : h.score >= 70 ? rHigh : baseR;
      if (h.score >= 90) push(glows, h.color, 0.22 * fade, r * 2.4, sx, sy);
      else if (h.score >= 80) push(glows, h.color, 0.16 * fade, r * 1.9, sx, sy);
      push(groups, h.color, h.opacity * fade, r, sx, sy);
    }

    const paint = (bucket: Map<string, Group>) => {
      for (const grp of bucket.values()) {
        ctx.globalAlpha = grp.alpha;
        ctx.fillStyle = grp.color;
        ctx.beginPath();
        const { pts, r } = grp;
        for (let j = 0; j < pts.length; j += 2) {
          ctx.moveTo(pts[j] + r, pts[j + 1]);
          ctx.arc(pts[j], pts[j + 1], r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    };
    paint(glows);
    paint(groups);
    ctx.globalAlpha = 1;
  }

  /**
   * Container CSS px to grid units for the view on screen (hit-testing a
   * country under the pointer through the dot to country table).
   */
  screenToGrid(px: number, py: number): { x: number; y: number } | null {
    const { layout, world } = this;
    if (!layout || layout.wrapWidth <= 0 || layout.wrapHeight <= 0) return null;
    const v = this.lastView;
    const k = Math.min(layout.wrapWidth / world.width, layout.wrapHeight / world.height);
    const ox = (layout.wrapWidth - world.width * k) / 2;
    const oy = (layout.wrapHeight - world.height * k) / 2;
    const A = v.scale * k;
    const Bx = layout.innerLeft + v.x + v.scale * (layout.wrapLeft + ox);
    const By = layout.innerTop + v.y + v.scale * (layout.wrapTop + oy);
    return { x: (px - Bx) / A, y: (py - By) / A };
  }

  /** For callers that re-read tokens without changing the override. */
  get colorOverride() {
    return this.dotColor;
  }
}
