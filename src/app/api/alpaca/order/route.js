/**
 * POST /api/alpaca/order — Place order
 * GET /api/alpaca/order — List orders
 * DELETE /api/alpaca/order — Cancel order(s)
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

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accountId = await getAlpacaAccountId(user.id);
    if (!accountId) return NextResponse.json({ error: 'No brokerage account' }, { status: 404 });

    const body = await request.json();
    const { symbol, side, type, timeInForce, qty, notional, limitPrice, stopPrice, trailPercent } = body;

    if (!symbol || !side) {
      return NextResponse.json({ error: 'symbol and side are required' }, { status: 400 });
    }

    const orderPayload = {
      symbol: symbol.toUpperCase(),
      side: side,
      type: type || 'market',
      time_in_force: timeInForce || 'day',
    };

    if (notional) {
      orderPayload.notional = notional.toString();
    } else if (qty) {
      orderPayload.qty = qty.toString();
    } else {
      return NextResponse.json({ error: 'Either qty or notional is required' }, { status: 400 });
    }

    if (limitPrice) orderPayload.limit_price = limitPrice.toString();
    if (stopPrice) orderPayload.stop_price = stopPrice.toString();
    if (trailPercent) orderPayload.trail_percent = trailPercent.toString();

    const order = await alpacaRequest(`/v1/trading/accounts/${accountId}/orders`, {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      qty: order.qty,
      notional: order.notional,
      status: order.status,
      filledAvgPrice: order.filled_avg_price,
      filledQty: order.filled_qty,
      submittedAt: order.submitted_at,
    });
  } catch (error) {
    console.error('[Alpaca] Order error:', error);
    return NextResponse.json(
      { error: 'Order failed', details: error.details || error.message },
      { status: error.status || 500 }
    );
  }
}

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accountId = await getAlpacaAccountId(user.id);
    if (!accountId) return NextResponse.json({ error: 'No brokerage account' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = searchParams.get('limit') || '50';

    const orders = await alpacaRequest(
      `/v1/trading/accounts/${accountId}/orders?status=${status}&limit=${limit}&direction=desc`
    );

    return NextResponse.json({
      orders: Array.isArray(orders) ? orders.map((o) => ({
        id: o.id,
        symbol: o.symbol,
        side: o.side,
        type: o.type,
        qty: o.qty,
        notional: o.notional,
        filledQty: o.filled_qty,
        filledAvgPrice: o.filled_avg_price,
        status: o.status,
        submittedAt: o.submitted_at,
        filledAt: o.filled_at,
        canceledAt: o.canceled_at,
      })) : [],
    });
  } catch (error) {
    console.error('[Alpaca] Orders fetch error:', error);
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
    const orderId = searchParams.get('orderId');

    if (orderId) {
      await alpacaRequest(`/v1/trading/accounts/${accountId}/orders/${orderId}`, { method: 'DELETE' });
      return NextResponse.json({ success: true, canceled: orderId });
    } else {
      await alpacaRequest(`/v1/trading/accounts/${accountId}/orders`, { method: 'DELETE' });
      return NextResponse.json({ success: true, canceled: 'all' });
    }
  } catch (error) {
    console.error('[Alpaca] Cancel order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
