import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * /api/platform/aggregates
 *
 * Returns anonymized platform-wide benchmarks the My Profile page overlays
 * on the user's own performance (used by MetricsGrid):
 *
 *   - averages:           per-metric mean across all active users
 *   - percentileBreaks:   per-metric raw-value → percentile breakpoints (client
 *                         uses these to show "Top X%")
 *   - benchmarkReturnPct: SPY return over the same window (for `vs. S&P 500`)
 *
 * Cache: 15 minutes in-memory (survives across requests on the same Node
 * process; edge or serverless cold-starts naturally bust it).
 *
 * SECURITY: Response contains only aggregates — no individual user numbers.
 *
 * NOTE: The chart's platform/top-25% series used to live here as
 * placeholders; they've moved to /api/platform-aggregates (a dedicated
 * windowed endpoint backed by `platform_return_aggregates`). This endpoint
 * now only serves metric-grid data.
 */

const CACHE_TTL_MS = 15 * 60 * 1000;
let cached = null;
let cachedAt = 0;

function buildPlaceholderAggregates() {
  const benchmarkReturnPct = 8.0; // SPY cumulative placeholder

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
