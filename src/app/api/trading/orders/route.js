import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { alpaca } from '@/lib/alpaca';
import { supabaseAdmin } from '@/lib/plaid';
import { awardXP } from '@/lib/rewards';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      symbol,
      qty,
      notional,
      side,
      type = 'market',
      time_in_force = 'day',
    } = body;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                /* ignore */
              }
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let account = null;
    const { data: br } = await supabaseAdmin
      .from('brokerage_accounts')
      .select('alpaca_account_id, account_status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (br) account = br;
    if (!account) {
      const { data: leg } = await supabaseAdmin
        .from('alpaca_accounts')
        .select('alpaca_account_id, account_status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (leg) account = leg;
    }

    if (!account || !['ACTIVE', 'APPROVED'].includes(account.account_status)) {
      return NextResponse.json({ error: 'No active brokerage account' }, { status: 400 });
    }

    const orderBody = {
      symbol: String(symbol).toUpperCase(),
      side: String(side).toLowerCase(),
      type,
      time_in_force,
    };

    if (notional != null && notional !== '') {
      orderBody.notional = String(notional);
    } else if (qty != null && qty !== '') {
      orderBody.qty = String(qty);
    } else {
      return NextResponse.json({ error: 'Either qty or notional is required' }, { status: 400 });
    }

    const order = await alpaca.post(
      `/v1/trading/accounts/${account.alpaca_account_id}/orders`,
      orderBody
    );

    await supabaseAdmin.from('trade_history').insert({
      user_id: user.id,
      alpaca_order_id: order.id,
      symbol: order.symbol,
      side: order.side,
      qty: order.qty != null ? String(order.qty) : null,
      notional: order.notional != null ? String(order.notional) : null,
      order_type: order.type,
      status: order.status,
    });

    try {
      await awardXP(user.id, 30, 'Placed a trade', 'trading');
    } catch (e) {
      console.error('orders: awardXP', e);
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Order error:', error);
    return NextResponse.json(
      { error: error.message || 'Order failed' },
      { status: error.status || 500 }
    );
  }
}
