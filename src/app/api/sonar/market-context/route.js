import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getDailyBars } from '@/lib/prices/daily-bars';
import { isMarketSymbol } from '@/lib/sonar/market-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* About 13 months of closes: enough for every daily range tab (1Y and YTD). */
const LOOKBACK_DAYS = 400;

const iso = (t) => new Date(t).toISOString().slice(0, 10);

/**
 * GET /api/sonar/market-context?symbol=NVDA&benchmark=SOXX
 *
 * The Market Context card in the Sonar research workspace's Desk Summary (Nov 13 2026):
 * daily closes for one listed company and its benchmark, through the shared price helper
 * (getDailyBars). Public like the Sonar ping it serves (guests read answers too), rate
 * limited by the guard, briefly cached in the browser only. The card does all the maths
 * (lib/sonar/market-context.js); this route returns closes, nothing derived.
 *
 * 200 { symbol, benchmark, subject: [{ date, close }], bench: [{ date, close }], asOf, currency }
 *     subject is [] when no price came back (the card says so; it never draws a placeholder)
 * 400 for a symbol that is not a ticker.
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const symbol = String(searchParams.get('symbol') || '')
        .trim()
        .toUpperCase();
      const benchmark = String(searchParams.get('benchmark') || '')
        .trim()
        .toUpperCase();
      if (!isMarketSymbol(symbol) || (benchmark && !isMarketSymbol(benchmark))) {
        return NextResponse.json({ error: 'Invalid symbol.' }, { status: 400 });
      }
      const from = iso(Date.now() - LOOKBACK_DAYS * 86400000);
      const [s, b] = await Promise.all([
        getDailyBars(symbol, from),
        benchmark && benchmark !== symbol
          ? getDailyBars(benchmark, from)
          : Promise.resolve({ candles: [] }),
      ]);
      const pick = (rows) =>
        (rows || [])
          .filter((r) => r?.date && Number.isFinite(Number(r.close)))
          .map((r) => ({ date: String(r.date).slice(0, 10), close: Number(r.close) }));
      const subject = pick(s?.candles);
      const bench = pick(b?.candles);
      return NextResponse.json(
        {
          symbol,
          benchmark: benchmark || null,
          subject,
          bench,
          asOf: subject.length ? subject[subject.length - 1].date : null,
          currency: 'USD',
        },
        {
          headers: {
            'Cache-Control': subject.length ? 'private, max-age=300' : 'no-store',
          },
        },
      );
    } catch (err) {
      return safeErrorResponse(err, {
        message: 'Market data is not available right now.',
        context: 'sonar/market-context',
      });
    }
  },
  { requireAuth: false, strict: true },
);
