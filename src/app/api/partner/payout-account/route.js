/**
 * GET    /api/partner/payout-account   -> { account, pendingAccount, accounts }
 *   account: the active account (or null); pendingAccount: a manual_ach
 *   account awaiting verification (or null); accounts: both, newest first.
 * POST   /api/partner/payout-account   -> link a bank account
 *   Plaid:  { method: 'plaid_ach', public_token, plaid_account_id }
 *   Manual: { method: 'manual_ach', accountNumber, routingNumber, accountName, institutionName }
 * DELETE /api/partner/payout-account[?id=] -> soft-remove one account (or all),
 *   active or pending_verification
 * Partners only (403 otherwise).
 */
import { getAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { plaidClient } from '@/lib/plaid';
import { encryptToken } from '@/lib/crypto/token-cipher';
import {
  isPayoutPartner,
  listPayoutAccounts,
  savePayoutAccount,
  removePayoutAccount,
} from '@/lib/partner-payouts';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/* PAR-15: an exchanged Plaid item we end up not storing must be removed at
   Plaid, or it stays billable and orphaned. Best effort; failures are logged. */
async function removePlaidItem(accessToken) {
  if (!accessToken) return;
  try {
    await plaidClient.itemRemove({ access_token: accessToken });
  } catch (e) {
    logger.error('Plaid itemRemove failed for orphaned payout item', { error: e?.message });
  }
}

function isValidRouting(rn) {
  if (!/^\d{9}$/.test(rn)) return false;
  const d = rn.split('').map(Number);
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}

export const GET = withApiGuard(
  async (request, user) => {
    if (!(await isPayoutPartner(getAdminClient(), user))) {
      return NextResponse.json({ error: 'Partner access required' }, { status: 403 });
    }
    const { error, accounts, account, pendingAccount } = await listPayoutAccounts(
      getAdminClient(),
      user.id,
    );
    if (error)
      return NextResponse.json({ error: 'Failed to load payout account' }, { status: 500 });
    return NextResponse.json({ account, pendingAccount, accounts });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user) => {
    let plaidAccessToken = null;
    try {
      if (!(await isPayoutPartner(getAdminClient(), user))) {
        return NextResponse.json({ error: 'Partner access required' }, { status: 403 });
      }

      const body = await request.json().catch(() => ({}));
      let record;

      if (body.method === 'plaid_ach') {
        if (!body.public_token || !body.plaid_account_id) {
          return NextResponse.json({ error: 'Missing Plaid data' }, { status: 400 });
        }

        const ex = await plaidClient.itemPublicTokenExchange({ public_token: body.public_token });
        const { access_token, item_id } = ex.data;
        plaidAccessToken = access_token;

        const authRes = await plaidClient.authGet({ access_token });
        const acct = authRes.data.accounts.find((a) => a.account_id === body.plaid_account_id);
        const numbers = authRes.data.numbers.ach.find(
          (n) => n.account_id === body.plaid_account_id,
        );
        if (!acct || !numbers) {
          await removePlaidItem(access_token);
          return NextResponse.json({ error: 'Account not found on item' }, { status: 400 });
        }

        // authGet only exposes institution_id; resolve the display name the
        // same way exchange-token does, falling back to the id.
        const institutionId = authRes.data.item?.institution_id || null;
        let institutionName = institutionId;
        if (institutionId) {
          try {
            const instRes = await plaidClient.institutionsGetById({
              institution_id: institutionId,
              country_codes: ['US'],
            });
            institutionName = instRes.data.institution.name;
          } catch {
            /* keep the id */
          }
        }

        record = {
          user_id: user.id,
          method: 'plaid_ach',
          institution_name: institutionName,
          account_name: acct.name || acct.official_name || 'Bank account',
          account_last4: String(numbers.account).slice(-4),
          routing_last4: String(numbers.routing).slice(-4),
          plaid_item_id: item_id,
          plaid_access_token_enc: encryptToken(access_token),
          plaid_account_id: body.plaid_account_id,
          status: 'active',
        };
      } else if (body.method === 'manual_ach') {
        const { accountNumber, routingNumber, accountName, institutionName } = body;
        if (!/^\d{4,17}$/.test(accountNumber || '')) {
          return NextResponse.json({ error: 'Invalid account number' }, { status: 400 });
        }
        if (!isValidRouting(routingNumber || '')) {
          return NextResponse.json({ error: 'Invalid routing number' }, { status: 400 });
        }

        record = {
          user_id: user.id,
          method: 'manual_ach',
          institution_name: (institutionName || '').slice(0, 120) || null,
          account_name: (accountName || '').slice(0, 120) || 'Bank account',
          account_last4: accountNumber.slice(-4),
          routing_last4: routingNumber.slice(-4),
          status: 'pending_verification',
        };
        // Full account/routing numbers are used for validation and masking only.
        // They are NOT persisted. Actual ACH origination happens through the
        // payout processor when payouts run; this record identifies the account.
      } else {
        return NextResponse.json({ error: 'Unknown method' }, { status: 400 });
      }

      // PAR-4: a manual account is stored as pending_verification and does
      // not retire the active one; a Plaid account replaces it.
      const { error: saveErr, account } = await savePayoutAccount(
        getAdminClient(),
        user.id,
        record,
      );
      if (saveErr) {
        await removePlaidItem(plaidAccessToken);
        logger.error('Payout account insert failed', { userId: user.id, error: saveErr });
        return NextResponse.json({ error: 'Failed to link account' }, { status: 500 });
      }

      return NextResponse.json({ account });
    } catch (error) {
      await removePlaidItem(plaidAccessToken);
      console.error('[Payouts] account link error:', error?.response?.data || error.message);
      return NextResponse.json({ error: 'Failed to link account' }, { status: 500 });
    }
  },
  { requireAuth: true },
);

export const DELETE = withApiGuard(
  async (request, user) => {
    if (!(await isPayoutPartner(getAdminClient(), user))) {
      return NextResponse.json({ error: 'Partner access required' }, { status: 403 });
    }
    const id = new URL(request.url).searchParams.get('id');
    const { error } = await removePayoutAccount(getAdminClient(), user.id, id || null);
    if (error) return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
