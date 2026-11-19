/**
 * Invite gate for Google and GitHub sign-in.
 *
 * Sign-up is invite-only (see /api/auth/accept-invite). A provider sign-in
 * for an email Ezana has never seen makes the auth provider create a user on
 * the spot, so every provider sign-in is classified here, server side, before
 * the account can be used:
 *
 *   verified   the account is already established (profile.email_verified, or
 *              the waitlist row says this user joined). Let it through.
 *   legacy     an unverified account that has a password. Unchanged behaviour:
 *              it goes on to the email verification step.
 *   invited    provider-only, not yet established, and the waitlist holds a
 *              live approved invite for the same email. The provider has
 *              proven the email, which is all the invite link proves, so the
 *              account may be finished (/api/auth/oauth-complete).
 *   uninvited  provider-only with no invite. Not allowed in.
 *
 * Everything is read with the service-role client, never from the session's
 * own claims, so nothing here is caller-writable.
 */
export async function classifyOAuthAccount(admin, userId) {
  const { data: got, error: userErr } = await admin.auth.admin.getUserById(userId);
  const user = got?.user || null;
  if (userErr || !user) return { state: 'unknown', user: null, invite: null };

  const { data: profile } = await admin
    .from('profiles')
    .select('email_verified')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.email_verified === true) return { state: 'verified', user, invite: null };

  const { data: joined } = await admin
    .from('waitlist')
    .select('id')
    .eq('joined_user_id', userId)
    .limit(1);
  if (joined && joined.length) return { state: 'verified', user, invite: null };

  const providers = new Set([
    ...(Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : []),
    ...(user.identities || []).map((i) => i.provider),
  ]);
  if (providers.has('email')) return { state: 'legacy', user, invite: null };

  const email = String(user.email || '')
    .trim()
    .toLowerCase();
  if (email && user.email_confirmed_at) {
    const { data: rows } = await admin
      .from('waitlist')
      .select('id, email, full_name, status, invite_expires_at, metadata')
      .eq('email', email)
      .eq('status', 'approved')
      .limit(1);
    const invite = rows?.[0];
    if (invite?.invite_expires_at && new Date(invite.invite_expires_at).getTime() > Date.now()) {
      return { state: 'invited', user, invite };
    }
  }
  return { state: 'uninvited', user, invite: null };
}
