import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';
import { replayTradesToValueSeries, clipPointsToRange } from '@/lib/portfolio-trade-replay';
import { fetchBatchedHistoricalPrices } from '@/lib/fmp-historical-batched';

export const dynamic = 'force-dynamic';

const RANGES = new Set(['1M', '6M', '1Y', 'ALL']);

/**
 * GET /api/portfolio/mock-value-series?range=1M|6M|1Y|ALL
 *
 * Returns the user's mock portfolio value over time via trade-replay reconstruction.
 */
export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestedRange = req.nextUrl.searchParams.get('range');
    const range = RANGES.has(requestedRange) ? requestedRange : 'ALL';

    const { data: portfolioRow } = await supabaseAdmin
      .from('mock_portfolios')
      .select('portfolio, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!portfolioRow?.portfolio) {
      return NextResponse.json({ range, points: [], source: 'no-portfolio' });
    }

    const currentCash = Number(portfolioRow.portfolio?.cash) || 0;
    const currentValue = computeCurrentValue(portfolioRow.portfolio);

    if (currentValue <= 0) {
      return NextResponse.json({ range, points: [], source: 'empty-portfolio' });
    }

    const { data: trades, error: tradesError } = await supabaseAdmin
      .from('mock_trades')
      .select('ticker, quantity, price, trade_type, total_amount, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (tradesError) {
      console.error('[mock-value-series] mock_trades error', tradesError);
    }

    const tradeList = Array.isArray(trades) ? trades : [];
    const portfolioCreatedAt = portfolioRow.updated_at || null;

    const replay = await replayTradesToValueSeries({
      trades: tradeList,
      currentCash,
      currentValue,
      portfolioCreatedAt,
      fetchHistoricalPrices: fetchBatchedHistoricalPrices,
    });

    const points = clipPointsToRange(replay.points, range);

    if (points.length < 2 && replay.points.length >= 2) {
      return NextResponse.json({
        range: 'ALL',
        requested_range: range,
        points: replay.points,
        source: replay.source,
        startedAt: replay.startedAt,
        note: `Less than ${range} of history available — showing all data since portfolio creation`,
      });
    }

    return NextResponse.json({
      range,
      points,
      source: replay.source,
      startedAt: replay.startedAt,
    });
  } catch (e) {
    console.error('[mock-value-series] failed', e);
    return NextResponse.json({ error: e?.message ?? 'Unknown', points: [] }, { status: 500 });
  }
}

function computeCurrentValue(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') return 0;
  const cash = Number(portfolio.cash) || 0;
  const positions = portfolio.positions;
  if (!positions || typeof positions !== 'object') return Math.max(0, cash);

  let positionsValue = 0;
  const iterate = Array.isArray(positions) ? positions : Object.values(positions);
  for (const p of iterate) {
    const q = Number(p?.shares ?? p?.qty ?? 0) || 0;
    const pr = Number(p?.currentPrice ?? p?.lastPrice ?? p?.avgCost ?? 0) || 0;
    positionsValue += q * pr;
  }
  return Math.max(0, cash + positionsValue);
}
