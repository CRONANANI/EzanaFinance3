/**
 * Shared guard for partner payout API routes: the caller must be an active
 * partner (same source of truth as PartnerContext and /api/partner/profile,
 * the `partners` table with status = 'active').
 */
import { supabaseAdmin } from '@/lib/plaid';

export async function isActivePartner(userId) {
  const { data } = await supabaseAdmin
    .from('partners')
    .select('user_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  return Boolean(data);
}
