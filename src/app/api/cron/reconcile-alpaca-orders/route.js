/**
 * Every 15 minutes: repair orders and ACH transfers left in
 * `pending_submit` (the Alpaca call timed out or the row update failed).
 * Orders are looked up by client_order_id; transfers are matched by
 * relationship, amount and direction. See src/lib/trading/idempotent.js.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { alpaca } from '@/lib/alpaca';
import { isCronAuthorized } from '@/lib/cron/auth';
import { withCronLock } from '@/lib/cron/with-cron-lock';
import { reconcilePendingOrders, reconcilePendingTransfers } from '@/lib/trading/idempotent';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return withCronLock('reconcile-alpaca-orders', 300, async () => {
    const admin = getAdminClient();
    const orders = await reconcilePendingOrders({ admin, alpaca });
    const transfers = await reconcilePendingTransfers({ admin, alpaca });
    return NextResponse.json({ ok: true, orders, transfers });
  });
}
