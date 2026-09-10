import { NextResponse } from 'next/server';
import { isAdminUser } from './admin-helpers';

/**
 * Admin routes: allow service bearer (ADMIN_LOCK_SECRET / CRON_SECRET) or logged-in admin session.
 */
/**
 * @returns {NextResponse|null} 403 response, or null if allowed (bearer secret/cron or session admin).
 *
 * SECURITY: the session check must never trust `user_metadata` — that object
 * is writable by the user themselves via supabase.auth.updateUser(), so a
 * `user_metadata.role === 'admin'` check is a self-service privilege
 * escalation. Only `app_metadata` (service-role writable) and the
 * ADMIN_EMAILS allowlist are trusted here.
 */
export function requireAdminAccess(request, user) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const adminOk = process.env.ADMIN_LOCK_SECRET && token === process.env.ADMIN_LOCK_SECRET;
  const cronOk = process.env.CRON_SECRET && token === process.env.CRON_SECRET;
  if (adminOk || cronOk) return null;
  if (user?.app_metadata?.role === 'admin') return null;
  if (isAdminUser(user)) return null;
  return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
}
