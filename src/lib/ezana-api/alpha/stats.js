/**
 * Alpha Intelligence statistics: small, pure, deterministic estimators shared
 * by every alpha signal (tested by scripts/check-ezana-api-alpha.mjs, including
 * synthetic null data so a signal cannot claim structure that is not there).
 *
 * Conventions:
 *   - Missing input is null, never 0. Every function returns null rather than a
 *     number when the estimate is undefined (empty sample, zero spread).
 *   - Robust z uses the median and the median absolute deviation scaled by
 *     1.4826, so it matches a standard z on normal data and ignores outliers in
 *     the baseline.
 */

const finite = (v) => v != null && v !== '' && Number.isFinite(Number(v));
const clean = (xs) => (xs || []).filter(finite).map(Number);

/** Median of the finite values, or null. */
export function median(xs) {
  const s = clean(xs).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median absolute deviation (unscaled), or null. */
export function mad(xs) {
  const m = median(xs);
  if (m == null) return null;
  return median(clean(xs).map((v) => Math.abs(v - m)));
}

export const MAD_SCALE = 1.4826;

/**
 * Robust z of `value` against `baseline`: (value - median) / (1.4826 * MAD).
 * Null when the baseline has fewer than `minN` points or no spread (MAD 0):
 * a flat history cannot say how unusual a change is.
 */
export function robustZ(value, baseline, { minN = 3 } = {}) {
  const b = clean(baseline);
  if (!finite(value) || b.length < minN) return null;
  const d = mad(b);
  if (!d) return null;
  return (Number(value) - median(b)) / (MAD_SCALE * d);
}

/**
 * Empirical percentile of `value` within `sample`, 0 to 100, mid-rank for
 * ties: the share of the sample below the value plus half of the ties.
 */
export function percentileRank(value, sample) {
  const s = clean(sample);
  if (!finite(value) || !s.length) return null;
  const v = Number(value);
  let below = 0;
  let equal = 0;
  for (const x of s) {
    if (x < v) below += 1;
    else if (x === v) equal += 1;
  }
  return (100 * (below + equal / 2)) / s.length;
}

/**
 * Symmetric ("arc") growth: (cur - prev) / ((|cur| + |prev|) / 2), bounded in
 * [-2, 2]. Defined when one side is zero (entry is +2, exit is -2), which a
 * log or simple percent change is not. Null when both are zero or missing.
 */
export function arcGrowth(cur, prev) {
  if (!finite(cur) || !finite(prev)) return null;
  const c = Number(cur);
  const p = Number(prev);
  const den = (Math.abs(c) + Math.abs(p)) / 2;
  if (!den) return null;
  return Math.max(-2, Math.min(2, (c - p) / den));
}

/**
 * Herfindahl-Hirschman index of positive weights, 0 to 1 (1 = everything in
 * one bucket). Non-positive weights are ignored. Null when nothing is positive.
 */
export function hhi(weights) {
  const w = clean(weights).filter((v) => v > 0);
  const total = w.reduce((a, b) => a + b, 0);
  if (!total) return null;
  return w.reduce((a, v) => a + (v / total) ** 2, 0);
}

/* ── calibration ─────────────────────────────────────────────────────
   A robust z from a short baseline is NOT standard normal: with 8 annual
   points the MAD is a noisy scale and |z| > 3 happens about 7% of the time on
   pure noise (15% with 5 points). These helpers turn a z into a calibrated
   tail probability for its baseline length, and correct for testing many
   companies at once. */

/* Seeded standard normals (LCG + Box-Muller): the null is identical on every
   server and every run. */
function normals(seed) {
  let s = seed >>> 0;
  const u = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s + 0.5) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

const NULL_SIMS = 20000;
const nullCache = new Map();

/** Sorted |robust z| of a fresh point against `n` i.i.d. normal points. */
function robustZNull(n) {
  if (!nullCache.has(n)) {
    const g = normals(1000 + n);
    const out = [];
    while (out.length < NULL_SIMS) {
      const base = Array.from({ length: n }, g);
      const z = robustZ(g(), base, { minN: n });
      if (z != null) out.push(Math.abs(z));
    }
    nullCache.set(
      n,
      out.sort((a, b) => a - b),
    );
  }
  return nullCache.get(n);
}

/**
 * Two-sided probability that |robust z| reaches `z` by chance when the
 * baseline and the new value are i.i.d. normal, for a baseline of `n` points
 * (simulated, 20,000 draws, floored at 1 / 20,001). Null for n < 3.
 */
export function nullExceedance(z, n) {
  if (!finite(z) || !Number.isInteger(n) || n < 3) return null;
  const sims = robustZNull(n);
  const a = Math.abs(Number(z));
  let lo = 0;
  let hi = sims.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sims[mid] < a) lo = mid + 1;
    else hi = mid;
  }
  return (1 + sims.length - lo) / (1 + sims.length);
}

/**
 * Exchangeability rank p-value, one-sided: the chance a new value is at least
 * this extreme if it were just another draw from the same years. Assumes no
 * distribution; the smallest attainable value is 1 / (n + 1).
 */
export function rankPValue(value, baseline, direction = 'up') {
  const b = clean(baseline);
  if (!finite(value) || !b.length) return null;
  const v = Number(value);
  const hits = b.filter((x) => (direction === 'down' ? x <= v : x >= v)).length;
  return (1 + hits) / (1 + b.length);
}

/** Benjamini-Hochberg q-values for p-values (nulls stay null), same order. */
export function benjaminiHochberg(ps) {
  const idx = ps
    .map((p, i) => [p, i])
    .filter(([p]) => finite(p))
    .sort((a, b) => a[0] - b[0]);
  const m = idx.length;
  const q = new Array(ps.length).fill(null);
  let running = 1;
  for (let k = m - 1; k >= 0; k -= 1) {
    const [p, i] = idx[k];
    running = Math.min(running, (p * m) / (k + 1));
    q[i] = running;
  }
  return q;
}

/** Round to `d` decimals, keeping null. */
export function round(v, d = 4) {
  if (!finite(v)) return null;
  const k = 10 ** d;
  return Math.round(Number(v) * k) / k;
}
