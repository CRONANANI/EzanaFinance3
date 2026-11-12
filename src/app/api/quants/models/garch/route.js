import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { cleanTicker, loadCloses } from '@/lib/quants/model-data';
import { logReturns, fitGarch11 } from '@/lib/quants/models';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOOKBACK_DAYS = 365 * 3;
const MIN_RETURNS = 250;
const CHART_POINTS = 250;

/**
 * POST /api/quants/models/garch  { ticker }
 * GARCH(1,1) volatility fit and 20-day forecast on three years of daily closes.
 */
export const POST = withApiGuard(
  async (request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const ticker = cleanTicker(body?.ticker);
      if (!ticker) return NextResponse.json({ error: 'Enter a valid ticker' }, { status: 400 });

      const candles = await loadCloses(ticker, LOOKBACK_DAYS);
      const returns = logReturns(candles.map((c) => c.close));
      if (returns.length < MIN_RETURNS) {
        return NextResponse.json(
          {
            error: `Not enough price history for ${ticker}. GARCH needs about a year of daily data.`,
          },
          { status: 422 },
        );
      }

      const fit = fitGarch11(returns);
      if (!fit)
        return NextResponse.json({ error: 'The model could not be fitted' }, { status: 422 });

      /* candles[i + 1] is the day returns[i] was realized. */
      const dates = candles.slice(1).map((c) => c.date);
      const start = Math.max(0, fit.conditionalVol.length - CHART_POINTS);
      const series = fit.conditionalVol
        .slice(start)
        .map((vol, i) => ({ date: dates[start + i], vol }));

      return NextResponse.json(
        {
          ticker,
          asOf: candles[candles.length - 1].date,
          observations: fit.n,
          alpha: fit.alpha,
          beta: fit.beta,
          persistence: fit.persistence,
          halfLifeDays: fit.halfLifeDays,
          atBoundary: fit.atBoundary,
          sampleVol: fit.sampleVol,
          currentVol: fit.currentVol,
          nextVol: fit.nextVol,
          series,
          forecast: fit.forecast,
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/models/garch' });
    }
  },
  { requireAuth: true, strict: true },
);
