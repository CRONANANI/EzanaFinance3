import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: holdings, error: holdingsError } = await supabase
      .from('plaid_holdings')
      .select(`*, plaid_accounts (name, type, subtype, plaid_items (institution_name))`)
      .eq('user_id', user.id)
      .order('institution_value', { ascending: false });

    if (holdingsError) throw holdingsError;

    const { data: accounts, error: accountsError } = await supabase
      .from('plaid_accounts')
      .select(`*, plaid_items (institution_name, status)`)
      .eq('user_id', user.id);

    if (accountsError) throw accountsError;

    const { data: transactions, error: transactionsError } = await supabase
      .from('plaid_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(50);

    if (transactionsError) throw transactionsError;

    const totalValue = holdings?.reduce((sum, h) => sum + (h.institution_value || 0), 0) || 0;
    const totalCostBasis = holdings?.reduce((sum, h) => sum + (h.cost_basis || 0), 0) || 0;
    const totalGainLoss = totalValue - totalCostBasis;
    const totalReturnPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    const holdingsByType = holdings?.reduce((acc, h) => {
      const type = h.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(h);
      return acc;
    }, {});

    return NextResponse.json({
      summary: {
        totalValue,
        totalCostBasis,
        totalGainLoss,
        totalReturnPercent,
        totalPositions: holdings?.length || 0,
        totalAccounts: accounts?.length || 0,
      },
      holdings,
      topHoldings: holdings?.slice(0, 10) || [],
      holdingsByType,
      accounts,
      recentTransactions: transactions,
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 });
  }
}
