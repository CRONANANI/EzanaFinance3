/**
 * Squarified treemap layout (Bruls, Huizing and van Wijk), shared by the US Equities stock
 * heatmap and the Sonar investment universe heatmap (Nov 28 2026), so the app keeps one
 * treemap implementation. Pure; items keep their order, largest first gives the best ratios.
 */

function worst(row, side, area) {
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = area * area;
  const l2 = side * side;
  return Math.max((l2 * max) / s2, s2 / (l2 * min));
}

/** Squarified treemap of `items` ({ weight }) into the rect x, y, w, h. */
export function squarify(items, x, y, w, h) {
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
