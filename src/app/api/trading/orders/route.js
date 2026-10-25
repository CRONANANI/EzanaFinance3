import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard } from '@/lib/api-guard';
import { alpaca } from '@/lib/alpaca';
import { placeOrderOnce, readIdempotencyKey } from '@/lib/trading/idempotent';
import { assertAlpacaAccountOwner } from '@/lib/trading/account-guard';
import { awardXP } from '@/lib/rewards';

export const dynamic = 'force-dynamic';

/**
 * POST /api/trading/orders: place one real order per Idempotency-Key.
 * See src/lib/trading/idempotent.js for the claim-then-submit pattern.
 */
export const POST = withApiGuard(
  async (request, user) => {
    const idempotencyKey = readIdempotencyKey(request);
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Idempotency-Key header (a UUID) is required' },
        { status: 400 },
      );
    }
    try {
      const body = await request.json();
      const { symbol, qty, notional, side, type = 'market', time_in_force = 'day' } = body;
      const admin = getAdminClient();

      let account = null;
      const { data: br, error: brErr } = await admin
        .from('brokerage_accounts')
        .select('alpaca_account_id, account_status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (brErr) throw brErr;
      if (br?.alpaca_account_id) account = br;
      if (!account) {
        const { data: leg, error: legErr } = await admin
          .from('alpaca_accounts')
          .select('alpaca_account_id, account_status')
          .eq('user_id', user.id)
          .maybeSingle();
        if (legErr) throw legErr;
        if (leg) account = leg;
      }

      if (!account || !['ACTIVE', 'APPROVED'].includes(account.account_status)) {
        return NextResponse.json({ error: 'No active brokerage account' }, { status: 400 });
      }
      if (!symbol || !['buy', 'sell'].includes(String(side).toLowerCase())) {
        return NextResponse.json({ error: 'symbol and side are required' }, { status: 400 });
      }

      const orderBody = {
        symbol: String(symbol).toUpperCase(),
        side: String(side).toLowerCase(),
        type,
        time_in_force,
      };
      if (notional != null && notional !== '') orderBody.notional = String(notional);
      else if (qty != null && qty !== '') orderBody.qty = String(qty);
      else {
        return NextResponse.json({ error: 'Either qty or notional is required' }, { status: 400 });
      }

      /* The stored account id must be this user's at Alpaca (F-03). */
      await assertAlpacaAccountOwner(alpaca, account.alpaca_account_id, user);

      const { order, row, replay } = await placeOrderOnce(
        { admin, alpaca },
        { userId: user.id, accountId: account.alpaca_account_id, idempotencyKey, orderBody },
      );

      if (!replay) {
        try {
          await awardXP(
            user.id,
            30,
            'Placed a trade',
            'trading',
            `trade:${row?.id || idempotencyKey}`,
          );
        } catch (e) {
          console.error('orders: awardXP', e);
        }
      }

      return NextResponse.json({ success: true, replay, order, row });
    } catch (error) {
      console.error('Order error:', error);
      return NextResponse.json(
        { error: error.message || 'Order failed' },
        { status: error.status || 500 },
      );
    }
  },
  { requireAuth: true, strict: true },
);
