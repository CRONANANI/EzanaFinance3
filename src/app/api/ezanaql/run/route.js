/**
 * POST /api/ezanaql/run — validate → compile → execute → return results.
 * Body: { query: string, format?: 'table'|'csv'|'json' }. Auth required.
 */
import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { runEzanaQL } from '@/lib/ezanaql';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    user = null;
  }
  if (!user)
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });

  const rl = await checkRateLimit(`ezanaql:run:${user.id || getClientIp(request)}`, {
    interval: 60000,
    limit: 30,
  });
  if (!rl.success) return rateLimitResponse(rl);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 });
  }
  const query = typeof body?.query === 'string' ? body.query : '';
  const format = ['table', 'csv', 'json'].includes(body?.format) ? body.format : 'table';
  if (!query.trim())
    return NextResponse.json({ ok: false, error: 'No query provided.' }, { status: 400 });

  const out = await runEzanaQL({ query, admin: getAdminClient(), userId: user.id, format });
  if (!out.ok) return NextResponse.json(out, { status: 400 });
  return NextResponse.json(out);
}
