import { getAdminClient } from '@/lib/supabase';
/**
 * Shared guard for partner payout API routes: the caller must be an active
 * partner (same source of truth as PartnerContext and /api/partner/profile,
 * the `partners` table with status = 'active').
 */

export async function isActivePartner(userId) {
  const { data } = await getAdminClient()
    .from('partners')
    .select('user_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  return Boolean(data);
}
