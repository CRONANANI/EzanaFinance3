import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { normalizePlaidHolding } from '@/lib/plaid-rows';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    try {
      const supabase = getAdminClient();

      const { data: rawHoldings, error: holdingsError } = await supabase
        .from('plaid_holdings')
        .select(
          `*, plaid_accounts (account_name, account_type, account_subtype, plaid_items (institution_name))`,
        )
        .eq('user_id', user.id)
        .order('total_value', { ascending: false });

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

      const holdings = (rawHoldings || []).map(normalizePlaidHolding);
      const totalValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);
      const totalCostBasis = holdings.reduce((sum, h) => sum + (h.cost_basis || 0), 0);
      const totalGainLoss = totalValue - totalCostBasis;
      const totalReturnPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

      const holdingsByType = holdings.reduce((acc, h) => {
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
          totalPositions: holdings.length,
          totalAccounts: accounts?.length || 0,
        },
        holdings,
        topHoldings: holdings.slice(0, 10),
        holdingsByType,
        accounts,
        recentTransactions: transactions,
      });
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
