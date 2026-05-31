import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { getSnapTradeClient, ensureSnapTradeUser } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const broker = body.broker;
    const connectionType = body.connectionType === 'trade' ? 'trade' : 'read';

    const { userId, userSecret } = await ensureSnapTradeUser(user.id);
    const snaptrade = getSnapTradeClient();

    const origin = request.nextUrl.origin;
    const customRedirect = `${origin}/portfolio/connect-callback`;

    const res = await snaptrade.authentication.loginSnapTradeUser({
      userId,
      userSecret,
      broker: broker || undefined,
      immediateRedirect: false,
      customRedirect,
      connectionType,
    });

    return NextResponse.json({
      redirectURI: res.data.redirectURI,
      sessionId: res.data.sessionId,
    });
  } catch (err) {
    console.error('[snaptrade/connect-url]', err);
    return NextResponse.json(
      { error: err?.response?.data?.detail || err?.message || 'Failed to create connection URL' },
      { status: 502 },
    );
  }
}
