/**
 * POST /api/plaid/exchange-token
 * Body: { public_token, institutionName?, institutionId? }
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { plaidClient } from '@/lib/plaid';
import { getAdminClient } from '@/lib/supabase';
import {
  upsertPlaidAccount,
  upsertPlaidPositions,
  upsertPlaidTransactions,
} from '@/lib/portfolio/adapters/plaid';
import { encryptToken, isTokenKeyConfigured } from '@/lib/crypto/token-cipher';
import {
  toPlaidAccountRow,
  toPlaidHoldingRows,
  PLAID_ACCOUNTS_CONFLICT,
  PLAID_HOLDINGS_CONFLICT,
} from '@/lib/plaid-rows';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json().catch(() => ({}));
      const { public_token, institutionName: passedName, institutionId: passedId } = body;
      if (!public_token)
        return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });

      // The access token must be encrypted before it is stored. Check the key
      // BEFORE the exchange so a misconfiguration can't mint a live Plaid item
      // that we then fail to persist (an orphan we could never remove).
      if (!isTokenKeyConfigured()) {
        console.error('[Plaid] exchange-token: TOKEN_ENCRYPTION_KEY missing or invalid');
        return NextResponse.json(
          { error: 'Brokerage linking is temporarily unavailable. Please try again later.' },
          { status: 503 },
        );
      }

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

      const { data: itemRow, error: itemError } = await getAdminClient()
        .from('plaid_items')
        .upsert(
          {
            user_id: user.id,
            item_id,
            // Encrypt the STORED copy only; the in-memory `access_token` above
            // stays plaintext for the immediate Plaid calls in this request.
            access_token: encryptToken(access_token),
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
            await getAdminClient()
              .from('unified_accounts')
              .delete()
              .in('id', writtenUnifiedAccountIds);
          }
          await getAdminClient().from('plaid_items').delete().eq('item_id', item_id);
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

      // Legacy Plaid tables read by /api/plaid/holdings, /api/portfolio and the
      // portfolio-snapshot cron. Every error surfaces as a 500 (QA RET-8).
      const now = new Date().toISOString();
      if (accounts.length > 0) {
        const accountRows = accounts.map((a) =>
          toPlaidAccountRow({ userId: user.id, plaidItemRowId: itemRow.id, account: a, now }),
        );
        const { error: acctErr } = await getAdminClient()
          .from('plaid_accounts')
          .upsert(accountRows, { onConflict: PLAID_ACCOUNTS_CONFLICT });
        if (acctErr) throw new Error(`plaid_accounts upsert: ${acctErr.message}`);
      }
      const { rows: holdingRows, skipped } = toPlaidHoldingRows({
        userId: user.id,
        holdings,
        securitiesByID,
        now,
      });
      if (skipped > 0) {
        console.warn('[plaid/exchange] skipped holdings without a ticker:', skipped);
      }
      if (holdingRows.length > 0) {
        const { error: holdErr } = await getAdminClient()
          .from('plaid_holdings')
          .upsert(holdingRows, { onConflict: PLAID_HOLDINGS_CONFLICT });
        if (holdErr) throw new Error(`plaid_holdings upsert: ${holdErr.message}`);
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
