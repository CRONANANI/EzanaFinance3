import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getDailyBars } from '@/lib/prices/daily-bars';
import { alignCloses, correlationMatrix } from '@/lib/quants/models';
import { cleanTickers } from '@/lib/quants/model-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_TICKERS = 10;
/** Fewer shared sessions than this and a correlation is noise, not a reading. */
const MIN_OBSERVATIONS = 20;

/**
 * POST /api/quants/correlation  { tickers: string[], days?: number }
 *
 * Pearson correlation of daily returns. The series are joined on DATE first:
 * a return is used only for sessions every ticker traded, so a holiday, a
 * halt or a recent listing in one name can never pair one ticker's Monday
 * with another's Tuesday.
 */
export const POST = withApiGuard(
  async (request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const tickers = cleanTickers(body?.tickers).slice(0, MAX_TICKERS);
      const days = Math.min(Math.max(Number(body?.days) || 90, 20), 365);
      if (tickers.length < 2) {
        return NextResponse.json({ error: 'At least 2 tickers required' }, { status: 400 });
      }

      /* Trading days to calendar days, plus a holiday margin. */
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - Math.ceil(days * 1.5 + 10) * 86400000)
        .toISOString()
        .slice(0, 10);
      const loaded = await Promise.all(
        tickers.map(async (t) => {
          try {
            return [t, (await getDailyBars(t, from, to)).candles || []];
          } catch {
            return [t, []];
          }
        }),
      );
      const usable = loaded.filter(([, c]) => c.length > MIN_OBSERVATIONS);
      const skipped = loaded.filter(([, c]) => c.length <= MIN_OBSERVATIONS).map(([t]) => t);
      if (usable.length < 2) {
        return NextResponse.json({ error: 'Not enough valid price data' }, { status: 404 });
      }

      const aligned = alignCloses(usable.map(([, c]) => c));
      /* Keep the most recent `days` shared sessions (days returns need days + 1 closes). */
      const keep = Math.min(aligned.dates.length, days + 1);
      const dates = aligned.dates.slice(-keep);
      const returns = aligned.closes.map((series) => {
        const closes = series.slice(-keep);
        const out = [];
        for (let i = 1; i < closes.length; i += 1) out.push(closes[i] / closes[i - 1] - 1);
        return out;
      });
      const observations = returns[0]?.length || 0;
      if (observations < MIN_OBSERVATIONS) {
        return NextResponse.json(
          { error: 'These tickers do not share enough trading sessions to compare' },
          { status: 404 },
        );
      }

      const corr = correlationMatrix(returns);
      const valid = usable.map(([t]) => t);
      const matrix = {};
      valid.forEach((a, i) => {
        matrix[a] = {};
        valid.forEach((b, j) => {
          const v = corr[i]?.[j];
          matrix[a][b] = i === j ? 1 : Number.isFinite(v) ? Number(v.toFixed(4)) : null;
        });
      });

      return NextResponse.json(
        {
          tickers: valid,
          matrix,
          days,
          observations,
          from: dates[1] ?? dates[0] ?? null,
          to: dates[dates.length - 1] ?? null,
          skipped,
        },
        /* Signed-in, per-request data: never in a shared CDN cache. */
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/correlation' });
    }
  },
  { requireAuth: true },
);
