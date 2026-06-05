import { NextResponse } from 'next/server';

/**
 * Admin routes: allow service bearer (ADMIN_LOCK_SECRET / CRON_SECRET) or logged-in admin session.
 */
/**
 * @returns {NextResponse|null} 403 response, or null if allowed (bearer secret/cron or session admin).
 */
export function requireAdminAccess(request, user) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const adminOk = process.env.ADMIN_LOCK_SECRET && token === process.env.ADMIN_LOCK_SECRET;
  const cronOk = process.env.CRON_SECRET && token === process.env.CRON_SECRET;
  if (adminOk || cronOk) return null;
  if (user?.user_metadata?.role === 'admin') return null;
  return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
}
