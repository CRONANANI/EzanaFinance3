import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ADMIN_SECRET = process.env.ADMIN_LOCK_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/admin/portfolio-snapshot/run
 * Body: { "job": "daily" | "monthly" }
 * Auth: Bearer ADMIN_LOCK_SECRET
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization') || '';
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!ADMIN_SECRET || provided !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const job = body?.job;
  if (!['daily', 'monthly'].includes(job)) {
    return NextResponse.json({ error: 'job must be "daily" or "monthly"' }, { status: 400 });
  }

  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }

  const path = job === 'daily' ? '/api/cron/portfolio-snapshot' : '/api/cron/monthly-elo';
  const url = `${request.nextUrl.origin}${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CRON_SECRET}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json({ triggered: job, status: response.status, response: data });
}
