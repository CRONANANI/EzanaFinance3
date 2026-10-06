/**
 * POST /api/ezanaql/run — validate → compile → execute → return results.
 * Body: { query: string, dimension: string, format?: 'table'|'csv'|'json' }.
 * `dimension` is required: queries are scoped to one dataset dimension (hub). Session optional; guests are
 * rate-limited per IP and always get the table format (files need an account).
 */
import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { runEzanaQL } from '@/lib/ezanaql';
import { requireDimension } from '@/lib/ezanaql/request-scope';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  /* Every live dataset is public data (the catalog's only user_private
     dataset is unavailable, and rlsFilter refuses it without a user anyway),
     so a session is optional: it only widens the rate limit. Guests are
     limited per IP, more tightly. */
  let user = null;
  try {
    ({ user } = await requireUser(request));
  } catch {
    user = null;
  }
  const rl = await checkRateLimit(
    user ? `ezanaql:run:${user.id}` : `ezanaql:run:ip:${getClientIp(request)}`,
    { interval: 60000, limit: user ? 30 : 20 },
  );
  if (!rl.success) return rateLimitResponse(rl);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 });
  }
  const scope = requireDimension(body);
  if (scope.response) return scope.response;
  const query = typeof body?.query === 'string' ? body.query : '';
  /* Guests see the table; file formats are the export feature, which needs an account. */
  const format = user && ['table', 'csv', 'json'].includes(body?.format) ? body.format : 'table';
  if (!query.trim())
    return NextResponse.json({ ok: false, error: 'No query provided.' }, { status: 400 });

  const out = await runEzanaQL({
    query,
    admin: getAdminClient(),
    userId: user?.id ?? null,
    dimension: scope.dimension,
    format,
  });
  if (!out.ok) return NextResponse.json(out, { status: 400 });
  return NextResponse.json(out);
}
