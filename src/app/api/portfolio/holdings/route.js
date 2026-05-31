import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    await requireUser(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = request.nextUrl.origin;
  const cookie = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';

  try {
    const r = await fetch(`${origin}/api/snaptrade/holdings`, {
      headers: { cookie, authorization: authHeader },
      cache: 'no-store',
    });
    if (r.ok) {
      const data = await r.json();
      if (data?.connected && (data?.aggregated?.length ?? 0) > 0) {
        return NextResponse.json({ ...data, source: 'snaptrade' });
      }
      if (data?.connected) {
        return NextResponse.json({ ...data, source: 'snaptrade' });
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const r = await fetch(`${origin}/api/plaid/holdings`, {
      headers: { cookie, authorization: authHeader },
      cache: 'no-store',
    });
    if (r.ok) {
      const data = await r.json();
      if (data?.aggregated?.length || data?.connected) {
        return NextResponse.json({ ...data, source: 'plaid' });
      }
    }
  } catch {
    /* fall through */
  }

  return NextResponse.json({ connected: false, aggregated: [], source: null });
}
