/**
 * POST /api/plaid/exchange-token
 * Body: { public_token, institutionName?, institutionId? }
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { plaidClient, supabaseAdmin } from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';
import {
  upsertPlaidAccount,
  upsertPlaidPositions,
  upsertPlaidTransactions,
} from '@/lib/portfolio/adapters/plaid';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json().catch(() => ({}));
      const { public_token, institutionName: passedName, institutionId: passedId } = body;
      if (!public_token)
        return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });

      const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
      const { access_token, item_id } = exchangeRes.data;

      const itemRes = await plaidClient.itemGet({ access_token });
      const institutionId = itemRes.data.item.institution_id || passedId;
      let institutionName = passedName || 'Unknown';
      let institutionLogo = null;
      if (institutionId) {
        try {
          const instRes = await plaidClient.institutionsGetById({
            institution_id: institutionId,
            country_codes: ['US'],
          });
          institutionName = instRes.data.institution.name;
          institutionLogo = instRes.data.institution.logo || null;
        } catch {
          /* use passed name */
        }
      }

      const { data: itemRow, error: itemError } = await supabaseAdmin
        .from('plaid_items')
        .upsert(
          {
            user_id: user.id,
            item_id,
            access_token,
            institution_id: institutionId,
            institution_name: institutionName,
            institution_logo: institutionLogo,
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'item_id' },
        )
        .select()
        .single();
      if (itemError) throw itemError;

      const acctRes = await plaidClient.accountsGet({ access_token });
      const accounts = acctRes.data.accounts || [];

      let holdings = [];
      let securitiesByID = {};
      try {
        const hRes = await plaidClient.investmentsHoldingsGet({ access_token });
        holdings = hRes.data.holdings || [];
        for (const s of hRes.data.securities || []) {
          securitiesByID[s.security_id] = s;
        }
      } catch (e) {
        console.warn(
          '[plaid/exchange] holdings unavailable for',
          institutionName,
          e?.response?.data?.error_code,
        );
      }

      const today = new Date().toISOString().slice(0, 10);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const transactionsByAccount = {};
      try {
        const tRes = await plaidClient.investmentsTransactionsGet({
          access_token,
          start_date: ninetyDaysAgo,
          end_date: today,
        });
        for (const t of tRes.data.investment_transactions || []) {
          const sec = (tRes.data.securities || []).find((s) => s.security_id === t.security_id);
          t.security = sec || null;
          if (!transactionsByAccount[t.account_id]) transactionsByAccount[t.account_id] = [];
          transactionsByAccount[t.account_id].push(t);
        }
      } catch (e) {
        console.warn(
          '[plaid/exchange] transactions unavailable for',
          institutionName,
          e?.response?.data?.error_code,
        );
      }

      const snapshotDate = today;
      const writtenUnifiedAccountIds = [];
      try {
        for (const a of accounts) {
          if (
            !['investment', 'brokerage'].includes(a.type) &&
            !a.subtype?.includes('401') &&
            a.type !== 'depository'
          ) {
            continue;
          }
          const unifiedAccount = await upsertPlaidAccount({
            userId: user.id,
            plaidAccount: a,
            institutionName,
            plaidInstitutionId: institutionId,
          });
          writtenUnifiedAccountIds.push(unifiedAccount.id);

          const accountHoldings = holdings.filter((h) => h.account_id === a.account_id);
          if (accountHoldings.length > 0) {
            await upsertPlaidPositions({
              userId: user.id,
              accountId: unifiedAccount.id,
              holdings: accountHoldings,
              securitiesByID,
              snapshotDate,
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
        if (err.code === 'cross_provider_conflict') {
          if (writtenUnifiedAccountIds.length > 0) {
            await supabaseAdmin
              .from('unified_accounts')
              .delete()
              .in('id', writtenUnifiedAccountIds);
          }
          await supabaseAdmin.from('plaid_items').delete().eq('item_id', item_id);
          try {
            await plaidClient.itemRemove({ access_token });
          } catch {
            /* best-effort */
          }
          return NextResponse.json(
            {
              error: 'This account is already connected via another provider.',
              code: 'cross_provider_conflict',
              fingerprint: err.fingerprint,
            },
            { status: 409 },
          );
        }
        throw err;
      }

      for (const a of accounts) {
        await supabaseAdmin.from('plaid_accounts').upsert(
          {
            user_id: user.id,
            plaid_item_id: itemRow.id,
            account_id: a.account_id,
            name: a.name,
            type: a.type,
            subtype: a.subtype,
            mask: a.mask,
            balance_current: a.balances?.current,
            balance_available: a.balances?.available,
            currency: a.balances?.iso_currency_code || 'USD',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'account_id' },
        );
      }
      for (const h of holdings) {
        const sec = securitiesByID[h.security_id];
        if (!sec) continue;
        await supabaseAdmin.from('plaid_holdings').upsert({
          user_id: user.id,
          account_id: h.account_id,
          security_id: h.security_id,
          ticker: sec.ticker_symbol || sec.symbol,
          name: sec.name,
          type: sec.type,
          quantity: h.quantity,
          price: h.institution_price,
          value: h.institution_value,
          cost_basis: h.cost_basis,
          synced_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        institution: { id: institutionId, name: institutionName, logo: institutionLogo },
        accountsConnected: writtenUnifiedAccountIds.length,
      });
    } catch (error) {
      console.error('[Plaid] exchange-token error:', error?.response?.data || error.message);
      return NextResponse.json(
        {
          error: 'Failed to complete connection',
          details: error?.response?.data?.error_message || error.message,
        },
        { status: 500 },
      );
    }
  },
  { requireAuth: true },
);
