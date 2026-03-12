import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user's plaid items
    const { data: plaidItems, error: itemsError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (itemsError) {
      throw itemsError;
    }

    let syncedAccounts = 0;
    let syncedHoldings = 0;

    for (const item of plaidItems || []) {
      try {
        // Sync accounts and balances
        const accountsResponse = await plaidClient.accountsGet({
          access_token: item.access_token,
        });

        for (const account of accountsResponse.data.accounts) {
          await supabase
            .from('plaid_accounts')
            .update({
              current_balance: account.balances.current,
              available_balance: account.balances.available,
              updated_at: new Date().toISOString(),
            })
            .eq('account_id', account.account_id);

          syncedAccounts++;
        }

        // Sync holdings
        const holdingsCount = await syncHoldings(user.id, item.access_token, supabase);
        syncedHoldings += holdingsCount;

        // Sync transactions
        await syncTransactions(user.id, item.access_token, supabase);

        // Update last synced timestamp
        await supabase
          .from('plaid_items')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', item.id);
      } catch (itemError) {
        console.error(`Error syncing item ${item.id}:`, itemError);

        // Update item status if there's an auth error
        const errorCode = itemError.response?.data?.error_code || itemError.error?.error_code;
        if (errorCode === 'ITEM_LOGIN_REQUIRED') {
          await supabase
            .from('plaid_items')
            .update({
              status: 'error',
              error_code: 'ITEM_LOGIN_REQUIRED',
              error_message: 'Please reconnect your account',
            })
            .eq('id', item.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced_accounts: syncedAccounts,
      synced_holdings: syncedHoldings,
      message: 'Portfolio data synced successfully',
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json(
      { error: 'Failed to sync data' },
      { status: 500 }
    );
  }
}

async function syncHoldings(userId, accessToken, supabase) {
  let count = 0;
  try {
    const holdingsResponse = await plaidClient.investmentsHoldingsGet({
      access_token: accessToken,
    });

    const { holdings, securities } = holdingsResponse.data;

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

    const { data: dbAccounts } = await supabase
      .from('plaid_accounts')
      .select('id, account_id')
      .eq('user_id', userId);

    const accountMap = {};
    dbAccounts?.forEach(acc => {
      accountMap[acc.account_id] = acc.id;
    });

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
      count++;
    }
  } catch (error) {
    console.error('Error syncing holdings:', error);
  }
  return count;
}

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
