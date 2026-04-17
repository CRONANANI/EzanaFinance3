import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * /api/platform/aggregates
 *
 * Returns anonymized platform-wide benchmarks the My Profile page overlays
 * on the user's own performance:
 *
 *   - averages:           per-metric mean across all active users
 *   - percentileBreaks:   per-metric raw-value → percentile breakpoints (client
 *                         uses these to show "Top X%")
 *   - performanceSeries:  [{date, platform}]  platform-avg cumulative return
 *   - cohortSeries:       [{date, cohort}]    top-25% cohort cumulative return
 *   - benchmarkReturnPct: SPY return over the same window (for `vs. S&P 500`)
 *
 * Cache: 15 minutes in-memory (survives across requests on the same Node
 * process; edge or serverless cold-starts naturally bust it).
 *
 * SECURITY: Response contains only aggregates — no individual user numbers.
 *
 * NOTE: When a real aggregation job is in place it should drop its snapshot
 * here by replacing `buildPlaceholderAggregates()`. Until then, this returns
 * stable, realistic baselines so the profile UI isn't empty.
 */

const CACHE_TTL_MS = 15 * 60 * 1000;
let cached = null;
let cachedAt = 0;

function buildSeries(endReturn, points, noise) {
  const series = [];
  const today = new Date();
  for (let i = 0; i < points; i += 1) {
    const t = i / Math.max(1, points - 1);
    const base = endReturn * t;
    const wob =
      Math.sin(i * 0.22 + 0.5) * noise +
      Math.sin(i * 0.13 + 2.1) * (noise * 0.5);
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - (points - 1 - i));
    series.push({
      date: d.toISOString().slice(0, 10),
      value: Number((base + wob).toFixed(3)),
    });
  }
  if (series.length) series[series.length - 1].value = Number(endReturn.toFixed(3));
  return series;
}

function buildPlaceholderAggregates() {
  const platformEnd = 6.2; // % cumulative return — placeholder baseline
  const cohortEnd = 18.4;
  const benchmarkReturnPct = 8.0; // SPY cumulative placeholder

  const platform = buildSeries(platformEnd, 30, 0.8).map((p) => ({
    date: p.date,
    platform: p.value,
  }));
  const cohort = buildSeries(cohortEnd, 30, 1.6).map((p) => ({
    date: p.date,
    cohort: p.value,
  }));

  return {
    generatedAt: new Date().toISOString(),
    benchmarkReturnPct,
    averages: {
      totalReturn: 6.2,
      vsSP500: -1.8,
      consistency: 58,
      diversification: 55,
      holdingDiscipline: 62,
      contributionStreak: 3,
    },
    // Lookup tables — each row is [rawValue, percentile]. Used client-side
    // for an approximate percentile rank.
    percentileBreaks: {
      totalReturn: [[-30, 5], [0, 25], [6, 50], [15, 75], [30, 90], [60, 99]],
      vsSP500: [[-20, 5], [-5, 25], [0, 50], [5, 75], [15, 90], [30, 99]],
      consistency: [[0, 5], [40, 25], [58, 50], [72, 75], [86, 90], [100, 99]],
      diversification: [[0, 5], [30, 25], [55, 50], [75, 75], [90, 90], [100, 99]],
      holdingDiscipline: [[0, 5], [15, 25], [62, 50], [150, 75], [365, 90], [1000, 99]],
      contributionStreak: [[0, 10], [1, 30], [3, 50], [6, 75], [12, 90], [24, 99]],
    },
    performanceSeries: platform,
    cohortSeries: cohort,
  };
}

export async function GET() {
  const now = Date.now();
  if (!cached || now - cachedAt > CACHE_TTL_MS) {
    cached = buildPlaceholderAggregates();
    cachedAt = now;
  }
  return NextResponse.json(cached, {
    headers: {
      'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=300',
    },
  });
}
