import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard } from '@/lib/api-guard';
import { alpaca } from '@/lib/alpaca';
import { placeOrderOnce, readIdempotencyKey } from '@/lib/trading/idempotent';
import { assertAlpacaAccountOwner } from '@/lib/trading/account-guard';
import { awardXP } from '@/lib/rewards';
import { checkRateLimit } from '@/lib/persistent-rate-limit';
import { validateOrder, checkOrderVelocity } from '@/lib/trading/order-validation';

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
      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
      /* F-17: enums, symbol, size caps before anything else. */
      const checked = validateOrder(body);
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
      const orderBody = checked.order;
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
      const tooFast = await checkOrderVelocity(user.id, { checkRateLimit });
      if (tooFast) return NextResponse.json({ error: tooFast }, { status: 429 });

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
