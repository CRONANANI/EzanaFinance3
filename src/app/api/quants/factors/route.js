import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { FACTORS, buildPanel, factorStudy } from '@/lib/quants/factors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { headers: { 'Cache-Control': 'private, no-store' } };
/** Postgres and PostgREST codes for "that function or table does not exist". */
const NOT_SET_UP = new Set(['PGRST202', '42883', '42P01']);

/**
 * GET /api/quants/factors?factor=momentum_12_1&years=5&groups=5
 *
 * One factor study over the fixed Quant Lab universe, from stored month-end
 * closes. Read-only; nothing is written.
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      const params = new URL(request.url).searchParams;
      const factor = String(params.get('factor') || 'momentum_12_1');
      if (!FACTORS[factor]) {
        return NextResponse.json({ error: 'Unknown factor' }, { status: 400 });
      }
      const years = Math.min(Math.max(Math.round(Number(params.get('years')) || 5), 2), 10);
      const groups = Math.min(Math.max(Math.round(Number(params.get('groups')) || 5), 3), 10);

      const today = new Date().toISOString().slice(0, 10);
      /* The study window plus the factor's own lookback, and a month of margin. */
      const lookbackMonths = FACTORS[factor].lookback + 2;
      const from = new Date(Date.now() - (years * 366 + lookbackMonths * 31) * 86400000)
        .toISOString()
        .slice(0, 10);

      const { data, error } = await getUserClient().rpc('quant_universe_month_ends', {
        p_from: from,
      });
      if (error) {
        if (NOT_SET_UP.has(error.code)) {
          return NextResponse.json({ empty: true, reason: 'not_set_up' }, NO_STORE);
        }
        return safeErrorResponse(error, { context: 'quants/factors read' });
      }
      const series = data && typeof data === 'object' ? data : {};
      const panel = buildPanel(series, today.slice(0, 7));
      const tickers = Object.keys(panel.closes).length;
      if (!tickers || panel.months.length < FACTORS[factor].lookback + 3) {
        return NextResponse.json(
          { empty: true, reason: 'no_prices', tickers, months: panel.months.length },
          NO_STORE,
        );
      }
      const study = factorStudy({ panel, factor, groups, months: years * 12 });
      if (study.empty) {
        return NextResponse.json(
          { empty: true, reason: 'too_few', tickers, months: panel.months.length },
          NO_STORE,
        );
      }
      return NextResponse.json(
        {
          ...study,
          summary: FACTORS[factor].summary,
          years,
          universe: { tickers, firstMonth: panel.months[0] },
        },
        NO_STORE,
      );
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/factors' });
    }
  },
  { requireAuth: true },
);
