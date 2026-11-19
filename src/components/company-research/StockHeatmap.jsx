'use client';

/**
 * Stock market heatmap (US Equities), Nov 19, 2026 redesign after the
 * 21st.dev "market heatmap": one SVG squarified treemap. Sectors are laid out
 * first, each with a label strip, then each sector's tickers inside it. Tile
 * area follows the size basis (absolute YTD return, as the card header says);
 * colour is a diverging scale on Ezana emerald (up) and red (down), deeper
 * for bigger moves. Hover dims the rest of the map and opens a readout parked
 * beside the tile, never on top of it. Click opens the stock; Space pins the
 * readout; arrow keys walk the tiles from largest to smallest.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { filterHeatmap } from '@/lib/research/research-filters';
import './stock-heatmap.css';

/* ── Static sector data — tickers with YTD change % ─────────────────── */
const SECTOR_DATA = {
  Technology: [
    { t: 'MSFT', ch: 39.92 },
    { t: 'AAPL', ch: 47.82 },
    { t: 'NVDA', ch: 184.01 },
    { t: 'GOOGL', ch: 34.42 },
    { t: 'META', ch: 134.23 },
    { t: 'AVGO', ch: 53.55 },
    { t: 'ADBE', ch: 44.12 },
    { t: 'CRM', ch: 57.16 },
    { t: 'ORCL', ch: 45.33 },
    { t: 'AMD', ch: -72.94 },
    { t: 'INTC', ch: -5.3 },
    { t: 'CSCO', ch: 7.98 },
  ],
  Finance: [
    { t: 'BRK.B', ch: 9.89 },
    { t: 'JPM', ch: 7.46 },
    { t: 'V', ch: 13.4 },
    { t: 'MA', ch: 11.83 },
    { t: 'BAC', ch: -13.2 },
    { t: 'WFC', ch: -2.8 },
    { t: 'GS', ch: 16.19 },
    { t: 'MS', ch: 0.19 },
  ],
  Healthcare: [
    { t: 'LLY', ch: 28.06 },
    { t: 'UNH', ch: -8.59 },
    { t: 'JNJ', ch: -6.28 },
    { t: 'MRK', ch: 3.99 },
    { t: 'ABBV', ch: -16.82 },
    { t: 'PFE', ch: -28.13 },
    { t: 'TMO', ch: -5.71 },
    { t: 'ABT', ch: -1.47 },
  ],
  Consumer: [
    { t: 'AMZN', ch: 52.38 },
    { t: 'TSLA', ch: 122.59 },
    { t: 'WMT', ch: 9.72 },
    { t: 'HD', ch: -2.43 },
    { t: 'COST', ch: 17.19 },
    { t: 'MCD', ch: 12.78 },
    { t: 'NKE', ch: -6.62 },
    { t: 'SBUX', ch: -0.11 },
    { t: 'DIS', ch: -0.11 },
    { t: 'NFLX', ch: 80.91 },
  ],
  Energy: [
    { t: 'XOM', ch: -1.99 },
    { t: 'CVX', ch: -8.22 },
    { t: 'COP', ch: -12.51 },
    { t: 'SLB', ch: -18.4 },
  ],
  Industrials: [
    { t: 'CAT', ch: 2.24 },
    { t: 'BA', ch: -67.09 },
    { t: 'UPS', ch: 1.52 },
    { t: 'LMT', ch: -4.87 },
    { t: 'GE', ch: 44.44 },
  ],
};

/* ── Layout ──────────────────────────────────────────────────────────── */

const GREEN = 'var(--brand-ezana-green)';
const RED = 'var(--negative)';
const LABEL_H = 20;
const GAP = 3;
const TIP_W = 168;
const TIP_GAP = 8;
/* A tile never shrinks below this weight, so a flat stock still shows. */
const MIN_WEIGHT = 2;

function worst(row, side, area) {
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = area * area;
  const l2 = side * side;
  return Math.max((l2 * max) / s2, s2 / (l2 * min));
}

/** Squarified treemap of `items` ({ weight }) into the rect x, y, w, h. */
function squarify(items, x, y, w, h) {
  const total = items.reduce((a, it) => a + it.weight, 0);
  if (!total || w <= 0 || h <= 0) return [];
  const scale = (w * h) / total;
  const list = items.map((it) => ({ area: it.weight * scale, it }));
  const out = [];
  let rx = x;
  let ry = y;
  let rw = w;
  let rh = h;
  let idx = 0;
  while (idx < list.length) {
    const side = Math.min(rw, rh);
    const row = [list[idx].area];
    const rowIt = [list[idx].it];
    let rowArea = list[idx].area;
    let k = idx + 1;
    while (k < list.length) {
      const next = rowArea + list[k].area;
      if (worst([...row, list[k].area], side, next) > worst(row, side, rowArea)) break;
      row.push(list[k].area);
      rowIt.push(list[k].it);
      rowArea = next;
      k += 1;
    }
    if (rw >= rh) {
      const colW = rowArea / rh;
      let cy = ry;
      row.forEach((a, j) => {
        const th = a / colW;
        out.push({ x: rx, y: cy, w: colW, h: th, it: rowIt[j] });
        cy += th;
      });
      rx += colW;
      rw -= colW;
    } else {
      const rowH = rowArea / rw;
      let cx = rx;
      row.forEach((a, j) => {
        const tw = a / rowH;
        out.push({ x: cx, y: ry, w: tw, h: rowH, it: rowIt[j] });
        cx += tw;
      });
      ry += rowH;
      rh -= rowH;
    }
    idx = k;
  }
  return out;
}

/** Diverging fill: the hue says direction, its strength says size (YTD). */
const tileFill = (ch) =>
  `color-mix(in srgb, ${ch >= 0 ? GREEN : RED} ${Math.round(Math.min(Math.abs(ch) / 40, 1) * 62 + 14)}%, var(--surface-card, var(--bg-primary)))`;
const ink = (ch) => `color-mix(in oklab, ${ch >= 0 ? GREEN : RED} 70%, var(--text-primary))`;
const fmtSigned = (v, d = 2) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}%`;

/** Park the readout beside the tile: above, below, right, left, else a corner. */
function place(t, h, W, H) {
  const cx = Math.max(0, Math.min(W - TIP_W, t.x + t.w / 2 - TIP_W / 2));
  const cy = Math.max(0, Math.min(H - h, t.y + t.h / 2 - h / 2));
  const above = t.y - TIP_GAP - h;
  if (above >= 0) return { left: cx, top: above };
  const below = t.y + t.h + TIP_GAP;
  if (below + h <= H) return { left: cx, top: below };
  const right = t.x + t.w + TIP_GAP;
  if (right + TIP_W <= W) return { left: right, top: cy };
  const left = t.x - TIP_GAP - TIP_W;
  if (left >= 0) return { left, top: cy };
  return { left: t.x < W / 2 ? W - TIP_W : 0, top: t.y < H / 2 ? H - h : 0 };
}

/**
 * `sectors` (names, empty for all) and `movers` ('all', 'gainers' or
 * 'decliners') come from the research page's filter menu.
 */
export function StockHeatmap({ onSelectStock, sectors = [], movers = 'all' }) {
  const reduced = useReducedMotion();
  const boxRef = useRef(null);
  const [W, setW] = useState(900);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = Math.round(Math.max(360, Math.min(560, W * (W < 640 ? 1.1 : 0.5))));

  const groups = useMemo(
    () =>
      Object.entries(filterHeatmap(SECTOR_DATA, { sectors, movers })).map(([sector, stocks]) => {
        const items = stocks
          .map((st) => ({ ...st, sector, weight: Math.max(Math.abs(st.ch), MIN_WEIGHT) }))
          .sort((a, b) => b.weight - a.weight);
        return { sector, items, weight: items.reduce((a, it) => a + it.weight, 0) };
      }),
    [sectors, movers],
  );

  const { tiles, labels } = useMemo(() => {
    const sectorRects = squarify(
      [...groups].sort((a, b) => b.weight - a.weight),
      0,
      0,
      W,
      H,
    );
    const outTiles = [];
    const outLabels = [];
    sectorRects.forEach((r) => {
      const g = r.it;
      const inner = { x: r.x + GAP / 2, y: r.y + GAP / 2, w: r.w - GAP, h: r.h - GAP };
      const showLabel = inner.h > LABEL_H + 24 && inner.w > 48;
      if (showLabel) outLabels.push({ sector: g.sector, x: inner.x, y: inner.y, w: inner.w });
      const top = showLabel ? LABEL_H : 0;
      squarify(g.items, inner.x, inner.y + top, inner.w, inner.h - top).forEach((t) =>
        outTiles.push({ x: t.x, y: t.y, w: t.w, h: t.h, s: t.it }),
      );
    });
    return { tiles: outTiles, labels: outLabels };
  }, [groups, W, H]);

  /* Keyboard order: largest move first. */
  const order = useMemo(() => [...tiles].sort((a, b) => b.s.weight - a.s.weight), [tiles]);
  const [hover, setHover] = useState(null);
  const [pin, setPin] = useState(null);
  const hot = pin ?? hover;
  const hotTile = tiles.find((t) => t.s.t === hot) || null;
  const tipRef = useRef(null);
  const [tipH, setTipH] = useState(70);
  useLayoutEffect(() => {
    if (tipRef.current) setTipH(tipRef.current.offsetHeight);
  }, [hot]);
  const tip = hotTile ? place(hotTile, tipH, W, H) : null;

  if (!groups.length) {
    return (
      <div className="heatmap-container">
        <p className="crx-filter-empty" role="status">
          No stocks match these filters. Change or reset them from the filter menu in the search
          bar.
        </p>
      </div>
    );
  }

  const gainers = tiles.filter((t) => t.s.ch >= 0).length;

  return (
    <div className="heatmap-container shm">
      <div className="shm-legend" aria-hidden="true">
        <span className="shm-legend__item">
          <span className="shm-swatch shm-swatch--down" /> Down
        </span>
        <span className="shm-ramp" />
        <span className="shm-legend__item">
          Up <span className="shm-swatch shm-swatch--up" />
        </span>
        <span className="shm-legend__note">
          {gainers} of {tiles.length} up YTD · sized by return magnitude
        </span>
      </div>
      <div
        ref={boxRef}
        className="shm-box"
        tabIndex={0}
        role="group"
        aria-label="Stock market heatmap. Arrow keys read each stock, Enter opens it, Space pins the readout."
        onFocus={() => setHover((h) => h ?? pin ?? order[0]?.s.t ?? null)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          const at = order.findIndex((t) => t.s.t === hot);
          const step =
            e.key === 'ArrowRight' || e.key === 'ArrowDown'
              ? 1
              : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                ? -1
                : 0;
          if (step) {
            e.preventDefault();
            setPin(null);
            setHover(order[(at + step + order.length) % order.length].s.t);
          } else if (e.key === 'Enter' && hot) {
            e.preventDefault();
            onSelectStock?.(hot);
          } else if (e.key === ' ' && hot) {
            e.preventDefault();
            setPin((p) => (p === hot ? null : hot));
          } else if (e.key === 'Escape') {
            setPin(null);
            setHover(null);
          }
        }}
      >
        <svg
          className="shm-svg"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Stock market heatmap, ${tiles.length} stocks, ${gainers} up year to date`}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setHover(null);
          }}
        >
          {labels.map((l) => (
            <text key={l.sector} x={l.x + 4} y={l.y + 13} className="shm-sector">
              {l.sector.toUpperCase()}
            </text>
          ))}
          {tiles.map((t, i) => {
            const on = hot === t.s.t;
            const pinned = pin === t.s.t;
            const dim = hot !== null && !on;
            const big = t.w > 58 && t.h > 36;
            const mid = !big && t.w > 30 && t.h > 18;
            return (
              <motion.g
                key={`${t.s.sector}-${t.s.t}`}
                className="shm-tile"
                onPointerEnter={() => {
                  if (!pin) setHover(t.s.t);
                }}
                onClick={() => onSelectStock?.(t.s.t)}
                initial={{ opacity: reduced ? 1 : 0 }}
                animate={{ opacity: dim ? 0.45 : 1 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: Math.min(i * 0.012, 0.5) }
                }
              >
                <rect
                  x={t.x + 0.5}
                  y={t.y + 0.5}
                  width={Math.max(0, t.w - 1)}
                  height={Math.max(0, t.h - 1)}
                  rx={4}
                  fill={tileFill(t.s.ch)}
                  stroke={
                    on
                      ? t.s.ch >= 0
                        ? GREEN
                        : RED
                      : 'color-mix(in srgb, var(--text-primary) 10%, transparent)'
                  }
                  strokeWidth={pinned ? 2 : on ? 1.5 : 1}
                  strokeDasharray={pinned ? '3 2' : undefined}
                />
                {big ? (
                  <>
                    <text x={t.x + 8} y={t.y + 19} className="shm-sym">
                      {t.s.t}
                    </text>
                    <text x={t.x + 8} y={t.y + 33} className="shm-chg">
                      {fmtSigned(t.s.ch, 1)}
                    </text>
                  </>
                ) : mid ? (
                  <text
                    x={t.x + t.w / 2}
                    y={t.y + t.h / 2 + 3.5}
                    textAnchor="middle"
                    className="shm-sym shm-sym--sm"
                  >
                    {t.s.t}
                  </text>
                ) : null}
              </motion.g>
            );
          })}
        </svg>

        {hotTile && tip ? (
          <div
            ref={tipRef}
            role="status"
            className="shm-tip"
            style={{ width: TIP_W, left: tip.left, top: tip.top }}
          >
            <div className="shm-tip__row">
              <span className="shm-tip__sym">{hotTile.s.t}</span>
              <span className="shm-tip__chg" style={{ color: ink(hotTile.s.ch) }}>
                {fmtSigned(hotTile.s.ch)}
              </span>
            </div>
            <div className="shm-tip__sub">{hotTile.s.sector} · YTD return</div>
            <div className="shm-tip__hint">
              {pin ? 'Pinned · Space to release' : 'Click to open'}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default StockHeatmap;
