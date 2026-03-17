/**
 * POST /api/plaid/exchange-token
 * Requires: authenticated user
 * Body: { public_token }
 *
 * Exchanges public_token → access_token, stores in DB tied to user,
 * fetches accounts + initial holdings, returns summary to client.
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

    const { public_token } = await request.json();
    if (!public_token) {
      return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });
    }

    // ── Step 1: Exchange token ──
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchangeRes.data;

    // ── Step 2: Get institution info ──
    const itemRes = await plaidClient.itemGet({ access_token });
    const institutionId = itemRes.data.item.institution_id;

    let institution = { id: institutionId, name: 'Unknown', logo: null };
    if (institutionId) {
      try {
        const instRes = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US'],
        });
        institution = {
          id: institutionId,
          name: instRes.data.institution.name,
          logo: instRes.data.institution.logo || null,
        };
      } catch {}
    }

    // ── Step 3: Store plaid_item in Supabase ──
    const { data: plaidItem, error: itemErr } = await supabaseAdmin
      .from('plaid_items')
      .upsert({
        user_id: user.id,
        item_id,
        access_token,
        institution_id: institution.id,
        institution_name: institution.name,
        institution_logo: institution.logo,
        status: 'active',
      }, { onConflict: 'item_id' })
      .select()
      .single();

    if (itemErr) {
      console.error('[Plaid] DB insert plaid_items error:', itemErr);
      return NextResponse.json({ error: 'Failed to store connection' }, { status: 500 });
    }

    // ── Step 4: Fetch and store accounts ──
    const accountsRes = await plaidClient.accountsGet({ access_token });
    const accounts = accountsRes.data.accounts.map((a) => ({
      user_id: user.id,
      plaid_item_id: plaidItem.id,
      account_id: a.account_id,
      name: a.name,
      official_name: a.official_name,
      type: a.type,
      subtype: a.subtype,
      mask: a.mask,
      balance_current: a.balances.current,
      balance_available: a.balances.available,
      balance_limit: a.balances.limit,
      currency: a.balances.iso_currency_code || 'USD',
    }));

    if (accounts.length > 0) {
      const { error: acctErr } = await supabaseAdmin
        .from('plaid_accounts')
        .upsert(accounts, { onConflict: 'account_id' });
      if (acctErr) console.error('[Plaid] DB insert plaid_accounts error:', acctErr);
    }

    // ── Step 5: Fetch and store holdings ──
    try {
      const holdingsRes = await plaidClient.investmentsHoldingsGet({ access_token });
      const { holdings, securities } = holdingsRes.data;

      const secMap = {};
      for (const s of securities) {
        secMap[s.security_id] = { ticker: s.ticker_symbol, name: s.name, type: s.type };
      }

      const holdingRows = holdings.map((h) => ({
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

      if (holdingRows.length > 0) {
        const accountIds = [...new Set(holdingRows.map((h) => h.account_id))];
        await supabaseAdmin
          .from('plaid_holdings')
          .delete()
          .eq('user_id', user.id)
          .in('account_id', accountIds);

        const { error: holdErr } = await supabaseAdmin
          .from('plaid_holdings')
          .insert(holdingRows);
        if (holdErr) console.error('[Plaid] DB insert plaid_holdings error:', holdErr);
      }
    } catch (holdingsErr) {
      console.warn('[Plaid] Holdings fetch skipped:', holdingsErr.message);
    }

    return NextResponse.json({
      success: true,
      item_id,
      institution,
      accounts: accounts.map((a) => ({
        account_id: a.account_id,
        name: a.name,
        type: a.type,
        subtype: a.subtype,
        mask: a.mask,
        balance_current: a.balance_current,
      })),
    });
  } catch (error) {
    console.error('[Plaid] exchange-token error:', error?.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to exchange token', details: error?.response?.data?.error_message || error.message },
      { status: 500 }
    );
  }
}
