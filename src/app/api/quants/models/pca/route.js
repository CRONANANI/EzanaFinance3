import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { cleanTickers, loadCloses } from '@/lib/quants/model-data';
import {
  logReturns,
  alignCloses,
  correlationMatrix,
  pcaFromCorrelation,
} from '@/lib/quants/models';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOOKBACK_DAYS = 400;
const MIN_RETURNS = 60;

/**
 * POST /api/quants/models/pca  { tickers: string[] }
 * Principal components of the daily return correlation matrix (3 to 10 tickers).
 */
export const POST = withApiGuard(
  async (request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const requested = cleanTickers(body?.tickers, 10);
      if (requested.length < 3) {
        return NextResponse.json({ error: 'Enter at least 3 tickers' }, { status: 400 });
      }

      const loaded = await Promise.all(
        requested.map(async (t) => ({ ticker: t, candles: await loadCloses(t, LOOKBACK_DAYS) })),
      );
      const usable = loaded.filter((l) => l.candles.length > MIN_RETURNS);
      const skipped = loaded.filter((l) => l.candles.length <= MIN_RETURNS).map((l) => l.ticker);
      if (usable.length < 3) {
        return NextResponse.json({ error: 'Not enough valid price data' }, { status: 422 });
      }

      const { dates, closes } = alignCloses(usable.map((u) => u.candles));
      const series = closes.map(logReturns);
      const observations = Math.min(...series.map((s) => s.length));
      if (observations < MIN_RETURNS) {
        return NextResponse.json(
          { error: 'These tickers do not share enough trading days' },
          { status: 422 },
        );
      }

      const tickers = usable.map((u) => u.ticker);
      const pca = pcaFromCorrelation(correlationMatrix(series), 3);

      return NextResponse.json(
        {
          tickers,
          skipped,
          asOf: dates[dates.length - 1],
          observations,
          explained: pca.explained,
          components: pca.components.map((c) => ({
            index: c.index,
            explained: c.explained,
            loadings: tickers.map((t, i) => ({ ticker: t, value: c.loadings[i] })),
          })),
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/models/pca' });
    }
  },
  { requireAuth: true, strict: true },
);
