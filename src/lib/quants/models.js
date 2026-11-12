// src/lib/quants/models.js
// Pure statistical models for the For The Quants Model Library.
// No imports, no I/O: every function takes plain arrays and returns plain
// objects, so scripts/check-quant-models.mjs can test it directly.
// Covered: GARCH(1,1), a three-state Markov chain, PCA on a correlation matrix.

const TRADING_DAYS = 252;

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Daily log returns from an ordered close series. */
export function logReturns(closes) {
  const out = [];
  for (let i = 1; i < closes.length; i += 1) {
    if (closes[i] > 0 && closes[i - 1] > 0) out.push(Math.log(closes[i] / closes[i - 1]));
  }
  return out;
}

/** Annualized volatility from a daily variance. */
export const annualizeVol = (dailyVariance) => Math.sqrt(Math.max(dailyVariance, 0) * TRADING_DAYS);

/* ------------------------------------------------------------------ */
/* GARCH(1,1)                                                           */
/* ------------------------------------------------------------------ */

/* Gaussian negative log likelihood (constants dropped) with variance
   targeting: omega is pinned so the long-run variance equals the sample
   variance, which leaves two free parameters and a well-behaved surface. */
function garchNll(e2, sampleVar, alpha, beta) {
  const omega = sampleVar * (1 - alpha - beta);
  let s2 = sampleVar;
  let nll = 0;
  for (let t = 0; t < e2.length; t += 1) {
    nll += Math.log(s2) + e2[t] / s2;
    s2 = omega + alpha * e2[t] + beta * s2;
  }
  return nll;
}

/**
 * Fit GARCH(1,1) by grid search with two refinement passes.
 * sigma2[t] = omega + alpha * e[t-1]^2 + beta * sigma2[t-1]
 *
 * @param {number[]} returns daily returns, oldest first
 * @param {{ horizon?: number }} [opts]
 * @returns {null | {
 *   n: number, omega: number, alpha: number, beta: number, persistence: number,
 *   halfLifeDays: number | null, atBoundary: boolean,
 *   sampleVol: number, currentVol: number, nextVol: number,
 *   conditionalVol: number[], forecast: { h: number, vol: number }[]
 * }} volatilities are annualized decimals (0.25 = 25%)
 */
export function fitGarch11(returns, opts = {}) {
  const horizon = opts.horizon ?? 20;
  const clean = (returns || []).filter((r) => Number.isFinite(r));
  const n = clean.length;
  if (n < 100) return null;

  const mu = mean(clean);
  const e2 = clean.map((r) => (r - mu) ** 2);
  const sampleVar = mean(e2);
  if (!(sampleVar > 0)) return null;

  const A_MIN = 0.005;
  const A_MAX = 0.4;
  const B_MIN = 0.3;
  const P_MAX = 0.998;

  let best = { alpha: 0.08, beta: 0.9, nll: Infinity };
  const scan = (aLo, aHi, aStep, bLo, bHi, bStep) => {
    for (let a = aLo; a <= aHi + 1e-12; a += aStep) {
      if (a < A_MIN || a > A_MAX) continue;
      for (let b = bLo; b <= bHi + 1e-12; b += bStep) {
        if (b < B_MIN || a + b > P_MAX) continue;
        const nll = garchNll(e2, sampleVar, a, b);
        if (nll < best.nll) best = { alpha: a, beta: b, nll };
      }
    }
  };
  scan(0.01, A_MAX, 0.01, B_MIN, 0.99, 0.01);
  scan(best.alpha - 0.01, best.alpha + 0.01, 0.002, best.beta - 0.01, best.beta + 0.01, 0.002);
  scan(
    best.alpha - 0.002,
    best.alpha + 0.002,
    0.0005,
    best.beta - 0.002,
    best.beta + 0.002,
    0.0005,
  );

  const { alpha, beta } = best;
  const persistence = alpha + beta;
  const omega = sampleVar * (1 - persistence);

  const sigma2 = new Array(n);
  let s2 = sampleVar;
  for (let t = 0; t < n; t += 1) {
    sigma2[t] = s2;
    s2 = omega + alpha * e2[t] + beta * s2;
  }
  const nextVar = s2; // one step ahead of the last observation

  const forecast = [];
  for (let h = 1; h <= horizon; h += 1) {
    const v = sampleVar + persistence ** (h - 1) * (nextVar - sampleVar);
    forecast.push({ h, vol: annualizeVol(v) });
  }

  return {
    n,
    omega,
    alpha,
    beta,
    persistence,
    halfLifeDays: persistence > 0 && persistence < 1 ? Math.log(0.5) / Math.log(persistence) : null,
    atBoundary: persistence >= P_MAX - 0.001 || alpha <= A_MIN + 0.0005,
    sampleVol: annualizeVol(sampleVar),
    currentVol: annualizeVol(sigma2[n - 1]),
    nextVol: annualizeVol(nextVar),
    conditionalVol: sigma2.map(annualizeVol),
    forecast,
  };
}

/* ------------------------------------------------------------------ */
/* Markov chain                                                         */
/* ------------------------------------------------------------------ */

export const MARKOV_MODES = {
  volatility: ['Calm', 'Normal', 'Turbulent'],
  direction: ['Down', 'Flat', 'Up'],
};

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Label each day 0, 1 or 2. volatility: terciles of |r|. direction: +/- half a sigma. */
export function classifyStates(returns, mode = 'volatility') {
  if (mode === 'direction') {
    const mu = mean(returns);
    const sd = Math.sqrt(mean(returns.map((r) => (r - mu) ** 2)));
    const band = 0.5 * sd;
    return returns.map((r) => (r < mu - band ? 0 : r > mu + band ? 2 : 1));
  }
  const abs = returns.map((r) => Math.abs(r));
  const sorted = [...abs].sort((a, b) => a - b);
  const q1 = quantile(sorted, 1 / 3);
  const q2 = quantile(sorted, 2 / 3);
  return abs.map((x) => (x <= q1 ? 0 : x <= q2 ? 1 : 2));
}

/**
 * First-order Markov chain over three daily states.
 * @returns {null | {
 *   n: number, mode: string, states: string[], counts: number[][],
 *   matrix: number[][], stationary: number[], expectedRunDays: (number|null)[],
 *   currentState: number, nextProbabilities: number[],
 *   chiSquare: number, pValue: number, hasMemory: boolean
 * }}
 */
export function markovChain(returns, mode = 'volatility') {
  const clean = (returns || []).filter((r) => Number.isFinite(r));
  if (clean.length < 60) return null;
  const key = MARKOV_MODES[mode] ? mode : 'volatility';
  const states = MARKOV_MODES[key];
  const k = states.length;
  const seq = classifyStates(clean, key);

  const counts = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let t = 1; t < seq.length; t += 1) counts[seq[t - 1]][seq[t]] += 1;

  const rowSum = counts.map((row) => row.reduce((a, b) => a + b, 0));
  const colSum = states.map((_, j) => counts.reduce((a, row) => a + row[j], 0));
  const total = rowSum.reduce((a, b) => a + b, 0);

  const matrix = counts.map((row, i) => row.map((c) => (rowSum[i] > 0 ? c / rowSum[i] : 1 / k)));

  let stationary = new Array(k).fill(1 / k);
  for (let it = 0; it < 500; it += 1) {
    const next = new Array(k).fill(0);
    for (let i = 0; i < k; i += 1)
      for (let j = 0; j < k; j += 1) next[j] += stationary[i] * matrix[i][j];
    stationary = next;
  }

  /* Chi-square test of independence: does yesterday's state change today's
     odds? df = (k-1)^2 = 4, whose survival function has a closed form. */
  let chi = 0;
  for (let i = 0; i < k; i += 1) {
    for (let j = 0; j < k; j += 1) {
      const expected = (rowSum[i] * colSum[j]) / total;
      if (expected > 0) chi += (counts[i][j] - expected) ** 2 / expected;
    }
  }
  const pValue = Math.exp(-chi / 2) * (1 + chi / 2);

  const currentState = seq[seq.length - 1];
  return {
    n: seq.length,
    mode: key,
    states,
    counts,
    matrix,
    stationary,
    expectedRunDays: matrix.map((row, i) => (row[i] < 1 ? 1 / (1 - row[i]) : null)),
    currentState,
    nextProbabilities: matrix[currentState],
    chiSquare: chi,
    pValue,
    hasMemory: pValue < 0.05,
  };
}

/* ------------------------------------------------------------------ */
/* PCA                                                                  */
/* ------------------------------------------------------------------ */

/** Pearson correlation matrix of equally long return series. */
export function correlationMatrix(series) {
  const k = series.length;
  const n = Math.min(...series.map((s) => s.length));
  const z = series.map((s) => {
    const xs = s.slice(0, n);
    const mu = mean(xs);
    const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mu) ** 2, 0));
    return xs.map((x) => (sd > 0 ? (x - mu) / sd : 0));
  });
  const m = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i += 1) {
    for (let j = i; j < k; j += 1) {
      let dot = 0;
      for (let t = 0; t < n; t += 1) dot += z[i][t] * z[j][t];
      m[i][j] = i === j ? 1 : dot;
      m[j][i] = m[i][j];
    }
  }
  return m;
}

/** Cyclic Jacobi eigendecomposition of a symmetric matrix. */
export function jacobiEigen(input) {
  const k = input.length;
  const a = input.map((row) => [...row]);
  const v = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)),
  );
  for (let sweep = 0; sweep < 100; sweep += 1) {
    let off = 0;
    for (let p = 0; p < k; p += 1) for (let q = p + 1; q < k; q += 1) off += a[p][q] ** 2;
    if (off < 1e-20) break;
    for (let p = 0; p < k; p += 1) {
      for (let q = p + 1; q < k; q += 1) {
        if (Math.abs(a[p][q]) < 1e-15) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let r = 0; r < k; r += 1) {
          const arp = a[r][p];
          const arq = a[r][q];
          a[r][p] = c * arp - s * arq;
          a[r][q] = s * arp + c * arq;
        }
        for (let r = 0; r < k; r += 1) {
          const apr = a[p][r];
          const aqr = a[q][r];
          a[p][r] = c * apr - s * aqr;
          a[q][r] = s * apr + c * aqr;
        }
        for (let r = 0; r < k; r += 1) {
          const vrp = v[r][p];
          const vrq = v[r][q];
          v[r][p] = c * vrp - s * vrq;
          v[r][q] = s * vrp + c * vrq;
        }
      }
    }
  }
  return { values: a.map((row, i) => row[i]), vectors: v }; // vectors[row][component]
}

/**
 * Principal components of a correlation matrix.
 * @returns {{ explained: number[], components: { index: number, eigenvalue: number,
 *   explained: number, loadings: number[] }[] }} loadings follow the input order
 */
export function pcaFromCorrelation(matrix, maxComponents = 3) {
  const k = matrix.length;
  const { values, vectors } = jacobiEigen(matrix);
  const order = values.map((val, i) => ({ val, i })).sort((x, y) => y.val - x.val);
  const total = order.reduce((a, o) => a + Math.max(o.val, 0), 0) || 1;
  const all = order.map((o, rank) => {
    let loadings = vectors.map((row) => row[o.i]);
    /* Eigenvector sign is arbitrary: orient each so its loadings sum positive. */
    if (loadings.reduce((s, x) => s + x, 0) < 0) loadings = loadings.map((x) => -x);
    return {
      index: rank + 1,
      eigenvalue: Math.max(o.val, 0),
      explained: Math.max(o.val, 0) / total,
      loadings,
    };
  });
  return {
    explained: all.map((c) => c.explained),
    components: all.slice(0, Math.min(maxComponents, k)),
  };
}

/**
 * Keep only the dates every ticker traded, so return series line up.
 * @param {{ date: string, close: number }[][]} candleSets oldest first
 * @returns {{ dates: string[], closes: number[][] }}
 */
export function alignCloses(candleSets) {
  if (!candleSets.length) return { dates: [], closes: [] };
  const maps = candleSets.map((set) => new Map(set.map((c) => [c.date, c.close])));
  const dates = [...maps[0].keys()].filter((d) => maps.every((m) => m.has(d))).sort();
  return { dates, closes: maps.map((m) => dates.map((d) => m.get(d))) };
}
