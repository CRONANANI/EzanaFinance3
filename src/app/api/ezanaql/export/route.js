/**
 * POST /api/ezanaql/export — run a query and stream a CSV/JSON download.
 * Body: { query: string, format: 'csv'|'json' }. Session optional; guests are rate-limited per IP.
 */
import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { runEzanaQL } from '@/lib/ezanaql';

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
    user ? `ezanaql:export:${user.id}` : `ezanaql:export:ip:${getClientIp(request)}`,
    { interval: 60000, limit: user ? 15 : 8 },
  );
  if (!rl.success) return rateLimitResponse(rl);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 });
  }
  const query = typeof body?.query === 'string' ? body.query : '';
  const format = body?.format === 'json' ? 'json' : 'csv';
  if (!query.trim())
    return NextResponse.json({ ok: false, error: 'No query provided.' }, { status: 400 });

  const out = await runEzanaQL({
    query,
    admin: getAdminClient(),
    userId: user?.id ?? null,
    format,
  });
  if (!out.ok) return NextResponse.json(out, { status: 400 });

  const { contentType, body: fileBody } = out.result;
  const ext = format === 'json' ? 'json' : 'csv';
  return new NextResponse(fileBody, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="ezanaql-report.${ext}"`,
    },
  });
}
