/**
 * Pure stats helpers — Pearson, approximate two-tailed p-value, quintile means.
 */

export function pearson(xs, ys) {
  if (!Array.isArray(xs) || !Array.isArray(ys)) return null;
  if (xs.length !== ys.length || xs.length < 10) return null;

  const n = xs.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
    sumY2 += ys[i] * ys[i];
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return null;
  return num / den;
}

export function pValueForPearson(r, n) {
  if (r == null || n < 3) return null;
  if (Math.abs(r) >= 0.9999) return 0;

  const df = n - 2;
  const t = (r * Math.sqrt(df)) / Math.sqrt(1 - r * r);

  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  const beta = incompleteBeta(x, a, b);
  return Math.max(0, Math.min(1, beta));
}

function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(x, a, b)) / a;
  }
  return 1 - (bt * betacf(1 - x, b, a)) / b;
}

function betacf(x, a, b) {
  const MAXIT = 100;
  const EPS = 3e-7;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function logGamma(x) {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let t = x + 5.5;
  t -= (x + 0.5) * Math.log(t);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += cof[j] / ++y;
  return -t + Math.log((2.5066282746310005 * ser) / x);
}

export function quintileConditionalMeans(xs, ys) {
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length || xs.length < 10) {
    return { topQuintileMean: null, bottomQuintileMean: null };
  }

  const pairs = xs.map((x, i) => [x, ys[i]]).sort((a, b) => a[0] - b[0]);
  const cutoff = Math.floor(pairs.length * 0.2);
  if (cutoff < 1) return { topQuintileMean: null, bottomQuintileMean: null };

  const bottom = pairs.slice(0, cutoff);
  const top = pairs.slice(-cutoff);

  const meanBottom = bottom.reduce((s, p) => s + p[1], 0) / bottom.length;
  const meanTop = top.reduce((s, p) => s + p[1], 0) / top.length;

  return { topQuintileMean: meanTop, bottomQuintileMean: meanBottom };
}
