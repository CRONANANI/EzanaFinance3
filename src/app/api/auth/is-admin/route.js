/**
 * GET /api/auth/is-admin -> { isAdmin: boolean }
 *
 * Lets the browser decide whether to show admin UI without shipping the admin
 * allowlist in the client bundle. UI only: every admin API re-checks on the
 * server with isAdminUser(). Signed-out callers get { isAdmin: false }.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const user = await getCurrentUser(request);
  return NextResponse.json(
    { isAdmin: isAdminUser(user) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
