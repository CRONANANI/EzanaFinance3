import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    // Check if environment variables exist
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey
      });
      return NextResponse.json(
        { error: 'Server configuration error - missing environment variables' },
        { status: 500 }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Hardcoded user ID for testing (your test user)
    // TODO: Replace with proper auth once working
    const userId = 'b0a9a9d4-54a2-4461-a203-95d869dae6c1';

    console.log('Fetching portfolio for user:', userId);

    // Fetch accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('plaid_accounts')
      .select('*')
      .eq('user_id', userId);

    if (accountsError) {
      console.error('Accounts error:', accountsError);
      return NextResponse.json(
        { error: 'Failed to fetch accounts', details: accountsError.message },
        { status: 500 }
      );
    }

    // Fetch holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from('plaid_holdings')
      .select('*')
      .eq('user_id', userId);

    if (holdingsError) {
      console.error('Holdings error:', holdingsError);
      return NextResponse.json(
        { error: 'Failed to fetch holdings', details: holdingsError.message },
        { status: 500 }
      );
    }

    // Fetch securities
    const { data: securities, error: securitiesError } = await supabase
      .from('plaid_securities')
      .select('*');

    if (securitiesError) {
      console.error('Securities error:', securitiesError);
    }

    // Fetch transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('plaid_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(50);

    if (transactionsError) {
      console.error('Transactions error:', transactionsError);
    }

    // If no data, return empty state
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        summary: {
          totalValue: 0,
          totalCostBasis: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          accountCount: 0,
          holdingsCount: 0,
        },
        accounts: [],
        holdings: [],
        topPerformers: [],
        worstPerformers: [],
        allocation: {},
        recentTransactions: [],
        message: 'No portfolio data found'
      });
    }

    // Calculate totals
    const totalValue = holdings.reduce((sum, h) =>
      sum + (Number(h.quantity) * Number(h.institution_price || h.institution_value || 0)), 0
    );

    const totalCostBasis = holdings.reduce((sum, h) =>
      sum + Number(h.cost_basis || 0), 0
    );

    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0
      ? (totalGainLoss / totalCostBasis * 100)
      : 0;

    // Process holdings with gains
    const holdingsWithGains = holdings.map(h => {
      const price = Number(h.institution_price || h.institution_value || 0);
      const currentValue = Number(h.quantity) * price;
      const costBasis = Number(h.cost_basis || 0);
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis * 100) : 0;

      return { ...h, currentValue, gainLoss, gainLossPercent };
    });

    // Group by account (holdings.account_id may match account.id or account.account_id)
    const holdingsByAccount = accounts.map(account => {
      const acctHoldings = holdingsWithGains.filter(h =>
        h.account_id === account.account_id || h.account_id === account.id
      );
      const acctValue = acctHoldings.reduce((sum, h) => sum + h.currentValue, 0);
      const acctCost = acctHoldings.reduce((sum, h) => sum + Number(h.cost_basis || 0), 0);

      return {
        ...account,
        holdings: acctHoldings,
        totalValue: acctValue,
        totalCostBasis: acctCost,
        gainLoss: acctValue - acctCost,
        gainLossPercent: acctCost > 0 ? ((acctValue - acctCost) / acctCost * 100) : 0
      };
    });

    // Top performers
    const topPerformers = [...holdingsWithGains]
      .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
      .slice(0, 5);

    // Asset allocation
    const allocation = holdingsWithGains.reduce((acc, h) => {
      const isETF = ['VTI', 'VXUS', 'BND', 'SPY', 'QQQ'].includes(h.ticker_symbol);
      const label = isETF ? 'ETFs' : 'Stocks';
      acc[label] = (acc[label] || 0) + h.currentValue;
      return acc;
    }, {});

    return NextResponse.json({
      summary: {
        totalValue,
        totalCostBasis,
        totalGainLoss,
        totalGainLossPercent,
        accountCount: accounts.length,
        holdingsCount: holdings.length,
      },
      accounts: holdingsByAccount,
      holdings: holdingsWithGains,
      topPerformers,
      worstPerformers: [...holdingsWithGains].sort((a, b) => a.gainLossPercent - b.gainLossPercent).slice(0, 5),
      allocation,
      recentTransactions: transactions || [],
      securities: securities || [],
    });

  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}
