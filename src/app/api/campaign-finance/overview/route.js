import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  CF_CYCLES,
  CF_DEFAULT_CYCLE,
  getCampaignFinanceOverview,
} from '@/lib/campaign-finance/load';

/**
 * GET /api/campaign-finance/overview?cycle=2026
 *
 * The Campaign Finance Intelligence page's aggregate payload for one cycle:
 * per-member figures for the leaderboard plus every party, chamber, median,
 * contribution-size, spending-purpose and outside-money roll-up, computed on
 * the server (lib/campaign-finance/aggregate.js). The page server-renders the
 * default cycle; this route serves cycle switches. Empty, never sample data.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const rl = await checkRateLimit(`cf:overview:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);
  const raw = Number(new URL(request.url).searchParams.get('cycle')) || CF_DEFAULT_CYCLE;
  const cycle = CF_CYCLES.includes(raw) ? raw : CF_DEFAULT_CYCLE;
  const data = await getCampaignFinanceOverview(cycle);
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
