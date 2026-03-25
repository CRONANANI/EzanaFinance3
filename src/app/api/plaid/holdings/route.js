/**
 * GET /api/plaid/holdings
 * Requires: authenticated user
 *
 * Returns the user's portfolio: connected institutions,
 * accounts, and all holdings from Supabase.
 * This is what the dashboard calls on every login.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all user's connected institutions
    const { data: items } = await supabaseAdmin
      .from('plaid_items')
      .select('id, item_id, institution_name, institution_logo, status, created_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Fetch all accounts
    const { data: accounts } = await supabaseAdmin
      .from('plaid_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('balance_current', { ascending: false });

    // Fetch all holdings (support both schemas: value/cost_basis or institution_value/cost_basis)
    const { data: holdings } = await supabaseAdmin
      .from('plaid_holdings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Normalize holdings - some schemas use institution_value, others use value
    const normalizedHoldings = (holdings || []).map((h) => ({
      ...h,
      value: h.value ?? h.institution_value ?? 0,
      cost_basis: h.cost_basis ?? 0,
      ticker: h.ticker ?? h.ticker_symbol,
    }));

    // Compute portfolio summary
    const totalValue = normalizedHoldings.reduce((sum, h) => sum + (h.value || 0), 0);
    const totalCostBasis = normalizedHoldings.reduce((sum, h) => sum + (h.cost_basis || 0), 0);
    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? ((totalGainLoss / totalCostBasis) * 100) : 0;

    // Group holdings by ticker for aggregated view
    const tickerMap = {};
    for (const h of normalizedHoldings) {
      const key = h.ticker || h.security_id;
      if (!tickerMap[key]) {
        tickerMap[key] = {
          ticker: h.ticker,
          name: h.name,
          type: h.type,
          totalQuantity: 0,
          totalValue: 0,
          totalCostBasis: 0,
          lastPrice: h.price ?? h.institution_price,
        };
      }
      tickerMap[key].totalQuantity += h.quantity || 0;
      tickerMap[key].totalValue += h.value || 0;
      tickerMap[key].totalCostBasis += h.cost_basis || 0;
    }

    const aggregatedHoldings = Object.values(tickerMap)
      .map((h) => ({
        ...h,
        gainLoss: h.totalValue - h.totalCostBasis,
        gainLossPercent: h.totalCostBasis > 0 ? ((h.totalValue - h.totalCostBasis) / h.totalCostBasis * 100) : 0,
        portfolioWeight: totalValue > 0 ? ((h.totalValue / totalValue) * 100) : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    return NextResponse.json({
      connected: (items || []).length > 0,
      institutions: items || [],
      accounts: accounts || [],
      holdings: normalizedHoldings,
      aggregated: aggregatedHoldings,
      summary: {
        totalValue,
        totalCostBasis,
        totalGainLoss,
        totalGainLossPercent: Math.round(totalGainLossPercent * 100) / 100,
        positionCount: aggregatedHoldings.length,
        accountCount: (accounts || []).length,
        institutionCount: (items || []).length,
      },
      lastSynced: normalizedHoldings?.[0]?.synced_at || null,
    });
  } catch (error) {
    console.error('[Plaid] holdings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holdings', details: error.message },
      { status: 500 }
    );
  }
}
