import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { getSnapTradeClient, ensureSnapTradeUser, readSnapTradeError } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/snaptrade/connect-url
 *
 * Strategy: try broker + requested connection type, then read-only fallbacks,
 * then SnapTrade's brokerage picker without a broker hint.
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
  const requestedConnectionType =
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

  const attempts = [];
  const tryLogin = async (opts) => {
    const params = {
      userId: creds.userId,
      userSecret: creds.userSecret,
      broker: opts.broker || undefined,
      immediateRedirect: false,
      customRedirect,
      connectionType: opts.connectionType,
    };
    try {
      const res = await snaptrade.authentication.loginSnapTradeUser(params);
      const redirectURI = res?.data?.redirectURI;
      if (redirectURI) {
        return { ok: true, redirectURI, sessionId: res.data.sessionId };
      }
      attempts.push({ ...opts, noRedirectURI: true });
      return { ok: false };
    } catch (err) {
      const info = readSnapTradeError(err);
      attempts.push({ ...opts, status: info.status, detail: info.detail });
      return { ok: false, info };
    }
  };

  const plan = [
    { broker, connectionType: requestedConnectionType },
    ...(requestedConnectionType !== 'read' ? [{ broker, connectionType: 'read' }] : []),
    { broker: undefined, connectionType: 'read' },
  ].filter((step) => step.broker !== undefined || step.connectionType);

  for (const step of plan) {
    const result = await tryLogin(step);
    if (result.ok) {
      const usedBroker = step.broker || null;
      const usedConn = step.connectionType;
      if (usedBroker !== broker || usedConn !== requestedConnectionType) {
        console.warn('[snaptrade/connect-url] fell back to', {
          requestedBroker: broker,
          requestedConnectionType,
          usedBroker,
          usedConnectionType: usedConn,
          attempts,
        });
      }
      return NextResponse.json({
        redirectURI: result.redirectURI,
        sessionId: result.sessionId,
        _usedBroker: usedBroker,
        _usedConnectionType: usedConn,
      });
    }
  }

  console.error('[snaptrade/connect-url] all attempts failed', { broker, attempts });

  const last = attempts[attempts.length - 1] || {};
  if (last.status === 429) {
    return NextResponse.json(
      {
        error: 'Too many requests right now. Please wait a moment and try again.',
        code: 'rate_limited',
      },
      { status: 429 },
    );
  }
  if (last.status === 401 || last.status === 403) {
    return NextResponse.json(
      { error: 'Authentication issue with our connection provider.', code: 'auth_failed' },
      { status: 502 },
    );
  }
  if (last.status === 400 && broker) {
    return NextResponse.json(
      {
        error: `${broker} isn't available right now. Please pick a different brokerage.`,
        code: 'broker_not_supported',
        detail: last.detail || undefined,
      },
      { status: 400 },
    );
  }
  return NextResponse.json(
    {
      error: 'Could not open the connection portal.',
      code: 'portal_unavailable',
      detail: last.detail || undefined,
    },
    { status: 502 },
  );
}
