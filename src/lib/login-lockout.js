import { getAdminClient } from '@/lib/supabase';
import { logSecurityEvent } from './security-audit';

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_WINDOW_MINUTES = 60;

async function findUserIdByEmail(admin, email) {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 50) {
    const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page, perPage });
    if (listErr) {
      console.warn('[login-lockout] listUsers failed:', listErr.message);
      return null;
    }
    const users = listData?.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match.id;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

/**
 * Record a login attempt and check if the account should be locked.
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
    const userId = await findUserIdByEmail(admin, email);
    if (userId) {
      await admin
        .from('profiles')
        .update({
          is_disabled: true,
          disabled_reason: 'Too many failed login attempts',
          disabled_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    await logSecurityEvent('account_locked_brute_force', {
      ip,
      details: {
        email: email.toLowerCase(),
        failedAttempts: failedCount,
        windowMinutes: LOCKOUT_WINDOW_MINUTES,
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
