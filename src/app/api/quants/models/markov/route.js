import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { cleanTicker, loadCloses } from '@/lib/quants/model-data';
import { logReturns, markovChain, MARKOV_MODES } from '@/lib/quants/models';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOOKBACK_DAYS = 365 * 3;
const MIN_RETURNS = 120;

/**
 * POST /api/quants/models/markov  { ticker, mode: 'volatility' | 'direction' }
 * Three-state transition matrix on three years of daily closes.
 */
export const POST = withApiGuard(
  async (request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const ticker = cleanTicker(body?.ticker);
      if (!ticker) return NextResponse.json({ error: 'Enter a valid ticker' }, { status: 400 });
      const mode = MARKOV_MODES[body?.mode] ? body.mode : 'volatility';

      const candles = await loadCloses(ticker, LOOKBACK_DAYS);
      const returns = logReturns(candles.map((c) => c.close));
      if (returns.length < MIN_RETURNS) {
        return NextResponse.json(
          { error: `Not enough price history for ${ticker}.` },
          { status: 422 },
        );
      }

      const chain = markovChain(returns, mode);
      if (!chain)
        return NextResponse.json({ error: 'The model could not be fitted' }, { status: 422 });

      return NextResponse.json(
        {
          ticker,
          asOf: candles[candles.length - 1].date,
          observations: chain.n,
          mode: chain.mode,
          states: chain.states,
          matrix: chain.matrix,
          counts: chain.counts,
          stationary: chain.stationary,
          expectedRunDays: chain.expectedRunDays,
          currentState: chain.currentState,
          nextProbabilities: chain.nextProbabilities,
          chiSquare: chain.chiSquare,
          pValue: chain.pValue,
          hasMemory: chain.hasMemory,
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/models/markov' });
    }
  },
  { requireAuth: true, strict: true },
);
