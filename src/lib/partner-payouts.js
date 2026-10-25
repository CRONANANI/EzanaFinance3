import { isActivePartner } from '@/lib/partner-access';

/**
 * Partner payout accounts (`partner_payout_accounts`). Routes stay thin and
 * call these; `db` is the service-role client and every query is scoped to
 * the authenticated user's id. Tested in scripts/check-partner-pipeline.mjs.
 *
 * Lifecycle (QA PAR-4):
 *   plaid_ach   -> inserted `active` (Plaid Auth already verified ownership);
 *                  replaces the previous active account and any pending one.
 *   manual_ach  -> inserted `pending_verification`; the current `active`
 *                  account keeps receiving payouts until the new one verifies.
 *   removed     -> soft-delete, from either state.
 *
 * TODO(PAR-4, product decision pending): nothing moves a manual_ach account
 * from `pending_verification` to `active` yet. Pick a verification method
 * (micro-deposits, or Plaid Auth / Same Day micro-deposits through Link) and
 * implement the promotion step: on success, retire the old active row and set
 * this one `active` in one write (partner_payout_accounts_one_active is a
 * unique partial index on (user_id) where status = 'active').
 */

export const PAYOUT_ACCOUNT_PUBLIC_FIELDS =
  'id, method, institution_name, account_name, account_last4, routing_last4, status, created_at';

export const VISIBLE_PAYOUT_ACCOUNT_STATUSES = ['active', 'pending_verification'];

/**
 * Shared guard for partner payout API routes: the caller must be an active
 * partner by the ONE definition in src/lib/partner-access.js (QA PAR-3), the
 * same check requirePartner, the post-login router and /api/partner/status use.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ id: string, app_metadata?: object }} user
 */
export function isPayoutPartner(db, user) {
  return isActivePartner(db, user);
}

/**
 * The caller's visible payout accounts, newest first.
 * @returns {Promise<{ error: string|null, accounts: object[], account: object|null, pendingAccount: object|null }>}
 */
export async function listPayoutAccounts(db, userId) {
  const { data, error } = await db
    .from('partner_payout_accounts')
    .select(PAYOUT_ACCOUNT_PUBLIC_FIELDS)
    .eq('user_id', userId)
    .in('status', VISIBLE_PAYOUT_ACCOUNT_STATUSES)
    .order('created_at', { ascending: false });
  if (error) return { error: error.message, accounts: [], account: null, pendingAccount: null };
  const accounts = data || [];
  return {
    error: null,
    accounts,
    account: accounts.find((a) => a.status === 'active') || null,
    pendingAccount: accounts.find((a) => a.status === 'pending_verification') || null,
  };
}

/**
 * Insert a new payout account record (built and validated by the route).
 * Returns { error, account }. If the insert fails, the rows it would have
 * replaced are restored, so a failed link never leaves the partner with no
 * payout account.
 */
export async function savePayoutAccount(db, userId, record) {
  // A verified Plaid account supersedes everything; a manual one only
  // replaces an earlier pending manual entry, never the active account.
  const toRetire =
    record.status === 'active' ? VISIBLE_PAYOUT_ACCOUNT_STATUSES : ['pending_verification'];

  const { data: prior, error: priorErr } = await db
    .from('partner_payout_accounts')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', toRetire);
  if (priorErr) return { error: priorErr.message, account: null };

  const now = new Date().toISOString();
  for (const row of prior || []) {
    const { error } = await db
      .from('partner_payout_accounts')
      .update({ status: 'removed', updated_at: now })
      .eq('id', row.id)
      .eq('user_id', userId);
    if (error) return { error: error.message, account: null };
  }

  const { data, error } = await db
    .from('partner_payout_accounts')
    .insert({ ...record, user_id: userId })
    .select(PAYOUT_ACCOUNT_PUBLIC_FIELDS)
    .single();
  if (error) {
    for (const row of prior || []) {
      await db
        .from('partner_payout_accounts')
        .update({ status: row.status, updated_at: now })
        .eq('id', row.id)
        .eq('user_id', userId);
    }
    return { error: error.message, account: null };
  }
  return { error: null, account: data };
}

/**
 * Soft-remove one account (by id) or, with no id, every visible account.
 * Active and pending_verification rows are both removable.
 */
export async function removePayoutAccount(db, userId, accountId = null) {
  let q = db
    .from('partner_payout_accounts')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('status', VISIBLE_PAYOUT_ACCOUNT_STATUSES);
  if (accountId) q = q.eq('id', accountId);
  const { error } = await q;
  return { error: error ? error.message : null };
}
