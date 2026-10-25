import { getAdminClient } from '@/lib/supabase';

/*
 * Login attempt log (QA RET-9).
 *
 * The app used to count failed sign-ins reported by the browser
 * (`POST /api/auth/record-attempt { email, success:false }`) and lock the
 * email out (HTTP 423) after 10. Those reports were unauthenticated, so
 * anyone could lock a victim's web sign-in by posting their email ten times.
 *
 * Now only a SUCCESSFUL sign-in is recorded, and only for the authenticated
 * caller (the route derives the email from the session, never the body).
 * There is no app-level lockout: brute-force protection is Supabase Auth's
 * own credential rate limits plus the per-IP limits on the auth endpoints
 * (`enforceAuthRateLimit`). A server-counted lockout can return if password
 * sign-in is ever proxied through a server route that sees the outcome.
 */

/** Record a successful sign-in for an authenticated user. Never throws. */
export async function recordLoginSuccess(admin, { email, ip }) {
  const { error } = await admin.from('login_attempts').insert({
    email: String(email || '').toLowerCase(),
    ip_address: ip || null,
    success: true,
  });
  if (error) {
    console.warn('[login-lockout] success insert failed:', error.message);
    return { recorded: false };
  }
  return { recorded: true };
}

export function getLoginAttemptsClient() {
  return getAdminClient();
}
