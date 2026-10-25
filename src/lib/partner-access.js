/**
 * Canonical "is this user an active partner?" check: the SINGLE definition used
 * by the post-login router (AuthCallbackClient.routeAfterSession), the
 * server-side partner route gate (requirePartner), the payout API routes,
 * GET /api/partner/status (which PartnerContext reads) and the Sonar
 * entitlement routes, so who is a partner can never drift between them (QA
 * PAR-3).
 *
 * A partner has an active row in `partners`, or is flagged in
 * app_metadata.partner_role (set only with the service role).
 * `profiles.is_partner` is NOT the source of truth: it is a display flag that
 * the admin toggle and the application approval keep in step with `partners`.
 * user_metadata is NOT trusted: any user can write it with
 * supabase.auth.updateUser() (security assessment F-02).
 *
 * Isomorphic: takes any Supabase client (browser, cookie-scoped server or the
 * service-role client) plus either the resolved auth user or a bare user id.
 * With a bare id only the `partners` row is checked, since app_metadata needs
 * the user object.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ id: string, app_metadata?: Record<string, unknown> } | string | null | undefined} userOrId
 * @returns {Promise<boolean>}
 */
export async function isActivePartner(supabase, userOrId) {
  if (!userOrId) return false;
  const user = typeof userOrId === 'string' ? { id: userOrId } : userOrId;
  if (!user.id) return false;
  if (user.app_metadata?.partner_role) return true;
  const { data } = await getActivePartnerRow(supabase, user.id, 'id');
  return !!data;
}

/** The caller's active `partners` row (or null), selecting `cols`. */
export function getActivePartnerRow(supabase, userId, cols = '*') {
  return supabase
    .from('partners')
    .select(cols)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
}
