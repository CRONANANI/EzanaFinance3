import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import { refreshBrokerageCache, readSnapTradeError } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await refreshBrokerageCache();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const info = readSnapTradeError(err);
    console.error('[admin/snaptrade/refresh-brokerages]', info);
    return NextResponse.json(
      { error: 'Refresh failed', detail: info.detail || err?.message },
      { status: 502 },
    );
  }
}

export async function OPTIONS(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return new NextResponse(null, { status: 401 });
  }
  if (!isAdminUser(user)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 200 });
}
