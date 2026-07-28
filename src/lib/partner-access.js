/**
 * Canonical "is this user an active partner?" check — the SINGLE definition used
 * by both the post-login router (AuthCallbackClient.routeAfterSession) and the
 * server-side partner route gate, so who the router sends to /partner-home and
 * who the partner gate admits can never drift apart.
 *
 * Isomorphic: takes any Supabase client (browser or cookie-scoped server) plus
 * the already-resolved auth user, so it works from a client component and a
 * server component alike. A partner is either flagged in user metadata or has an
 * active row in `partners`.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ id: string, user_metadata?: Record<string, unknown> } | null | undefined} user
 * @returns {Promise<boolean>}
 */
export async function isActivePartner(supabase, user) {
  if (!user) return false;
  if (user.user_metadata?.partner_role) return true;
  const { data } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  return !!data;
}
