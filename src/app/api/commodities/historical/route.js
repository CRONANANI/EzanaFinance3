import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { fetchCommodityHistory, TRACKED_COMMODITIES } from '@/lib/kairos/commodity-prices';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/commodities/historical?symbol=CL=F&from=2020-01-01&to=2024-12-31
 */
export async function GET(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    if (!symbol || !fromDate || !toDate) {
      return NextResponse.json({ error: 'symbol, from, to required (YYYY-MM-DD)' }, { status: 400 });
    }

    const tracked = TRACKED_COMMODITIES.find((c) => c.symbol === symbol);
    if (!tracked) {
      return NextResponse.json(
        { error: `Symbol must be one of: ${TRACKED_COMMODITIES.map((c) => c.symbol).join(', ')}` },
        { status: 400 }
      );
    }

    const prices = await fetchCommodityHistory(symbol, fromDate, toDate);
    return NextResponse.json({
      symbol,
      name: tracked.name,
      from: fromDate,
      to: toDate,
      count: prices.length,
      prices,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
