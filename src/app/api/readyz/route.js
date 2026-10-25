/**
 * GET /api/readyz: readiness, for the uptime monitor (docs/ops/UPTIME.md).
 * 200 when the database answers within 3 s, else 503. Providers are
 * informational. Anonymous callers see the status only; admins (session or
 * admin token, the existing admin check) see the breakdown. Not rate
 * limited, never cached.
 */
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase';
import { requireAdminAccess } from '@/lib/admin-auth';
import { readiness, NO_STORE } from '@/lib/health/readiness';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { ready, body } = await readiness();
  const user = await getAuthUser(request).catch(() => null);
  const operator = requireAdminAccess(request, user) === null;
  return NextResponse.json(operator ? body : { status: body.status, timestamp: body.timestamp }, {
    status: ready ? 200 : 503,
    headers: NO_STORE,
  });
}
