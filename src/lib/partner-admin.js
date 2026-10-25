/**
 * Server-only writers for partner standing. Granting or revoking partner
 * access touches three places that must agree (QA PAR-3):
 *   1. `partners` row (status active / inactive): what isActivePartner reads
 *   2. auth app_metadata.partner_role: what the sign-in router and
 *      withApiGuard({ requiredRole }) read
 *   3. `profiles.is_partner`: the display flag (service role passes the
 *      profiles_guard_privileged trigger)
 *
 * Callers MUST have already checked admin access; `db` is the service-role
 * client. Each step's error is returned, never swallowed.
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db service-role client
 * @param {{ userId: string, partnerType?: string|null, displayName?: string|null,
 *           username?: string|null, profileUpdates?: object, markApproved?: boolean }} opts
 * @returns {Promise<{ error: string|null, partner?: object }>}
 */
export async function grantPartnerAccess(
  db,
  {
    userId,
    partnerType = null,
    displayName = null,
    username = null,
    profileUpdates = {},
    markApproved = false,
  },
) {
  const now = new Date().toISOString();
  const row = { user_id: userId, status: 'active', updated_at: now };
  if (markApproved) row.approved_at = now;
  if (partnerType) row.partner_type = partnerType;
  if (displayName) row.display_name = displayName;
  if (username) row.username = username;

  const { data: partner, error: pErr } = await db
    .from('partners')
    .upsert(row, { onConflict: 'user_id' })
    .select('id, user_id, status, partner_type, display_name, username, verified')
    .single();
  if (pErr) return { error: `partners upsert failed: ${pErr.message}` };

  const { error: profErr } = await db
    .from('profiles')
    .update({ is_partner: true, ...profileUpdates })
    .eq('id', userId);
  if (profErr) return { error: `profiles update failed: ${profErr.message}` };

  const metaErr = await setPartnerRoleClaim(db, userId, 'partner');
  if (metaErr) return { error: metaErr };

  return { error: null, partner };
}

/**
 * Deactivate (never delete: payouts and articles reference the row).
 * @returns {Promise<{ error: string|null }>}
 */
export async function revokePartnerAccess(db, { userId, profileUpdates = {} }) {
  const { error: pErr } = await db
    .from('partners')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (pErr) return { error: `partners update failed: ${pErr.message}` };

  const { error: profErr } = await db
    .from('profiles')
    .update({ is_partner: false, ...profileUpdates })
    .eq('id', userId);
  if (profErr) return { error: `profiles update failed: ${profErr.message}` };

  const metaErr = await setPartnerRoleClaim(db, userId, null);
  if (metaErr) return { error: metaErr };
  return { error: null };
}

/** Merge partner_role into app_metadata, keeping the user's other claims. */
async function setPartnerRoleClaim(db, userId, role) {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data?.user) return `auth user lookup failed: ${error?.message || 'not found'}`;
  const current = data.user.app_metadata || {};
  if ((current.partner_role || null) === role) return null;
  const { error: upErr } = await db.auth.admin.updateUserById(userId, {
    app_metadata: { ...current, partner_role: role },
  });
  return upErr ? `app_metadata update failed: ${upErr.message}` : null;
}

/**
 * Find an auth user's id by email (service role). There is no direct
 * lookup in auth-js, so page through listUsers like login-lockout does.
 * @returns {Promise<{ id: string|null, error: string|null }>}
 */
export async function findAuthUserIdByEmail(db, email) {
  const normalized = String(email || '').toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) return { id: null, error: error.message };
    const users = data?.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return { id: match.id, error: null };
    if (users.length < perPage) break;
  }
  return { id: null, error: null };
}

/**
 * Reuse the auth user for `email`, or invite one (Supabase sends the invite).
 * @returns {Promise<{ id: string|null, invited: boolean, error: string|null }>}
 */
export async function findOrInviteAuthUser(db, email, redirectTo) {
  const existing = await findAuthUserIdByEmail(db, email);
  if (existing.error) return { id: null, invited: false, error: existing.error };
  if (existing.id) return { id: existing.id, invited: false, error: null };
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error || !data?.user?.id) {
    return { id: null, invited: false, error: `invite failed: ${error?.message || 'no user'}` };
  }
  return { id: data.user.id, invited: true, error: null };
}
