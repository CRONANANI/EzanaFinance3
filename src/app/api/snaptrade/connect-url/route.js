import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { getSnapTradeClient, ensureSnapTradeUser, readSnapTradeError } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/snaptrade/connect-url
 *
 * Strategy: try the requested broker hint first. If SnapTrade returns 400
 * (usually a bad slug), retry without the hint so the user lands on the
 * brokerage picker inside SnapTrade.
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
  const connectionType =
    body.connectionType === 'trade'
      ? 'trade'
      : body.connectionType === 'read'
        ? 'read'
        : 'trade-if-available';

  let creds;
  try {
    creds = await ensureSnapTradeUser(user.id);
  } catch (err) {
    const info = readSnapTradeError(err);
    console.error('[snaptrade/connect-url] ensureUser failed', {
      userId: user.id,
      ...info,
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

  async function tryLogin({ withBroker }) {
    return snaptrade.authentication.loginSnapTradeUser({
      userId: creds.userId,
      userSecret: creds.userSecret,
      broker: withBroker ? broker : undefined,
      immediateRedirect: false,
      customRedirect,
      connectionType,
    });
  }

  try {
    const res = await tryLogin({ withBroker: !!broker });
    const redirectURI = res?.data?.redirectURI;
    if (!redirectURI) {
      console.error('[snaptrade/connect-url] no redirectURI in success response', res?.data);
      return NextResponse.json(
        { error: 'Could not open the connection portal.', code: 'portal_unavailable' },
        { status: 502 },
      );
    }
    return NextResponse.json({ redirectURI, sessionId: res.data.sessionId });
  } catch (err) {
    const info = readSnapTradeError(err);
    console.error('[snaptrade/connect-url] first attempt failed', { broker, ...info });

    if (info.status === 400 && broker) {
      try {
        const res = await tryLogin({ withBroker: false });
        const redirectURI = res?.data?.redirectURI;
        if (redirectURI) {
          console.warn(
            '[snaptrade/connect-url] slug rejected, succeeded without it. Update slug for:',
            broker,
          );
          return NextResponse.json({
            redirectURI,
            sessionId: res.data.sessionId,
            _note: 'broker_slug_unsupported_fell_back_to_picker',
          });
        }
      } catch (retryErr) {
        const retryInfo = readSnapTradeError(retryErr);
        console.error('[snaptrade/connect-url] retry without broker also failed', retryInfo);
        return NextResponse.json(
          {
            error: 'Could not open the connection portal.',
            code: 'portal_unavailable',
          },
          { status: 502 },
        );
      }
    }

    if (info.status === 429) {
      return NextResponse.json(
        {
          error: 'Too many requests right now. Please wait a moment and try again.',
          code: 'rate_limited',
        },
        { status: 429 },
      );
    }
    if (info.status === 401 || info.status === 403) {
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
