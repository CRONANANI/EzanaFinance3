/**
 * POST /api/ezanaql/export — run a query and stream a CSV/JSON download.
 * Body: { query: string, format: 'csv'|'json' }. Session required: running a
 * report is open to guests, downloading it is an account feature.
 */
import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { runEzanaQL } from '@/lib/ezanaql';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  /* Unauthenticated requests stop here, before any work. */
  let user = null;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json(
      { ok: false, code: 'auth_required', error: 'Create an account to export reports.' },
      { status: 401 },
    );
  }
  const rl = await checkRateLimit(`ezanaql:export:${user.id}`, { interval: 60000, limit: 15 });
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
    userId: user.id,
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
