/**
 * GET /api/plaid/holdings
 * Requires: authenticated user
 *
 * Returns the user's portfolio: connected institutions,
 * accounts, and all holdings from Supabase.
 * This is what the dashboard calls on every login.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

import { getAdminClient } from '@/lib/supabase';
import { normalizePlaidHolding } from '@/lib/plaid-rows';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    try {
      const admin = getAdminClient();

      // Fetch all user's connected institutions
      const { data: items, error: itemsError } = await admin
        .from('plaid_items')
        .select('id, item_id, institution_name, institution_logo, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (itemsError) throw new Error(`plaid_items read: ${itemsError.message}`);

      // Fetch all accounts
      const { data: accounts, error: accountsError } = await admin
        .from('plaid_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('balance_current', { ascending: false });
      if (accountsError) throw new Error(`plaid_accounts read: ${accountsError.message}`);

      // Fetch all holdings (live columns: ticker_symbol, security_name,
      // security_type, price_per_share, total_value, synced_at)
      const { data: holdings, error: holdingsError } = await admin
        .from('plaid_holdings')
        .select('*')
        .eq('user_id', user.id)
        .order('synced_at', { ascending: false });
      if (holdingsError) throw new Error(`plaid_holdings read: ${holdingsError.message}`);

      // Adds the short aliases the dashboard reads: ticker, name, type, price, value
      const normalizedHoldings = (holdings || []).map(normalizePlaidHolding);

      // Compute portfolio summary
      const totalValue = normalizedHoldings.reduce((sum, h) => sum + (h.value || 0), 0);
      const totalCostBasis = normalizedHoldings.reduce((sum, h) => sum + (h.cost_basis || 0), 0);
      const totalGainLoss = totalValue - totalCostBasis;
      const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

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
            lastPrice: h.price,
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
          gainLossPercent:
            h.totalCostBasis > 0 ? ((h.totalValue - h.totalCostBasis) / h.totalCostBasis) * 100 : 0,
          portfolioWeight: totalValue > 0 ? (h.totalValue / totalValue) * 100 : 0,
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
        { status: 500 },
      );
    }
  },
  { requireAuth: true },
);
