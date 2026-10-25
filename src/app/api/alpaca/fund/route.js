/**
 * POST /api/alpaca/fund — Link bank or initiate transfer
 * GET /api/alpaca/fund — Get ACH relationships and transfers
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { alpacaRequest, alpaca } from '@/lib/alpaca';
import { getAdminClient } from '@/lib/supabase';
import { createTransferOnce, readIdempotencyKey } from '@/lib/trading/idempotent';
import { assertAlpacaAccountOwner } from '@/lib/trading/account-guard';

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

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const supabaseAdmin = getAdminClient();

      const accountId = await getAlpacaAccountId(supabaseAdmin, user.id);
      if (!accountId)
        return NextResponse.json({ error: 'No brokerage account found' }, { status: 404 });

      /* The stored account id must be this user's at Alpaca (F-03). */
      await assertAlpacaAccountOwner(alpaca, accountId, user);

      const body = await request.json();

      if (body.action === 'link_bank') {
        const relationship = await alpacaRequest(`/v1/accounts/${accountId}/ach_relationships`, {
          method: 'POST',
          body: JSON.stringify({
            processor_token: body.processorToken,
          }),
        });

        return NextResponse.json({
          success: true,
          relationshipId: relationship.id,
          status: relationship.status,
          bankName: relationship.bank_name,
          accountMask: relationship.account_mask || null,
        });
      }

      if (body.action === 'transfer') {
        const idempotencyKey = readIdempotencyKey(request);
        if (!idempotencyKey) {
          return NextResponse.json(
            { error: 'Idempotency-Key header (a UUID) is required' },
            { status: 400 },
          );
        }
        const amount = Math.round(Number(body.amount) * 100) / 100;
        const direction = String(body.direction || 'INCOMING').toUpperCase();
        if (!body.relationshipId || !Number.isFinite(amount) || amount <= 0) {
          return NextResponse.json(
            { error: 'relationshipId and amount required' },
            { status: 400 },
          );
        }
        if (!['INCOMING', 'OUTGOING'].includes(direction)) {
          return NextResponse.json({ error: 'Invalid direction' }, { status: 400 });
        }
        const { transfer, row, replay } = await createTransferOnce(
          { admin: supabaseAdmin, alpaca },
          {
            userId: user.id,
            accountId,
            idempotencyKey,
            relationshipId: body.relationshipId,
            amount,
            direction,
          },
        );

        return NextResponse.json({
          success: (transfer?.status || row?.status) !== 'submit_failed',
          replay,
          transferId: transfer?.id || row?.alpaca_transfer_id || null,
          status: transfer?.status || row?.status,
          amount: transfer?.amount ?? row?.amount,
          direction: transfer?.direction || row?.direction,
        });
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
      console.error('[Alpaca] Funding error:', error);
      return NextResponse.json(
        { error: 'Funding operation failed', details: error.details || error.message },
        { status: error.status || 500 },
      );
    }
  },
  { requireAuth: true },
);

export const GET = withApiGuard(
  async (request, user) => {
    try {
      const supabaseAdmin = getAdminClient();

      const accountId = await getAlpacaAccountId(supabaseAdmin, user.id);
      if (!accountId) return NextResponse.json({ error: 'No brokerage account' }, { status: 404 });

      const relationships = await alpacaRequest(`/v1/accounts/${accountId}/ach_relationships`);
      const transfers = await alpacaRequest(`/v1/accounts/${accountId}/transfers`);

      return NextResponse.json({ relationships, transfers });
    } catch (error) {
      console.error('[Alpaca] Funding status error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  },
  { requireAuth: true },
);
