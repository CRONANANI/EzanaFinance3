/**
 * Deterministic re-analysis of stored benchmark results (Nov 28 2026). Pure, no I/O, no
 * model: it reads per-case values already computed by the benchmark's deterministic scorer
 * (or recomputed from saved outputs, docs/sql/SQL_sonar_d4_deterministic_reanalysis.md)
 * and reports paired differences with their uncertainty.
 *
 * Why paired and case-level: every cell of a case saw the same frozen evidence, so the
 * comparison is within case. Verdicts and trials inside one case are not independent
 * (two judges that agree 88% of the time, two trials on the same evidence), so the unit of
 * inference is the case: an exact sign test over cases and a case-resampling bootstrap.
 */

/** Parse "case:cell:v1:v2:...;..." into [{ case, cell, values: { name: number } }]. */
export function parsePacked(packed, names) {
  return String(packed || '')
    .split(';')
    .filter(Boolean)
    .map((row) => {
      const [c, cell, ...vs] = row.split(':');
      const values = {};
      names.forEach((n, k) => {
        values[n] = Number(vs[k]);
      });
      return { case: c, cell, values };
    });
}

/** Per-case differences b - a for one metric (cases present in both cells). */
export function pairedDiffs(rows, a, b, metric) {
  const byCase = new Map();
  for (const r of rows) {
    const e = byCase.get(r.case) || {};
    e[r.cell] = r.values[metric];
    byCase.set(r.case, e);
  }
  const out = [];
  for (const [c, e] of byCase)
    if (Number.isFinite(e[a]) && Number.isFinite(e[b])) out.push({ case: c, diff: e[b] - e[a] });
  return out.sort((x, y) => (x.case < y.case ? -1 : 1));
}

function choose(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i;
  return r;
}

/**
 * Exact two-sided sign test over non-zero differences.
 * -> { up, down, ties, n, p } where p = P(at least as extreme | p = 0.5).
 */
export function signTest(diffs, eps = 1e-9) {
  const up = diffs.filter((d) => d > eps).length;
  const down = diffs.filter((d) => d < -eps).length;
  const n = up + down;
  const k = Math.min(up, down);
  let tail = 0;
  for (let i = 0; i <= k; i += 1) tail += choose(n, i);
  const p = n ? Math.min(1, (2 * tail) / 2 ** n) : 1;
  return { up, down, ties: diffs.length - n, n, p };
}

/** mulberry32: a small seeded generator, so a bootstrap is reproducible. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Percentile bootstrap of the mean over cases (resampling cases), seeded. */
export function bootstrapMean(xs, { iters = 10_000, seed = 20261128, level = 0.95 } = {}) {
  const n = xs.length;
  if (!n) return { mean: null, lo: null, hi: null, n: 0 };
  const mean = xs.reduce((s, v) => s + v, 0) / n;
  const r = rng(seed);
  const means = new Float64Array(iters);
  for (let i = 0; i < iters; i += 1) {
    let s = 0;
    for (let j = 0; j < n; j += 1) s += xs[Math.floor(r() * n)];
    means[i] = s / n;
  }
  means.sort();
  const a = (1 - level) / 2;
  return {
    mean,
    lo: means[Math.floor(a * iters)],
    hi: means[Math.min(iters - 1, Math.ceil((1 - a) * iters) - 1)],
    n,
  };
}

/** One comparison: paired diffs, sign test and bootstrap CI for each metric. */
export function compareCells(rows, a, b, metrics, opts = {}) {
  const out = {};
  for (const m of metrics) {
    const d = pairedDiffs(rows, a, b, m);
    out[m] = {
      cases: d.length,
      sign: signTest(d.map((x) => x.diff)),
      meanDiff: bootstrapMean(
        d.map((x) => x.diff),
        opts,
      ),
    };
  }
  return out;
}
