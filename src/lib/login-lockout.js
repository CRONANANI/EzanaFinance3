import { getAdminClient } from '@/lib/supabase';
import { logSecurityEvent } from './security-audit';

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_WINDOW_MINUTES = 60;

/**
 * Record a login attempt and check if the account should be (temporarily)
 * locked.
 *
 * SECURITY NOTE — why this no longer flips `profiles.is_disabled`:
 *   This is reached from `/api/auth/record-attempt`, an UNAUTHENTICATED
 *   endpoint whose `{ email, success }` is supplied by the caller. The old
 *   implementation, on 10 failed attempts, set `profiles.is_disabled = true`
 *   — a PERMANENT, admin-cleared flag that the middleware treats as a hard
 *   account lock (force sign-out + redirect to /account-locked). That let an
 *   unauthenticated attacker permanently lock any user out of their account
 *   just by POSTing failed attempts for their email (an account-takeover-
 *   adjacent denial of service).
 *
 *   The lockout is now purely the time-windowed `login_attempts` count, which
 *   `isLockedOut()` / `/api/auth/check-lockout` already enforce and which
 *   self-heals after LOCKOUT_WINDOW_MINUTES — matching the user-facing
 *   "Try again in 1 hour" message. `profiles.is_disabled` is reserved for
 *   deliberate administrative locks only.
 */
export async function recordLoginAttempt(email, ip, success) {
  const admin = getAdminClient();

  await admin.from('login_attempts').insert({
    email: email.toLowerCase(),
    ip_address: ip,
    success,
  });

  if (success) {
    return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS };
  }

  const cutoff = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('email', email.toLowerCase())
    .eq('success', false)
    .gte('created_at', cutoff);

  if (error) {
    console.warn('[login-lockout] count query failed:', error.message);
    return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS };
  }

  const failedCount = count || 0;
  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - failedCount);

  if (failedCount >= MAX_FAILED_ATTEMPTS) {
    // Temporary, self-healing lockout only — see the SECURITY NOTE above.
    // Do NOT set profiles.is_disabled here: this code path is driven by an
    // unauthenticated, client-asserted endpoint.
    await logSecurityEvent('account_locked_brute_force', {
      ip,
      details: {
        email: email.toLowerCase(),
        failedAttempts: failedCount,
        windowMinutes: LOCKOUT_WINDOW_MINUTES,
        lockoutType: 'temporary',
      },
    });

    return { locked: true, attemptsRemaining: 0 };
  }

  return { locked: false, attemptsRemaining: remaining };
}

/**
 * Check if an email is currently locked out (without recording an attempt).
 */
export async function isLockedOut(email) {
  const admin = getAdminClient();
  const cutoff = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count } = await admin
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('email', email.toLowerCase())
    .eq('success', false)
    .gte('created_at', cutoff);

  return (count || 0) >= MAX_FAILED_ATTEMPTS;
}
