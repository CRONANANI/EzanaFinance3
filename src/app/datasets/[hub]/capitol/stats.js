/**
 * Correlation statistics for the lobbying and contracts tab. Pure; the tab
 * recomputes them in the browser from the rows on screen, so excluding name
 * matches or switching the window always agrees with the table.
 */
/* Relative, not @/, so the node test runner can import this module too. */
import { pValueForPearson } from '../../../../lib/kairos/correlations.js';

export function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i += 1) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (!vx || !vy) return null;
  return cov / Math.sqrt(vx * vy);
}

/** Average ranks, ties sharing the mean of their positions (1-based). */
export function ranks(values) {
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j += 1;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) out[order[k][1]] = avg;
    i = j + 1;
  }
  return out;
}

export const spearman = (xs, ys) => pearson(ranks(xs), ranks(ys));

/** A plain-language reading of |r|. */
export function strength(r) {
  if (r == null) return 'not enough companies to measure';
  const a = Math.abs(r);
  const dir = r > 0 ? 'positive' : 'negative';
  if (a < 0.1) return 'essentially no linear relationship';
  if (a < 0.3) return `a weak ${dir} relationship`;
  if (a < 0.5) return `a moderate ${dir} relationship`;
  return `a strong ${dir} relationship`;
}

/**
 * Lobbying dollars (x) against award dollars (y) over rows with both > 0:
 * { n, r, r2, rho, logR, p, reading }.
 */
export function lobbyingStats(rows) {
  const pts = rows.filter((r) => r.lobbying > 0 && r.awardValue > 0);
  const xs = pts.map((r) => r.lobbying);
  const ys = pts.map((r) => r.awardValue);
  const n = pts.length;
  const r = pearson(xs, ys);
  const logR = pearson(
    xs.map((v) => Math.log10(v)),
    ys.map((v) => Math.log10(v)),
  );
  return {
    n,
    r,
    r2: r == null ? null : r * r,
    rho: spearman(xs, ys),
    logR,
    p: r == null ? null : pValueForPearson(r, n),
    reading: strength(r),
  };
}
