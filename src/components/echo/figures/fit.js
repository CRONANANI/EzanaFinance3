/**
 * Text fitting for the Echo SVG figures. SVG text neither wraps nor clips,
 * so every label that can be long or can land near an edge goes through
 * here. Widths are estimates (there is no DOM at render time): JetBrains
 * Mono runs ~0.6em per glyph, the serif/sans faces ~0.52em. The audit script
 * (scripts/check-echo-figures.mjs) measures the real boxes in Chromium, so an
 * estimate that is off shows up there, not on the page.
 */

export const MONO_EM = 0.6;
export const PROSE_EM = 0.52;

/** Estimated rendered width of `text` at `fontSize`, in viewBox units. */
export function textWidth(text, fontSize, { mono = true, letterSpacing = 0 } = {}) {
  const s = String(text ?? '');
  return (
    s.length * fontSize * (mono ? MONO_EM : PROSE_EM) + Math.max(0, s.length - 1) * letterSpacing
  );
}

/**
 * Keep a label inside [min, max]. Returns the x and textAnchor to use: the
 * preferred anchor when it fits, otherwise start at the left edge or end at
 * the right edge. `pad` is the gap kept from the edge.
 */
export function clampLabel(x, width, min, max, prefer = 'middle', pad = 4) {
  const half = width / 2;
  if (prefer === 'middle') {
    if (x - half < min + pad) return { x: min + pad, anchor: 'start' };
    if (x + half > max - pad) return { x: max - pad, anchor: 'end' };
    return { x, anchor: 'middle' };
  }
  if (prefer === 'start') {
    if (x + width > max - pad) return { x: max - pad, anchor: 'end' };
    return { x, anchor: 'start' };
  }
  if (x - width < min + pad) return { x: min + pad, anchor: 'start' };
  return { x, anchor: 'end' };
}

/** The x-range a label occupies given its anchor. */
export function labelSpan(x, width, anchor) {
  if (anchor === 'start') return [x, x + width];
  if (anchor === 'end') return [x - width, x];
  return [x - width / 2, x + width / 2];
}

/** Cut `text` to fit `maxWidth`, with an ellipsis. Never shorter than 4 chars + …. */
export function truncate(text, maxWidth, fontSize, opts) {
  const s = String(text ?? '');
  if (textWidth(s, fontSize, opts) <= maxWidth) return s;
  const per = textWidth('M', fontSize, opts);
  const n = Math.max(4, Math.floor(maxWidth / per) - 1);
  return `${s.slice(0, n).trimEnd()}…`;
}

/**
 * Pack labels into rows so none overlap horizontally. Items carry an
 * x-span [x0, x1]; each takes the first row whose last span ends before its
 * start (minus `gap`). Returns the row index per item, in input order.
 * Rows are capped at `maxRows`; beyond that items cycle, which is still
 * better than every item on one row.
 */
export function packRows(spans, { gap = 10, maxRows = 4 } = {}) {
  const order = spans.map((s, i) => [s, i]).sort((a, b) => a[0][0] - b[0][0]);
  const rowEnds = [];
  const rows = new Array(spans.length).fill(0);
  for (const [[x0, x1], i] of order) {
    let r = rowEnds.findIndex((end) => end + gap <= x0);
    if (r === -1) {
      if (rowEnds.length < maxRows) {
        r = rowEnds.length;
        rowEnds.push(x1);
      } else {
        r = rowEnds.indexOf(Math.min(...rowEnds));
        rowEnds[r] = x1;
      }
    } else rowEnds[r] = x1;
    rows[i] = r;
  }
  return rows;
}

/**
 * Which of n evenly spaced category labels to keep so neighbours do not
 * touch: every k-th, with k the smallest step that fits the widest label.
 */
export function thinStep(labels, bandWidth, fontSize, opts) {
  const widest = Math.max(0, ...labels.map((l) => textWidth(l, fontSize, opts)));
  return Math.max(1, Math.ceil((widest + 12) / Math.max(1, bandWidth)));
}

/**
 * Push a column of labels apart vertically so none overlaps, keeping their
 * order. `ys` are desired centres; returns adjusted centres within [min,max].
 */
export function spreadVertical(ys, minGap, min = -Infinity, max = Infinity) {
  const idx = ys.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(ys.length);
  let last = -Infinity;
  for (const [y, i] of idx) {
    const v = Math.max(y, last + minGap, min);
    out[i] = v;
    last = v;
  }
  /* If the stack ran past max, shift everything up by the overflow. */
  const over = Math.max(...out) - max;
  if (over > 0) for (let i = 0; i < out.length; i++) out[i] -= over;
  return out;
}
