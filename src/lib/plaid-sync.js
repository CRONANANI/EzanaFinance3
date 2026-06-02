/**
 * Shared Plaid item sync — used by POST /api/plaid/sync and /api/plaid/webhook.
 */
import { plaidClient, supabaseAdmin } from '@/lib/plaid';
import {
  upsertPlaidAccount,
  upsertPlaidPositions,
  upsertPlaidTransactions,
} from '@/lib/portfolio/adapters/plaid';

export async function syncPlaidItem({
  userId,
  accessToken,
  institutionId,
  institutionName,
  plaidItemDbId,
  plaidItemId,
}) {
  const today = new Date().toISOString().slice(0, 10);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  let syncedAccounts = 0;

  const acctRes = await plaidClient.accountsGet({ access_token: accessToken });

  let holdings = [];
  let securitiesByID = {};
  try {
    const hRes = await plaidClient.investmentsHoldingsGet({ access_token: accessToken });
    holdings = hRes.data.holdings || [];
    for (const s of hRes.data.securities || []) securitiesByID[s.security_id] = s;
  } catch {
    /* investments not supported */
  }

  const transactionsByAccount = {};
  try {
    const tRes = await plaidClient.investmentsTransactionsGet({
      access_token: accessToken,
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
    if (!['investment', 'brokerage'].includes(a.type) && !a.subtype?.includes('401')) continue;

    const unifiedAccount = await upsertPlaidAccount({
      userId,
      plaidAccount: a,
      institutionName,
      plaidInstitutionId: institutionId,
    });
    syncedAccounts++;

    const accountHoldings = holdings.filter((h) => h.account_id === a.account_id);
    if (accountHoldings.length > 0) {
      await upsertPlaidPositions({
        userId,
        accountId: unifiedAccount.id,
        holdings: accountHoldings,
        securitiesByID,
        snapshotDate: today,
      });
    }

    const accountTxns = transactionsByAccount[a.account_id] || [];
    if (accountTxns.length > 0) {
      await upsertPlaidTransactions({
        userId,
        accountId: unifiedAccount.id,
        transactions: accountTxns,
      });
    }
  }

  const updatePayload = {
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'active',
    error_code: null,
  };

  if (plaidItemDbId) {
    await supabaseAdmin.from('plaid_items').update(updatePayload).eq('id', plaidItemDbId);
  } else if (plaidItemId) {
    await supabaseAdmin.from('plaid_items').update(updatePayload).eq('item_id', plaidItemId);
  }

  return { syncedAccounts };
}
