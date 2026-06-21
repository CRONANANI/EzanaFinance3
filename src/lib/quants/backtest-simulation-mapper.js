// src/lib/quants/backtest-simulation-mapper.js
// Derives animation-ready datasets for the For The Quants simulation visuals.
// READ-ONLY consumer of shared mock data. Does NOT mutate any imported object.
// Per Quantitative_Trading_System_Skill_Updated.md: mock → heuristic → statistical
// graduation path. This is deterministic mock visualization only — no live data.

// Seeded PRNG (mulberry32) so every render is deterministic and reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller normal draw (return distribution sampling).
function randNormal(rng, mean = 0, std = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Probability Lattice: one point per simulated trade.
 * x = replay order, y = trade P&L, plus a P&L histogram.
 */
export function buildProbabilityLattice({
  seed = 7,
  trades = 5944,
  edge = 0.011,
  vol = 0.018,
} = {}) {
  const rng = mulberry32(seed);
  const sampleN = Math.min(trades, 1200);
  const points = [];
  let wins = 0;
  let cum = 0;
  for (let i = 0; i < sampleN; i++) {
    const pnl = randNormal(rng, edge, vol);
    if (pnl > 0) wins++;
    cum += pnl;
    points.push({ id: i, seq: i / sampleN, pnl, win: pnl > 0, cum });
  }
  const bins = 28;
  const min = Math.min(...points.map((p) => p.pnl));
  const max = Math.max(...points.map((p) => p.pnl));
  const hist = new Array(bins).fill(0);
  points.forEach((p) => {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor(((p.pnl - min) / (max - min)) * bins)));
    hist[idx]++;
  });
  return {
    points,
    histogram: hist.map((count, i) => {
      const x0 = min + (i / bins) * (max - min);
      return { i, count, x0, positive: x0 > 0 };
    }),
    stats: { totalTrades: trades, winRate: wins / sampleN, allTimePnl: cum, sampleN },
  };
}

/**
 * Tail Probability Ridge: N stacked return-distribution curves ("strike landscape").
 */
export function buildTailRidge({ seed = 13, ridges = 22, resolution = 80 } = {}) {
  const rng = mulberry32(seed);
  const lanes = [];
  for (let r = 0; r < ridges; r++) {
    const drift = (r / ridges) * 0.6 - 0.3;
    const spread = 0.8 + rng() * 0.5;
    const curve = [];
    for (let x = 0; x < resolution; x++) {
      const t = (x / resolution) * 6 - 3;
      const body = Math.exp(-0.5 * ((t - drift) / spread) ** 2);
      const tail = 0.18 * Math.exp(-0.5 * ((t - drift - 2.2) / 0.6) ** 2);
      curve.push({ x: x / resolution, y: body + tail });
    }
    lanes.push({ lane: r, drift, curve });
  }
  return { lanes, ridges, resolution };
}

/**
 * Relationship Graph: force-graph nodes (signals/clusters) + weighted edges.
 */
export function buildRelationshipGraph({ seed = 21, nodes = 26 } = {}) {
  const rng = mulberry32(seed);
  const kinds = ['buy', 'sell', 'hub', 'catalyst'];
  const ns = Array.from({ length: nodes }, (_, i) => {
    const kind = i === 0 ? 'hub' : kinds[Math.floor(rng() * kinds.length)];
    return {
      id: `n${i}`,
      kind,
      weight: 0.3 + rng() * 0.7,
      x: 0.5 + (rng() - 0.5) * 0.6,
      y: 0.5 + (rng() - 0.5) * 0.6,
    };
  });
  const edges = [];
  for (let i = 1; i < nodes; i++) {
    const target = Math.floor(rng() * i);
    edges.push({ source: `n${i}`, target: `n${target}`, weight: 0.2 + rng() * 0.8 });
  }
  return {
    nodes: ns,
    edges,
    stats: { confluence: 0.974, pBull: 0.8, pBear: 0.2, edgesInBook: 296 },
  };
}
