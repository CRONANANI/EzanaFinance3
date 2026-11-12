import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getDailyOhlcv } from '@/lib/prices/daily-bars';
import { analyzePair } from '@/lib/quants/statarb';
import { cleanTicker } from '@/lib/quants/strategy-spec';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { headers: { 'Cache-Control': 'private, no-store' } };

/**
 * POST /api/quants/pairs  { tickerA, tickerB, days? }
 *
 * Tests one pair for cointegration (Engle-Granger) over the last `days`
 * shared trading sessions and reports where the spread stands. A signal is
 * only ever returned for a pair that passes the test.
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
      const days = Math.min(Math.max(Number(body?.days) || 504, 250), 1260);
      /* Trading days to calendar days, plus a holiday margin. */
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - Math.ceil(days * 1.5 + 10) * 86400000)
        .toISOString()
        .slice(0, 10);
      const [a, b] = await Promise.all([
        getDailyOhlcv(tickerA, from, to),
        getDailyOhlcv(tickerB, from, to),
      ]);
      const result = analyzePair({
        tickerA,
        tickerB,
        barsA: a.bars.slice(-days),
        barsB: b.bars.slice(-days),
      });
      if (!result.ok) {
        return NextResponse.json(
          {
            error:
              result.reason === 'too_short'
                ? 'These two do not share enough price history to test.'
                : 'The relationship between these two could not be estimated.',
          },
          { status: 404 },
        );
      }
      return NextResponse.json({ tickerA, tickerB, ...result }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/pairs' });
    }
  },
  { requireAuth: true },
);
