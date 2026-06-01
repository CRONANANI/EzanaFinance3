import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { getSnapTradeClient, ensureSnapTradeUser, readSnapTradeError } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Decide the optimal connection type for a given broker based on its
 * SnapTrade-side capability flags.
 */
function pickConnectionType({ allowsTrading, brokerageType }) {
  if (allowsTrading === false) return 'read';
  const t = String(brokerageType || '').toLowerCase();
  if (t.includes('crypto') || t.includes('exchange')) return 'read';
  return 'trade-if-available';
}

/**
 * Generate the attempt plan for a given broker. Each entry is a
 * { broker, connectionType } pair tried in order until one succeeds.
 */
function buildPlan(broker, optimal) {
  const candidates = [
    { broker, connectionType: optimal },
    ...(optimal === 'trade-if-available' ? [{ broker, connectionType: 'trade' }] : []),
    ...(optimal !== 'read' ? [{ broker, connectionType: 'read' }] : []),
    { broker: undefined, connectionType: 'read' },
  ];
  const seen = new Set();
  return candidates.filter((c) => {
    const key = `${c.broker ?? ''}|${c.connectionType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * POST /api/snaptrade/connect-url
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
  const broker = body.broker || undefined;
  const allowsTrading = body.allowsTrading;
  const brokerageType = body.brokerageType;
  const overrideConnectionType =
    body.connectionType === 'trade'
      ? 'trade'
      : body.connectionType === 'read'
        ? 'read'
        : body.connectionType === 'trade-if-available'
          ? 'trade-if-available'
          : undefined;
  const optimal = overrideConnectionType ?? pickConnectionType({ allowsTrading, brokerageType });

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
      {
        error: 'Could not initialize your secure connection.',
        code: 'init_failed',
        detail: info.detail || err?.message || 'Unknown SnapTrade init failure',
      },
      { status: 502 },
    );
  }

  let snaptrade;
  try {
    snaptrade = getSnapTradeClient();
  } catch (err) {
    console.error('[snaptrade/connect-url] client init failed', err?.message);
    return NextResponse.json(
      {
        error:
          'Brokerage connections are not configured. Contact support and reference: SNAPTRADE_CREDS_MISSING.',
        code: 'snaptrade_not_configured',
        detail: err?.message || 'SnapTrade credentials missing in environment',
      },
      { status: 503 },
    );
  }
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
      const networkMessage =
        !info.status && err?.message
          ? `${err.code || 'NETWORK'}: ${err.message}${err.cause?.message ? ` (${err.cause.message})` : ''}`
          : null;
      attempts.push({
        ...opts,
        status: info.status,
        detail: info.detail || networkMessage,
        rawCode: err?.code,
        rawMessage: err?.message,
      });
      return {
        ok: false,
        hardStop: info.status === 401 || info.status === 403 || info.status === 429,
        info,
      };
    }
  };

  const plan = buildPlan(broker, optimal);

  for (const step of plan) {
    const result = await tryLogin(step);
    if (result.ok) {
      const usedBroker = step.broker || null;
      const usedConn = step.connectionType;
      if (usedBroker !== broker || usedConn !== optimal) {
        console.warn('[snaptrade/connect-url] fell back to', {
          requestedBroker: broker,
          optimalConnectionType: optimal,
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
        _pivoted: usedBroker !== broker || usedConn !== optimal,
      });
    }
    if (result.hardStop) break;
  }

  console.error('[snaptrade/connect-url] all attempts failed', {
    broker,
    optimal,
    attempts,
  });

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
      {
        error: 'Authentication issue with our connection provider.',
        code: 'auth_failed',
        detail:
          last.detail ||
          'SnapTrade rejected the request — check SNAPTRADE_CONSUMER_KEY or IP allowlist',
      },
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

  if (!last.status) {
    const networkDetail =
      last.detail ||
      (attempts[0] && (attempts[0].detail || attempts[0].message)) ||
      'No response from SnapTrade. Check that the production server can reach api.snaptrade.com and that any IP allowlist permits it.';
    return NextResponse.json(
      {
        error: 'Could not reach our connection provider.',
        code: 'network_unreachable',
        detail: networkDetail,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      error: 'Could not open the connection portal.',
      code: 'portal_unavailable',
      detail: last.detail || `SnapTrade returned ${last.status} with no message`,
      _attempts: attempts.length,
    },
    { status: 502 },
  );
}
