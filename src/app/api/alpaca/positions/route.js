/**
 * GET /api/alpaca/positions — Get holdings
 * DELETE /api/alpaca/positions — Close position(s)
 */
import { NextResponse } from 'next/server';
import { alpacaRequest } from '@/lib/alpaca';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';


async function getAlpacaAccountId(userId) {
  const { data } = await supabaseAdmin
    .from('alpaca_accounts')
    .select('alpaca_account_id')
    .eq('user_id', userId)
    .single();
  return data?.alpaca_account_id;
}

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accountId = await getAlpacaAccountId(user.id);
    if (!accountId) return NextResponse.json({ error: 'No brokerage account' }, { status: 404 });

    const positions = await alpacaRequest(`/v1/trading/accounts/${accountId}/positions`);
    const account = await alpacaRequest(`/v1/accounts/${accountId}`);

    const formattedPositions = (Array.isArray(positions) ? positions : []).map((p) => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      side: p.side,
      marketValue: parseFloat(p.market_value),
      costBasis: parseFloat(p.cost_basis),
      unrealizedPL: parseFloat(p.unrealized_pl),
      unrealizedPLPercent: parseFloat(p.unrealized_plpc || 0) * 100,
      currentPrice: parseFloat(p.current_price),
      avgEntryPrice: parseFloat(p.avg_entry_price),
      changeToday: parseFloat(p.change_today || 0) * 100,
      assetClass: p.asset_class,
    }));

    const totalValue = formattedPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalPL = formattedPositions.reduce((sum, p) => sum + p.unrealizedPL, 0);
    const totalCost = formattedPositions.reduce((sum, p) => sum + p.costBasis, 0);

    return NextResponse.json({
      positions: formattedPositions,
      account: {
        equity: parseFloat(account.equity || 0),
        cash: parseFloat(account.cash || 0),
        buyingPower: parseFloat(account.buying_power || 0),
        portfolioValue: parseFloat(account.portfolio_value || 0),
      },
      summary: {
        totalMarketValue: totalValue,
        totalCostBasis: totalCost,
        totalUnrealizedPL: totalPL,
        totalUnrealizedPLPercent: totalCost > 0 ? (totalPL / totalCost) * 100 : 0,
        positionCount: formattedPositions.length,
      },
    });
  } catch (error) {
    console.error('[Alpaca] Positions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accountId = await getAlpacaAccountId(user.id);
    if (!accountId) return NextResponse.json({ error: 'No brokerage account' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (symbol) {
      const result = await alpacaRequest(
        `/v1/trading/accounts/${accountId}/positions/${symbol.toUpperCase()}`,
        { method: 'DELETE' }
      );
      return NextResponse.json({ success: true, closed: symbol, order: result });
    } else {
      const result = await alpacaRequest(
        `/v1/trading/accounts/${accountId}/positions`,
        { method: 'DELETE' }
      );
      return NextResponse.json({ success: true, closed: 'all', orders: result });
    }
  } catch (error) {
    console.error('[Alpaca] Close position error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
