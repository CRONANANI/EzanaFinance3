import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user's accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('plaid_accounts')
      .select('*')
      .eq('user_id', user.id);

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      );
    }

    // Fetch user's holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from('plaid_holdings')
      .select('*')
      .eq('user_id', user.id);

    if (holdingsError) {
      console.error('Error fetching holdings:', holdingsError);
      return NextResponse.json(
        { error: 'Failed to fetch holdings' },
        { status: 500 }
      );
    }

    // Fetch securities for reference
    const { data: securities, error: securitiesError } = await supabase
      .from('plaid_securities')
      .select('*');

    if (securitiesError) {
      console.error('Error fetching securities:', securitiesError);
    }

    // Calculate portfolio summary (holdings.account_id references plaid_accounts.id)
    const totalValue = (holdings || []).reduce((sum, holding) => {
      return sum + (Number(holding.quantity) * Number(holding.institution_price || holding.institution_value || 0));
    }, 0);

    const totalCostBasis = (holdings || []).reduce((sum, holding) => {
      return sum + (Number(holding.cost_basis) || 0);
    }, 0);

    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0
      ? ((totalGainLoss / totalCostBasis) * 100)
      : 0;

    // Group holdings by account (holdings.account_id = plaid_accounts.id)
    const holdingsByAccount = (accounts || []).map((account) => {
      const accountHoldings = (holdings || []).filter((h) => h.account_id === account.id);
      const accountValue = accountHoldings.reduce((sum, h) =>
        sum + (Number(h.quantity) * Number(h.institution_price || h.institution_value || 0)), 0
      );
      const accountCostBasis = accountHoldings.reduce((sum, h) =>
        sum + (Number(h.cost_basis) || 0), 0
      );

      return {
        ...account,
        holdings: accountHoldings,
        totalValue: accountValue,
        totalCostBasis: accountCostBasis,
        gainLoss: accountValue - accountCostBasis,
        gainLossPercent: accountCostBasis > 0
          ? ((accountValue - accountCostBasis) / accountCostBasis * 100)
          : 0,
      };
    });

    // Calculate gains for each holding
    const holdingsWithGains = (holdings || []).map((holding) => {
      const currentValue = Number(holding.quantity) * Number(holding.institution_price || holding.institution_value || 0);
      const costBasis = Number(holding.cost_basis) || 0;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis * 100) : 0;

      return {
        ...holding,
        currentValue,
        gainLoss,
        gainLossPercent,
      };
    });

    // Top performers (by percentage gain)
    const topPerformers = [...holdingsWithGains]
      .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
      .slice(0, 5);

    // Worst performers
    const worstPerformers = [...holdingsWithGains]
      .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
      .slice(0, 5);

    // Asset allocation by security type
    const securityTypeMap = {};
    securities?.forEach((sec) => {
      securityTypeMap[sec.security_id] = sec.type;
    });

    const allocation = holdingsWithGains.reduce((acc, holding) => {
      const type = securityTypeMap[holding.security_id] || 'other';
      const label = type === 'equity' ? 'Stocks' : type === 'etf' ? 'ETFs' : 'Other';
      acc[label] = (acc[label] || 0) + holding.currentValue;
      return acc;
    }, {});

    // Allocation by account type
    const allocationByAccountType = holdingsByAccount.reduce((acc, account) => {
      const type = account.subtype || 'other';
      const label = type === 'brokerage' ? 'Brokerage'
        : type === '401k' ? '401(k)'
          : type === 'ira' ? 'IRA'
            : 'Other';
      acc[label] = (acc[label] || 0) + account.totalValue;
      return acc;
    }, {});

    return NextResponse.json({
      summary: {
        totalValue,
        totalCostBasis,
        totalGainLoss,
        totalGainLossPercent,
        accountCount: (accounts || []).length,
        holdingsCount: (holdings || []).length,
      },
      accounts: holdingsByAccount,
      holdings: holdingsWithGains,
      topPerformers,
      worstPerformers,
      allocation,
      allocationByAccountType,
      securities: securities || [],
    });
  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
