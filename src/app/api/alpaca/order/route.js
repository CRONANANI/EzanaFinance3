/**
 * POST /api/alpaca/order — Place order
 * GET /api/alpaca/order — List orders
 * DELETE /api/alpaca/order — Cancel order(s)
 */
import { NextResponse } from 'next/server';
import { alpacaRequest, alpaca } from '@/lib/alpaca';
import { placeOrderOnce, readIdempotencyKey } from '@/lib/trading/idempotent';
import { assertAlpacaAccountOwner } from '@/lib/trading/account-guard';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard } from '@/lib/api-guard';
import { checkRateLimit } from '@/lib/persistent-rate-limit';
import { validateOrder, checkOrderVelocity } from '@/lib/trading/order-validation';

export const dynamic = 'force-dynamic';

async function getAlpacaAccountId(supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin
    .from('alpaca_accounts')
    .select('alpaca_account_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.alpaca_account_id;
}

async function postOrder(request, user) {
  const idempotencyKey = readIdempotencyKey(request);
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'Idempotency-Key header (a UUID) is required' },
      { status: 400 },
    );
  }
  try {
    const supabaseAdmin = getAdminClient();

    const accountId = await getAlpacaAccountId(supabaseAdmin, user.id);
    if (!accountId) return NextResponse.json({ error: 'No brokerage account' }, { status: 404 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    /* F-17: enums, symbol, size caps and per-user velocity before the broker. */
    const checked = validateOrder(body);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
    const orderPayload = checked.order;
    const tooFast = await checkOrderVelocity(user.id, { checkRateLimit });
    if (tooFast) return NextResponse.json({ error: tooFast }, { status: 429 });

    /* The stored account id must be this user's at Alpaca (F-03). */
    await assertAlpacaAccountOwner(alpaca, accountId, user);

    const { order, row, replay } = await placeOrderOnce(
      { admin: supabaseAdmin, alpaca },
      { userId: user.id, accountId, idempotencyKey, orderBody: orderPayload },
    );

    if (replay) {
      /* Same Idempotency-Key as an earlier submit: report that order. */
      return NextResponse.json({
        success: row?.status !== 'submit_failed',
        replay: true,
        orderId: row?.alpaca_order_id || null,
        symbol: row?.symbol,
        side: row?.side,
        qty: row?.qty,
        notional: row?.notional,
        status: row?.status,
      });
    }

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
      { status: error.status || 500 },
    );
  }
}

async function getOrders(request, user) {
  try {
    const supabaseAdmin = getAdminClient();

    const accountId = await getAlpacaAccountId(supabaseAdmin, user.id);
    if (!accountId) return NextResponse.json({ error: 'No brokerage account' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const status = ['open', 'closed', 'all'].includes(searchParams.get('status'))
      ? searchParams.get('status')
      : 'all';
    const limit = String(Math.min(500, Math.max(1, parseInt(searchParams.get('limit'), 10) || 50)));

    const orders = await alpacaRequest(
      `/v1/trading/accounts/${accountId}/orders?status=${status}&limit=${limit}&direction=desc`,
    );

    return NextResponse.json({
      orders: Array.isArray(orders)
        ? orders.map((o) => ({
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
          }))
        : [],
    });
  } catch (error) {
    console.error('[Alpaca] Orders fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function deleteOrders(request, user) {
  try {
    const supabaseAdmin = getAdminClient();

    const accountId = await getAlpacaAccountId(supabaseAdmin, user.id);
    if (!accountId) return NextResponse.json({ error: 'No brokerage account' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    if (orderId && !/^[0-9a-f-]{36}$/i.test(orderId)) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
    }

    if (orderId) {
      await alpacaRequest(`/v1/trading/accounts/${accountId}/orders/${orderId}`, {
        method: 'DELETE',
      });
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

export const POST = withApiGuard(postOrder, { requireAuth: true, strict: true });
export const GET = withApiGuard(getOrders, { requireAuth: true, strict: true });
export const DELETE = withApiGuard(deleteOrders, { requireAuth: true, strict: true });
