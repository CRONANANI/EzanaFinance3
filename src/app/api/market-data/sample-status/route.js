import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { fmpRefusedRecently, runWithFmpSample } from '@/lib/market-sample';

/**
 * GET /api/market-data/sample-status (temporary, Nov 28 2026)
 * { sample: true } while FMP refuses Ezana's key and the equities and asset pages are
 * showing sample values (lib/market-sample). One FMP probe at most per 10 minutes per
 * instance; the client keeps the answer for 5 minutes.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async () => {
    if (fmpRefusedRecently()) return NextResponse.json({ sample: true });
    const key = process.env.FMP_API_KEY || '';
    if (!key) return NextResponse.json({ sample: false });
    const { sample } = await runWithFmpSample(async () => {
      try {
        await fetch(
          `https://financialmodelingprep.com/stable/quote?symbol=SPY&apikey=${encodeURIComponent(key)}`,
          { cache: 'no-store' },
        );
      } catch {
        /* network failure: not a billing refusal */
      }
    });
    return NextResponse.json(
      { sample: sample || fmpRefusedRecently() },
      { headers: { 'cache-control': 'no-store' } },
    );
  },
  { requireAuth: false },
);
