import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { runWithFmpSample, sampleMode } from '@/lib/market-sample';
import { DATA_STATE_HEADER } from '@/lib/market-sample/state';

/**
 * GET /api/market-data/sample-status
 * { state: 'live' | 'sample' | 'unavailable', mode } for THIS request, decided on the server
 * (deployment, verified session, provider answer). At most one FMP probe per 10 minutes per
 * instance while FMP refuses; the client keeps the answer for 5 minutes.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request) => {
    const key = process.env.FMP_API_KEY || '';
    if (!key) return NextResponse.json({ state: 'unavailable', mode: sampleMode() });
    const { state } = await runWithFmpSample(
      async () => {
        try {
          await fetch(
            `https://financialmodelingprep.com/stable/quote?symbol=SPY&apikey=${encodeURIComponent(key)}`,
            { cache: 'no-store' },
          );
        } catch {
          /* network failure: not a provider refusal */
        }
      },
      { request },
    );
    return NextResponse.json(
      { state, mode: sampleMode() },
      { headers: { 'cache-control': 'no-store', [DATA_STATE_HEADER]: state } },
    );
  },
  { requireAuth: false },
);
