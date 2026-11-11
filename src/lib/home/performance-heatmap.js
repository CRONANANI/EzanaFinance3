/**
 * Home: "Top performers" heat map in the My Portfolio band (Nov 2026).
 *
 * Pure helpers, no React: rank the user's own positions by return, lay the
 * best ones out as a squarified treemap (tile area = position value) and
 * pick each tile's colour strength from its return. Tested by
 * scripts/check-performance-heatmap.mjs.
 *
 * A position: { ticker, name, value, totalPct, dayPct } where totalPct is the
 * return against cost (or since bought) and dayPct today's move. Either may
 * be null when unknown; unknown returns are never ranked.
 */

export const HEATMAP_METRICS = [
  { id: 'total', label: 'All time' },
  { id: 'day', label: 'Today' },
];
export const HEATMAP_MAX_TILES = 8;

const fin = (v) => typeof v === 'number' && Number.isFinite(v);
const pctOf = (p, metric) => (metric === 'day' ? p.dayPct : p.totalPct);

/**
 * The best performers for a metric: positions with a known return and a
 * positive value, highest return first, at most `max`. One row per ticker
 * (values add up, the return is value-weighted).
 */
export function topPerformers(positions, metric = 'total', max = HEATMAP_MAX_TILES) {
  const byTicker = new Map();
  for (const p of positions || []) {
    const pct = pctOf(p, metric);
    if (!p?.ticker || !fin(p.value) || p.value <= 0 || !fin(pct)) continue;
    const t = String(p.ticker).toUpperCase();
    const cur = byTicker.get(t);
    if (!cur) byTicker.set(t, { ticker: t, name: p.name || '', value: p.value, pct });
    else {
      const value = cur.value + p.value;
      byTicker.set(t, { ...cur, value, pct: (cur.pct * cur.value + pct * p.value) / value });
    }
  }
  return [...byTicker.values()]
    .sort((a, b) => b.pct - a.pct || b.value - a.value || a.ticker.localeCompare(b.ticker))
    .slice(0, max);
}

/* ------------------------------------------------------------------ */
/* Squarified treemap (Bruls, Huizing, van Wijk)                        */
/* ------------------------------------------------------------------ */

function worst(row, side) {
  const s = row.reduce((a, r) => a + r.area, 0);
  const max = Math.max(...row.map((r) => r.area));
  const min = Math.min(...row.map((r) => r.area));
  return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
}

/**
 * Lay items ({ value, ... }) into a width x height box. Returns the items
 * with { x, y, w, h } in the same units, largest first. Areas are exactly
 * proportional to value and the tiles cover the box without overlap.
 */
export function squarify(items, width = 100, height = 100) {
  const total = (items || []).reduce((a, i) => a + (fin(i.value) && i.value > 0 ? i.value : 0), 0);
  if (!total || width <= 0 || height <= 0) return [];
  const scale = (width * height) / total;
  const queue = items
    .filter((i) => fin(i.value) && i.value > 0)
    .map((i) => ({ ...i, area: i.value * scale }))
    .sort((a, b) => b.area - a.area);

  const out = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let row = [];

  const layRow = () => {
    const sum = row.reduce((a, r) => a + r.area, 0);
    if (w >= h) {
      // Column on the left, full height.
      const cw = sum / h;
      let yy = y;
      for (const r of row) {
        const rh = r.area / cw;
        out.push({ ...r, x, y: yy, w: cw, h: rh });
        yy += rh;
      }
      x += cw;
      w -= cw;
    } else {
      // Row on top, full width.
      const rh = sum / w;
      let xx = x;
      for (const r of row) {
        const rw = r.area / rh;
        out.push({ ...r, x: xx, y, w: rw, h: rh });
        xx += rw;
      }
      y += rh;
      h -= rh;
    }
    row = [];
  };

  for (const item of queue) {
    const side = Math.min(w, h);
    if (!row.length || worst([...row, item], side) <= worst(row, side)) row.push(item);
    else {
      layRow();
      row.push(item);
    }
  }
  if (row.length) layRow();
  return out.map(({ area, ...r }) => r);
}

/* ------------------------------------------------------------------ */
/* Colour                                                              */
/* ------------------------------------------------------------------ */

/**
 * Tile tone and strength (0..1) from its return relative to the biggest
 * move shown, so the best performer is always the strongest tile. A flat
 * return is neutral.
 */
export function tileTone(pct, maxAbs) {
  if (!fin(pct) || pct === 0) return { tone: 'flat', strength: 0 };
  const m = fin(maxAbs) && maxAbs > 0 ? maxAbs : Math.abs(pct);
  const strength = Math.min(1, Math.abs(pct) / m);
  return { tone: pct > 0 ? 'up' : 'down', strength };
}

/** The colour-mix percentage for a strength: 22% (faint) to 78% (full). */
export const mixPct = (strength) => Math.round(22 + 56 * Math.max(0, Math.min(1, strength)));

/** Light text on strong tiles, dark text on faint ones. */
export const onStrong = (strength) => strength >= 0.55;

export const fmtSignedPct = (v) =>
  fin(v) ? `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(2)}%` : 'N/A';

/** Tile layout plus colour for the component. Coordinates in percent. */
export function heatmapTiles(positions, metric = 'total', max = HEATMAP_MAX_TILES) {
  const top = topPerformers(positions, metric, max);
  const maxAbs = Math.max(0, ...top.map((t) => Math.abs(t.pct)));
  return squarify(top, 100, 100).map((t) => ({ ...t, ...tileTone(t.pct, maxAbs) }));
}
