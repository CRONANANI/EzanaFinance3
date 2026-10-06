/** Shared by the /api/admin/waitlist routes: the admin check and row columns. */
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';

export const WAITLIST_ADMIN_COLS =
  'id, email, full_name, status, created_at, approved_at, invite_expires_at, joined_at, legacy_number, metadata';

/** The signed-in admin, or a 403 response to return as is. */
export async function requireWaitlistAdmin(request) {
  const user = await getAuthUser(request).catch(() => null);
  if (!isAdminUser(user)) {
    return { denied: NextResponse.json({ ok: false, error: 'Not available.' }, { status: 403 }) };
  }
  return { user };
}
