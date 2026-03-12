import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { public_token, metadata } = await request.json();
    const supabase = createServerSupabaseClient();

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // Get institution info
    const institutionId = metadata?.institution?.institution_id;
    const institutionName = metadata?.institution?.name;

    // Store in Supabase
    const { data: plaidItem, error: insertError } = await supabase
      .from('plaid_items')
      .insert({
        user_id: user.id,
        item_id,
        access_token,
        institution_id: institutionId,
        institution_name: institutionName,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing plaid item:', insertError);
      return NextResponse.json(
        { error: 'Failed to store connection' },
        { status: 500 }
      );
    }

    // Fetch and store accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token,
    });

    const accounts = accountsResponse.data.accounts;

    for (const account of accounts) {
      await supabase.from('plaid_accounts').insert({
        user_id: user.id,
        plaid_item_id: plaidItem.id,
        account_id: account.account_id,
        name: account.name,
        official_name: account.official_name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        current_balance: account.balances.current,
        available_balance: account.balances.available,
        iso_currency_code: account.balances.iso_currency_code,
      });
    }

    // Trigger initial data sync
    await syncHoldings(user.id, access_token, supabase);
    await syncTransactions(user.id, access_token, supabase);

    return NextResponse.json({
      success: true,
      item_id,
      institution_name: institutionName,
      accounts_connected: accounts.length,
    });
  } catch (error) {
    console.error('Error exchanging token:', error);
    return NextResponse.json(
      { error: 'Failed to connect account' },
      { status: 500 }
    );
  }
}

// Helper function to sync holdings
async function syncHoldings(userId, accessToken, supabase) {
  try {
    const holdingsResponse = await plaidClient.investmentsHoldingsGet({
      access_token: accessToken,
    });

    const { holdings, securities, accounts } = holdingsResponse.data;

    // Store securities
    for (const security of securities) {
      await supabase.from('plaid_securities').upsert({
        security_id: security.security_id,
        ticker_symbol: security.ticker_symbol,
        name: security.name,
        type: security.type,
        close_price: security.close_price,
        close_price_as_of: security.close_price_as_of,
        iso_currency_code: security.iso_currency_code,
        cusip: security.cusip,
        isin: security.isin,
        sedol: security.sedol,
      }, { onConflict: 'security_id' });
    }

    // Get account ID mapping
    const { data: dbAccounts } = await supabase
      .from('plaid_accounts')
      .select('id, account_id')
      .eq('user_id', userId);

    const accountMap = {};
    dbAccounts?.forEach(acc => {
      accountMap[acc.account_id] = acc.id;
    });

    // Store holdings
    for (const holding of holdings) {
      const security = securities.find(s => s.security_id === holding.security_id);
      const dbAccountId = accountMap[holding.account_id];

      if (!dbAccountId) continue;

      const costBasis = holding.cost_basis || 0;
      const currentValue = holding.institution_value || 0;
      const unrealizedGainLoss = currentValue - costBasis;
      const unrealizedGainLossPercent = costBasis > 0
        ? (unrealizedGainLoss / costBasis) * 100
        : 0;

      await supabase.from('plaid_holdings').upsert({
        user_id: userId,
        account_id: dbAccountId,
        security_id: holding.security_id,
        ticker_symbol: security?.ticker_symbol,
        name: security?.name,
        type: security?.type,
        quantity: holding.quantity,
        cost_basis: holding.cost_basis,
        institution_price: holding.institution_price,
        institution_price_as_of: holding.institution_price_as_of,
        institution_value: holding.institution_value,
        iso_currency_code: holding.iso_currency_code,
        unrealized_gain_loss: unrealizedGainLoss,
        unrealized_gain_loss_percent: unrealizedGainLossPercent,
      }, {
        onConflict: 'user_id,account_id,security_id',
      });
    }
  } catch (error) {
    console.error('Error syncing holdings:', error);
  }
}

// Helper function to sync transactions
async function syncTransactions(userId, accessToken, supabase) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const transactionsResponse = await plaidClient.investmentsTransactionsGet({
      access_token: accessToken,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    });

    const { investment_transactions, securities } = transactionsResponse.data;

    // Get account ID mapping
    const { data: dbAccounts } = await supabase
      .from('plaid_accounts')
      .select('id, account_id')
      .eq('user_id', userId);

    const accountMap = {};
    dbAccounts?.forEach(acc => {
      accountMap[acc.account_id] = acc.id;
    });

    for (const transaction of investment_transactions) {
      const dbAccountId = accountMap[transaction.account_id];
      if (!dbAccountId) continue;

      const security = securities?.find(s => s.security_id === transaction.security_id);

      await supabase.from('plaid_transactions').upsert({
        user_id: userId,
        account_id: dbAccountId,
        transaction_id: transaction.investment_transaction_id,
        name: transaction.name,
        amount: transaction.amount,
        iso_currency_code: transaction.iso_currency_code,
        date: transaction.date,
        type: transaction.type,
        subtype: transaction.subtype,
        quantity: transaction.quantity,
        price: transaction.price,
        fees: transaction.fees,
        pending: false,
        metadata: {
          security_id: transaction.security_id,
          ticker: security?.ticker_symbol,
        },
      }, { onConflict: 'transaction_id' });
    }
  } catch (error) {
    console.error('Error syncing transactions:', error);
  }
}
