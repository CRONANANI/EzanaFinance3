/**
 * POST /api/plaid/sync
 * Requires: authenticated user
 *
 * Re-syncs all holdings from Plaid for the user's connected accounts.
 * Call this when user clicks "Refresh" or on a schedule.
 */
import { NextResponse } from 'next/server';
import { plaidClient, supabaseAdmin } from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: items } = await supabaseAdmin
      .from('plaid_items')
      .select('id, item_id, access_token, institution_name')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!items || items.length === 0) {
      return NextResponse.json({ synced: 0, message: 'No connected brokerages' });
    }

    let totalHoldings = 0;
    const errors = [];

    for (const item of items) {
      try {
        const acctRes = await plaidClient.accountsGet({ access_token: item.access_token });
        for (const a of acctRes.data.accounts) {
          await supabaseAdmin
            .from('plaid_accounts')
            .update({
              balance_current: a.balances.current,
              balance_available: a.balances.available,
            })
            .eq('account_id', a.account_id);
        }

        const holdingsRes = await plaidClient.investmentsHoldingsGet({ access_token: item.access_token });
        const { holdings, securities } = holdingsRes.data;

        const secMap = {};
        for (const s of securities) {
          secMap[s.security_id] = { ticker: s.ticker_symbol, name: s.name, type: s.type };
        }

        const accountIds = [...new Set(holdings.map((h) => h.account_id))];
        if (accountIds.length > 0) {
          await supabaseAdmin
            .from('plaid_holdings')
            .delete()
            .eq('user_id', user.id)
            .in('account_id', accountIds);
        }

        const rows = holdings.map((h) => ({
          user_id: user.id,
          account_id: h.account_id,
          security_id: h.security_id,
          ticker: secMap[h.security_id]?.ticker || null,
          name: secMap[h.security_id]?.name || null,
          type: secMap[h.security_id]?.type || null,
          quantity: h.quantity,
          price: h.institution_price,
          value: h.institution_value,
          cost_basis: h.cost_basis,
          synced_at: new Date().toISOString(),
        }));

        if (rows.length > 0) {
          await supabaseAdmin.from('plaid_holdings').insert(rows);
          totalHoldings += rows.length;
        }
      } catch (err) {
        console.error(`[Plaid] Sync error for ${item.institution_name}:`, err.message);
        errors.push({ institution: item.institution_name, error: err.message });

        if (err?.response?.data?.error_code === 'ITEM_LOGIN_REQUIRED') {
          await supabaseAdmin
            .from('plaid_items')
            .update({ status: 'error', error_code: 'ITEM_LOGIN_REQUIRED' })
            .eq('id', item.id);
        }
      }
    }

    return NextResponse.json({
      synced: totalHoldings,
      institutions: items.length,
      errors: errors.length > 0 ? errors : undefined,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Plaid] sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    );
  }
}
