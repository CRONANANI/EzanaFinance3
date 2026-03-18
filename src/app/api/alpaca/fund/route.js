/**
 * POST /api/alpaca/fund — Link bank or initiate transfer
 * GET /api/alpaca/fund — Get ACH relationships and transfers
 */
import { NextResponse } from 'next/server';
import { alpacaRequest } from '@/lib/alpaca';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

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
    if (!accountId) return NextResponse.json({ error: 'No brokerage account found' }, { status: 404 });

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
      const transfer = await alpacaRequest(`/v1/accounts/${accountId}/transfers`, {
        method: 'POST',
        body: JSON.stringify({
          transfer_type: 'ach',
          relationship_id: body.relationshipId,
          amount: body.amount.toString(),
          direction: body.direction || 'INCOMING',
        }),
      });

      return NextResponse.json({
        success: true,
        transferId: transfer.id,
        status: transfer.status,
        amount: transfer.amount,
        direction: transfer.direction,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Alpaca] Funding error:', error);
    return NextResponse.json(
      { error: 'Funding operation failed', details: error.details || error.message },
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

    const relationships = await alpacaRequest(`/v1/accounts/${accountId}/ach_relationships`);
    const transfers = await alpacaRequest(`/v1/accounts/${accountId}/transfers`);

    return NextResponse.json({ relationships, transfers });
  } catch (error) {
    console.error('[Alpaca] Funding status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
