import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { getSnapTradeClient, ensureSnapTradeUser } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/snaptrade/connect-url
 *
 * Strategy: try the requested broker hint first. If SnapTrade returns 400
 * (usually a bad slug — broker slug ≠ display name), retry without the hint
 * so the user lands on the broker picker inside SnapTrade. Always returns
 * a structured { error, code } payload — never bubbles raw SDK messages.
 */
export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Please sign in.', code: 'auth_required' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const broker = body.broker;
  const connectionType = body.connectionType === 'trade' ? 'trade' : 'read';

  let creds;
  try {
    creds = await ensureSnapTradeUser(user.id);
  } catch (err) {
    console.error('[snaptrade/connect-url] ensureUser failed', {
      userId: user.id,
      status: err?.response?.status,
      data: err?.response?.data,
      message: err?.message,
    });
    return NextResponse.json(
      { error: 'Could not initialize your secure connection.', code: 'init_failed' },
      { status: 502 },
    );
  }

  const snaptrade = getSnapTradeClient();
  const origin = request.nextUrl.origin;
  const customRedirect = `${origin}/portfolio/connect-callback`;

  try {
    const res = await snaptrade.authentication.loginSnapTradeUser({
      userId: creds.userId,
      userSecret: creds.userSecret,
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
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail;
    console.error('[snaptrade/connect-url] first attempt failed', {
      broker,
      status,
      detail,
      requestId: err?.response?.headers?.['x-request-id'],
    });

    if (status === 400 && broker) {
      try {
        const res = await snaptrade.authentication.loginSnapTradeUser({
          userId: creds.userId,
          userSecret: creds.userSecret,
          immediateRedirect: false,
          customRedirect,
          connectionType,
        });
        console.warn(
          '[snaptrade/connect-url] slug rejected, succeeded without it. Update slug for:',
          broker,
        );
        return NextResponse.json({
          redirectURI: res.data.redirectURI,
          sessionId: res.data.sessionId,
          _note: 'broker_slug_unsupported_fell_back_to_picker',
        });
      } catch (retryErr) {
        console.error('[snaptrade/connect-url] retry without broker also failed', {
          status: retryErr?.response?.status,
          detail: retryErr?.response?.data?.detail,
        });
      }
    }

    if (status === 429) {
      return NextResponse.json(
        {
          error: 'Too many requests right now. Please wait a moment and try again.',
          code: 'rate_limited',
        },
        { status: 429 },
      );
    }
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { error: 'Authentication issue. Please try again.', code: 'auth_failed' },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: 'Could not open the connection portal.', code: 'portal_unavailable' },
      { status: 502 },
    );
  }
}
