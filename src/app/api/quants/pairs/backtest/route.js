import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getDailyOhlcv } from '@/lib/prices/daily-bars';
import { backtestPair, normalizePairParams } from '@/lib/quants/statarb';
import { cleanTicker } from '@/lib/quants/strategy-spec';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { headers: { 'Cache-Control': 'private, no-store' } };

/**
 * POST /api/quants/pairs/backtest  { tickerA, tickerB, years?, params? }
 *
 * Backtests one pair. The first part of the window fixes the hedge ratio and
 * runs the cointegration test; only the rest is traded. Nothing is stored.
 */
export const POST = withApiGuard(
  async (request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const tickerA = cleanTicker(body?.tickerA);
      const tickerB = cleanTicker(body?.tickerB);
      if (!tickerA || !tickerB) {
        return NextResponse.json({ error: 'Two tickers required' }, { status: 400 });
      }
      if (tickerA === tickerB) {
        return NextResponse.json({ error: 'Choose two different tickers' }, { status: 400 });
      }
      const { params, errors } = normalizePairParams(body?.params || {});
      if (errors.length) {
        return NextResponse.json({ error: errors[0], details: errors }, { status: 400 });
      }
      const years = Math.min(Math.max(Math.round(Number(body?.years) || 4), 2), 10);
      const to = new Date().toISOString().slice(0, 10);
      const from = `${Number(to.slice(0, 4)) - years}${to.slice(4)}`;
      const [a, b] = await Promise.all([
        getDailyOhlcv(tickerA, from, to),
        getDailyOhlcv(tickerB, from, to),
      ]);
      let result;
      try {
        result = backtestPair({ tickerA, tickerB, barsA: a.bars, barsB: b.bars, params });
      } catch (err) {
        /* The engine's refusals are written for the user. */
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'The pair could not be backtested' },
          { status: 422, ...NO_STORE },
        );
      }
      return NextResponse.json({ tickerA, tickerB, years, ...result }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/pairs backtest' });
    }
  },
  { requireAuth: true, strict: true },
);
