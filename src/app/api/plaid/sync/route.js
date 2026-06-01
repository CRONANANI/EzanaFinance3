/**
 * POST /api/plaid/sync
 * Re-syncs all Plaid-connected accounts for the user. Writes to the
 * unified layer (and the legacy tables for backwards compat).
 */
import { NextResponse } from 'next/server';
import { plaidClient, supabaseAdmin } from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';
import {
  upsertPlaidAccount,
  upsertPlaidPositions,
  upsertPlaidTransactions,
} from '@/lib/portfolio/adapters/plaid';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: items } = await supabaseAdmin
      .from('plaid_items')
      .select('id, access_token, institution_id, institution_name')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!items || items.length === 0) {
      return NextResponse.json({ synced: 0, message: 'No connected Plaid institutions' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    let totalAccounts = 0;
    const errors = [];

    for (const item of items) {
      try {
        const acctRes = await plaidClient.accountsGet({ access_token: item.access_token });

        let holdings = [];
        let securitiesByID = {};
        try {
          const hRes = await plaidClient.investmentsHoldingsGet({
            access_token: item.access_token,
          });
          holdings = hRes.data.holdings || [];
          for (const s of hRes.data.securities || []) securitiesByID[s.security_id] = s;
        } catch {
          /* investments not supported */
        }

        const transactionsByAccount = {};
        try {
          const tRes = await plaidClient.investmentsTransactionsGet({
            access_token: item.access_token,
            start_date: ninetyDaysAgo,
            end_date: today,
          });
          for (const t of tRes.data.investment_transactions || []) {
            const sec = (tRes.data.securities || []).find((s) => s.security_id === t.security_id);
            t.security = sec || null;
            if (!transactionsByAccount[t.account_id]) transactionsByAccount[t.account_id] = [];
            transactionsByAccount[t.account_id].push(t);
          }
        } catch {
          /* transactions not supported */
        }

        for (const a of acctRes.data.accounts) {
          if (!['investment', 'brokerage'].includes(a.type) && !a.subtype?.includes('401'))
            continue;
          const unifiedAccount = await upsertPlaidAccount({
            userId: user.id,
            plaidAccount: a,
            institutionName: item.institution_name,
            plaidInstitutionId: item.institution_id,
          });
          totalAccounts++;

          const accountHoldings = holdings.filter((h) => h.account_id === a.account_id);
          if (accountHoldings.length > 0) {
            await upsertPlaidPositions({
              userId: user.id,
              accountId: unifiedAccount.id,
              holdings: accountHoldings,
              securitiesByID,
              snapshotDate: today,
            });
          }

          const accountTxns = transactionsByAccount[a.account_id] || [];
          if (accountTxns.length > 0) {
            await upsertPlaidTransactions({
              userId: user.id,
              accountId: unifiedAccount.id,
              transactions: accountTxns,
            });
          }
        }
      } catch (err) {
        errors.push({ institution: item.institution_name, error: err.message });
      }
    }

    return NextResponse.json({ synced: totalAccounts, errors });
  } catch (error) {
    console.error('[Plaid] sync error:', error);
    return NextResponse.json({ error: 'Sync failed', details: error.message }, { status: 500 });
  }
}
