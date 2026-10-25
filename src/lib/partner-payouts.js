import { isActivePartner } from '@/lib/partner-access';

/**
 * Shared guard for partner payout API routes: the caller must be an active
 * partner by the ONE definition in src/lib/partner-access.js (QA PAR-3), the
 * same check requirePartner, the post-login router and /api/partner/status use.
 * `db` is the service-role client the payout routes already hold; the check
 * is scoped to the authenticated user's own id.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ id: string, app_metadata?: object }} user
 */
export function isPayoutPartner(db, user) {
  return isActivePartner(db, user);
}
