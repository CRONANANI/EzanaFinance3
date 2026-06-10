import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin-helpers';

/**
 * Admin routes: allow a service bearer secret (ADMIN_LOCK_SECRET / CRON_SECRET)
 * or a TRUSTED admin session.
 *
 * SECURITY — why we no longer trust `user_metadata.role`:
 *   `user_metadata` (Supabase `raw_user_meta_data`) is editable by the user
 *   themselves via `supabase.auth.updateUser({ data: { role: 'admin' } })`.
 *   Gating admin access on `user_metadata.role === 'admin'` therefore let ANY
 *   logged-in user self-promote to admin and hit every admin endpoint
 *   (lock/unlock arbitrary accounts, award reputation, run jobs, …).
 *
 *   Admin status is now derived only from sources the user cannot forge:
 *     - the `ADMIN_EMAILS` server-env allowlist (`isAdminUser`), which the rest
 *       of the admin surface already uses, and
 *     - `app_metadata` (`raw_app_meta_data`), which only the service role can set.
 *
 * @returns {NextResponse|null} 403 response, or null if allowed.
 */
export function requireAdminAccess(request, user) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const adminOk = process.env.ADMIN_LOCK_SECRET && token === process.env.ADMIN_LOCK_SECRET;
  const cronOk = process.env.CRON_SECRET && token === process.env.CRON_SECRET;
  if (adminOk || cronOk) return null;

  if (isAdminUser(user)) return null;
  if (user?.app_metadata?.role === 'admin') return null;

  return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
}
